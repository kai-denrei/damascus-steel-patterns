import { useRef, useEffect, useState } from 'react';
import { renderDamascus } from '../engine/render.js';
import Slider from './Slider.jsx';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

// Shared: render damascus texture to offscreen canvas
function makeTexture(recipe, size) {
  const tex = document.createElement('canvas');
  tex.width = size;
  tex.height = Math.round(size * 0.4);
  renderDamascus(tex, { ...recipe, resolution: 1 });
  return tex;
}

// Shared: apply metallic shading inside a clip
function applyMetallicShading(ctx, W, H, angleRad) {
  const sin = Math.sin(angleRad), cos = Math.cos(angleRad);
  const cx = W / 2, cy = H / 2;
  const gx = -sin, gy = cos; // perpendicular to blade

  // Spine-to-edge gradient
  const sg = ctx.createLinearGradient(
    cx + gx * H * 0.4, cy + gy * H * 0.4,
    cx - gx * H * 0.4, cy - gy * H * 0.4
  );
  sg.addColorStop(0, 'rgba(255,255,255,0.12)');
  sg.addColorStop(0.2, 'rgba(255,255,255,0.06)');
  sg.addColorStop(0.5, 'rgba(0,0,0,0)');
  sg.addColorStop(0.8, 'rgba(0,0,0,0.15)');
  sg.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);

  // Specular band
  const sp = ctx.createLinearGradient(
    cx + gx * H * 0.3, cy + gy * H * 0.3,
    cx + gx * H * 0.1, cy + gy * H * 0.1
  );
  sp.addColorStop(0, 'rgba(255,255,255,0)');
  sp.addColorStop(0.4, 'rgba(255,255,255,0.07)');
  sp.addColorStop(0.5, 'rgba(255,255,255,0.11)');
  sp.addColorStop(0.6, 'rgba(255,255,255,0.07)');
  sp.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = sp;
  ctx.fillRect(0, 0, W, H);

  // Length-wise variation
  const lg = ctx.createLinearGradient(
    cx - cos * W * 0.5, cy - sin * W * 0.5,
    cx + cos * W * 0.5, cy + sin * W * 0.5
  );
  lg.addColorStop(0, 'rgba(0,0,0,0.08)');
  lg.addColorStop(0.3, 'rgba(0,0,0,0)');
  lg.addColorStop(0.7, 'rgba(255,255,255,0.02)');
  lg.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
}

// Generate blade polyline points: spine and belly
function generateBladeGeometry(W, H, opts = {}) {
  const {
    bladeLen = W * 1.15,
    heelWidth = H * 0.55,
    tipWidth = 2,
    spineBaseY = H * 0.18,
    spineTipDrop = H * 0.08,
    bellyCurve = 0.3,
    numPts = 60,
  } = opts;

  const spine = [], belly = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const x = -bladeLen * 0.1 + t * bladeLen;
    const width = heelWidth * (1 - t * t * 0.95) + tipWidth * t * t;
    const spineY = spineBaseY + t * t * spineTipDrop;
    const bellyC = Math.sin(t * Math.PI * 0.65) * heelWidth * bellyCurve;
    const bellyY = spineY + width + bellyC * (1 - t);
    spine.push([x, spineY]);
    belly.push([x, bellyY]);
  }
  return { spine, belly };
}

function rotatePoints(pts, cx, cy, angleRad) {
  const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
  return pts.map(([x, y]) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]);
}

function buildBladePath(spine, belly) {
  const p = new Path2D();
  p.moveTo(spine[0][0], spine[0][1]);
  for (let i = 1; i < spine.length; i++) p.lineTo(spine[i][0], spine[i][1]);
  for (let i = belly.length - 1; i >= 0; i--) p.lineTo(belly[i][0], belly[i][1]);
  p.closePath();
  return p;
}

function drawEdgeHighlights(ctx, spine, belly) {
  ctx.beginPath();
  belly.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = 'rgba(220,220,230,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(240,240,245,0.15)';
  ctx.lineWidth = 0.7;
  ctx.stroke();

  ctx.beginPath();
  spine.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = 'rgba(180,180,190,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ═══════════════════════════════════════════
// VIEW 1: Chef Knife Closeup (existing)
// ═══════════════════════════════════════════
function renderCloseup(canvas, recipe, textureScale, bladeAngle) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  const tex = makeTexture(recipe, Math.max(64, textureScale * 2));
  const angleRad = bladeAngle * Math.PI / 180;
  const { spine, belly } = generateBladeGeometry(W, H);

  const cx = W / 2, cy = H / 2;
  const rSpine = rotatePoints(spine, cx, cy, angleRad);
  const rBelly = rotatePoints(belly, cx, cy, angleRad);
  const bladePath = buildBladePath(rSpine, rBelly);

  ctx.save();
  ctx.clip(bladePath);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = ctx.createPattern(tex, 'repeat');
  ctx.fillRect(-W, -H, W * 3, H * 3);
  ctx.restore();
  applyMetallicShading(ctx, W, H, angleRad);
  ctx.restore();

  drawEdgeHighlights(ctx, rSpine, rBelly);
}

// ═══════════════════════════════════════════
// VIEW 2: Tip Closeup
// ═══════════════════════════════════════════
function renderTip(canvas, recipe, textureScale) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  const tex = makeTexture(recipe, Math.max(64, textureScale * 2));

  // Zoomed-in tip: large blade entering from left, tip at center-right
  const numPts = 80;
  const spine = [], belly = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const x = -W * 0.3 + t * W * 1.2;
    // Tip geometry: spine drops toward belly, belly curves up to meet
    const spineY = H * 0.2 + t * t * t * H * 0.35;
    const bellyY = H * 0.8 - t * t * H * 0.25;
    // Converge at tip
    if (bellyY < spineY + 2) {
      spine.push([x, (spineY + bellyY) / 2]);
      belly.push([x, (spineY + bellyY) / 2]);
    } else {
      spine.push([x, spineY]);
      belly.push([x, bellyY]);
    }
  }

  const bladePath = buildBladePath(spine, belly);

  ctx.save();
  ctx.clip(bladePath);
  ctx.fillStyle = ctx.createPattern(tex, 'repeat');
  ctx.fillRect(0, 0, W, H);
  applyMetallicShading(ctx, W, H, 0);
  ctx.restore();

  drawEdgeHighlights(ctx, spine, belly);

  // "POINT" label near tip
  const tipX = spine[spine.length - 1][0];
  const tipY = spine[spine.length - 1][1];
  ctx.fillStyle = C.amber;
  ctx.font = '10px monospace';
  ctx.fillText('\u2190 point', Math.min(tipX + 8, W - 60), tipY - 4);
}

// ═══════════════════════════════════════════
// VIEW 3: Anatomy Diagram
// ═══════════════════════════════════════════
function renderAnatomy(canvas, recipe, textureScale) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  const tex = makeTexture(recipe, Math.max(64, textureScale * 2));

  // Full knife horizontal: blade left, handle right
  const bladeW = W * 0.62;
  const handleW = W * 0.22;
  const guardW = W * 0.03;
  const bladeH = H * 0.32;
  const bladeY = H * 0.32;

  // Blade outline
  const numPts = 50;
  const spine = [], belly = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const x = W * 0.04 + t * bladeW;
    const width = bladeH * (1 - t * t * 0.7);
    const spineY = bladeY + t * t * bladeH * 0.15;
    const bellyCurve = Math.sin(t * Math.PI * 0.6) * bladeH * 0.25;
    const bellyY = spineY + width + bellyCurve * (1 - t);
    spine.push([x, spineY]);
    belly.push([x, bellyY]);
  }

  const bladePath = buildBladePath(spine, belly);

  // Draw blade with texture
  ctx.save();
  ctx.clip(bladePath);
  ctx.fillStyle = ctx.createPattern(tex, 'repeat');
  ctx.fillRect(0, 0, W, H);
  applyMetallicShading(ctx, W, H, 0);
  ctx.restore();
  drawEdgeHighlights(ctx, spine, belly);

  // Guard
  const guardX = spine[spine.length - 1][0];
  const guardTop = bladeY - bladeH * 0.1;
  const guardBot = bladeY + bladeH * 1.3;
  ctx.fillStyle = '#8a7a40';
  ctx.fillRect(guardX, guardTop, guardW, guardBot - guardTop);
  ctx.strokeStyle = '#6a5a30';
  ctx.lineWidth = 1;
  ctx.strokeRect(guardX, guardTop, guardW, guardBot - guardTop);

  // Handle
  const handleX = guardX + guardW;
  const handleTop = bladeY + bladeH * 0.05;
  const handleBot = bladeY + bladeH * 0.95;
  const handlePath = new Path2D();
  handlePath.moveTo(handleX, handleTop);
  handlePath.lineTo(handleX + handleW * 0.95, handleTop + (handleBot - handleTop) * 0.1);
  handlePath.quadraticCurveTo(handleX + handleW, handleTop + (handleBot - handleTop) * 0.5, handleX + handleW * 0.95, handleBot - (handleBot - handleTop) * 0.1);
  handlePath.lineTo(handleX, handleBot);
  handlePath.closePath();

  // Handle texture (crosshatch)
  ctx.fillStyle = '#1a1a1a';
  ctx.fill(handlePath);
  ctx.save();
  ctx.clip(handlePath);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  for (let i = -40; i < 80; i++) {
    ctx.beginPath();
    ctx.moveTo(handleX + i * 6, handleTop - 10);
    ctx.lineTo(handleX + i * 6 + 40, handleBot + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(handleX + i * 6, handleBot + 10);
    ctx.lineTo(handleX + i * 6 + 40, handleTop - 10);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke(handlePath);

  // Pins
  const pinY = (handleTop + handleBot) / 2;
  for (const px of [0.25, 0.6]) {
    ctx.beginPath();
    ctx.arc(handleX + handleW * px, pinY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#8a7a40';
    ctx.fill();
    ctx.strokeStyle = '#6a5a30';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Pommel
  const pommelX = handleX + handleW;
  ctx.fillStyle = '#8a7a40';
  ctx.beginPath();
  ctx.ellipse(pommelX + 4, (handleTop + handleBot) / 2, 5, (handleBot - handleTop) * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6a5a30';
  ctx.stroke();

  // ─── Labels ───
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  const label = (text, x, y, anchorX, anchorY) => {
    ctx.fillStyle = C.amber;
    ctx.fillText(text, x, y);
    // Leader line
    if (anchorX !== undefined) {
      ctx.beginPath();
      ctx.moveTo(x, y + 3);
      ctx.lineTo(anchorX, anchorY);
      ctx.strokeStyle = 'rgba(200,160,64,0.25)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  };

  const tipPt = spine[0]; // leftmost = point/tip
  const heelPt = spine[spine.length - 1];
  const midSpine = spine[Math.floor(spine.length * 0.4)];
  const midBelly = belly[Math.floor(belly.length * 0.4)];
  const choilPt = belly[belly.length - 1];

  // Top row labels
  label('POINT', tipPt[0] + 10, bladeY - bladeH * 0.35, tipPt[0], tipPt[1]);
  label('SPINE', midSpine[0], bladeY - bladeH * 0.35, midSpine[0], midSpine[1]);
  label('HEEL', heelPt[0] - 15, bladeY - bladeH * 0.35, heelPt[0], heelPt[1]);
  label('GUARD', guardX + guardW / 2, bladeY - bladeH * 0.5, guardX + guardW / 2, guardTop);
  label('HANDLE', handleX + handleW * 0.5, bladeY - bladeH * 0.35);
  label('POMMEL', pommelX + 4, bladeY - bladeH * 0.5, pommelX + 4, (handleTop + handleBot) / 2 - 15);

  // Bottom row labels
  label('BELLY', tipPt[0] + bladeW * 0.2, bladeY + bladeH * 1.6, midBelly[0] - 30, midBelly[1]);
  label('EDGE', midBelly[0], bladeY + bladeH * 1.6, midBelly[0], midBelly[1]);
  label('CHEEK', midSpine[0] + 30, (midSpine[1] + midBelly[1]) / 2);
  label('CHOIL', choilPt[0], bladeY + bladeH * 1.6, choilPt[0], choilPt[1]);
  label('RICASSO', guardX - 15, bladeY + bladeH * 1.6, guardX - 5, heelPt[1] + bladeH * 0.5);
  label('PINS', handleX + handleW * 0.25, bladeY + bladeH * 1.6, handleX + handleW * 0.25, pinY + 5);
}

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════

const VIEWS = [
  { id: 'closeup', label: 'CLOSEUP' },
  { id: 'tip', label: 'TIP' },
  { id: 'anatomy', label: 'ANATOMY' },
];

export default function SwordPreview({ recipe }) {
  const canvasRef = useRef(null);
  const [view, setView] = useState('closeup');
  const [textureScale, setTextureScale] = useState(120);
  const [bladeAngle, setBladeAngle] = useState(8);

  useEffect(() => {
    if (!canvasRef.current) return;
    const tid = setTimeout(() => {
      const c = canvasRef.current;
      if (view === 'closeup') renderCloseup(c, recipe, textureScale, bladeAngle);
      else if (view === 'tip') renderTip(c, recipe, textureScale);
      else if (view === 'anatomy') renderAnatomy(c, recipe, textureScale);
    }, 120);
    return () => clearTimeout(tid);
  }, [recipe, textureScale, bladeAngle, view]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* View selector */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              padding: '5px 14px',
              fontSize: 10,
              letterSpacing: '0.12em',
              fontFamily: 'monospace',
              background: 'transparent',
              border: 'none',
              borderBottom: view === v.id ? `2px solid ${C.amber}` : '2px solid transparent',
              color: view === v.id ? C.amber : C.dim,
              cursor: 'pointer',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 24, maxWidth: 600 }}>
        <div style={{ flex: 1 }}>
          <Slider
            label="texture scale"
            value={textureScale}
            onChange={setTextureScale}
            min={30}
            max={300}
            step={5}
            tooltip="Pattern grain size on the blade."
          />
        </div>
        {view === 'closeup' && (
          <div style={{ flex: 1 }}>
            <Slider
              label="angle"
              value={bladeAngle}
              onChange={setBladeAngle}
              min={-15}
              max={20}
              step={1}
              fmt={v => `${v}\u00B0`}
              tooltip="Blade viewing angle."
            />
          </div>
        )}
      </div>

      {/* Canvas */}
      <div style={{ border: `1px solid ${C.border}`, background: '#0a0a0a' }}>
        <canvas
          ref={canvasRef}
          width={1280}
          height={view === 'anatomy' ? 520 : 480}
          style={{ width: '100%', display: 'block' }}
        />
      </div>
    </div>
  );
}

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

// Render texture at full blade canvas size — no tiling, no seams.
// textureScale controls the billet-to-pixel ratio (zoom level).
function makeFullTexture(recipe, canvasW, canvasH, textureScale) {
  const tex = document.createElement('canvas');
  // Scale factor: textureScale maps how many pixels per "billet unit"
  // Larger textureScale = larger pattern features = fewer layers visible
  const scaleFactor = textureScale / 100;
  tex.width = Math.round(canvasW / scaleFactor);
  tex.height = Math.round(canvasH / scaleFactor);
  renderDamascus(tex, { ...recipe, resolution: 1 });
  return tex;
}

function applyMetallicShading(ctx, W, H, angleRad) {
  const sin = Math.sin(angleRad), cos = Math.cos(angleRad);
  const cx = W / 2, cy = H / 2;
  const gx = -sin, gy = cos;

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

function generateBladeGeometry(W, H, opts = {}) {
  const {
    bladeLen = W * 1.15, heelWidth = H * 0.55, tipWidth = 2,
    spineBaseY = H * 0.18, spineTipDrop = H * 0.08,
    bellyCurve = 0.3, numPts = 60,
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
// VIEW 1: Closeup
// ═══════════════════════════════════════════
function renderCloseup(canvas, recipe, textureScale, bladeAngle) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  const tex = makeFullTexture(recipe, W * 2, H * 2, textureScale);
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
  ctx.drawImage(tex, -W * 0.5, -H * 0.5, W * 2, H * 2);
  ctx.restore();
  applyMetallicShading(ctx, W, H, angleRad);
  ctx.restore();
  drawEdgeHighlights(ctx, rSpine, rBelly);
}

// ═══════════════════════════════════════════
// VIEW 2: Tip — blade enters from left, curves DOWN, tip at right
// ═══════════════════════════════════════════
function renderTip(canvas, recipe, textureScale) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  const tex = makeFullTexture(recipe, W, H, textureScale);

  // Spine on top (flatter), belly curves down, both converge at tip (right)
  const numPts = 80;
  const spine = [], belly = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const x = -W * 0.3 + t * W * 1.2;

    // Spine: nearly straight, slight downward slope toward tip
    const spineY = H * 0.25 + t * t * H * 0.2;

    // Belly: curves DOWN from the spine, then comes back up to meet at tip
    const bellyDrop = Math.sin(t * Math.PI * 0.55) * H * 0.4;
    const bellyY = spineY + (H * 0.45 - t * t * H * 0.35) * (1 - t * 0.3) + bellyDrop * (1 - t);

    if (bellyY < spineY + 2) {
      const mid = (spineY + bellyY) / 2;
      spine.push([x, mid]);
      belly.push([x, mid]);
    } else {
      spine.push([x, spineY]);
      belly.push([x, bellyY]);
    }
  }

  const bladePath = buildBladePath(spine, belly);

  ctx.save();
  ctx.clip(bladePath);
  ctx.drawImage(tex, 0, 0, W, H);
  applyMetallicShading(ctx, W, H, 0);
  ctx.restore();
  drawEdgeHighlights(ctx, spine, belly);
}

// ═══════════════════════════════════════════
// VIEW 3: Bevel — base top-left, tip bottom-right, maximum diagonal length
// ═══════════════════════════════════════════
function renderBevel(canvas, recipe, textureScale) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  const tex = makeFullTexture(recipe, W, H, textureScale);

  // Blade runs from top-left (heel/base) to bottom-right (tip)
  // Use the full diagonal for maximum length
  const numPts = 80;
  const spine = [], belly = [], bevelLine = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts; // 0 = heel (top-left), 1 = tip (bottom-right)
    const x = -W * 0.15 + t * W * 1.05;

    // Blade width: wide at heel, narrows to a point at tip
    const bladeWidth = H * 0.48 * (1 - t * t * 0.97);

    // Spine: slopes gently downward left-to-right
    const spineY = H * 0.15 + t * H * 0.28;

    // Belly: drops below spine by bladeWidth, with chef-knife curve
    const bellyCurve = Math.sin(t * Math.PI * 0.6) * H * 0.12 * (1 - t);
    let bellyY = spineY + bladeWidth + bellyCurve;

    if (bellyY < spineY + 2) {
      const mid = (spineY + bellyY) / 2;
      spine.push([x, mid]);
      belly.push([x, mid]);
      bevelLine.push([x, mid]);
    } else {
      spine.push([x, spineY]);
      belly.push([x, bellyY]);
      const bevelY = bellyY - (bellyY - spineY) * 0.28;
      bevelLine.push([x, bevelY]);
    }
  }

  const bladePath = buildBladePath(spine, belly);

  // Draw main blade with texture
  ctx.save();
  ctx.clip(bladePath);
  ctx.drawImage(tex, 0, 0, W, H);
  applyMetallicShading(ctx, W, H, 0);

  // Bevel zone: darken the area between bevel line and cutting edge
  const bevelPath = new Path2D();
  bevelPath.moveTo(bevelLine[0][0], bevelLine[0][1]);
  for (let i = 1; i < bevelLine.length; i++) bevelPath.lineTo(bevelLine[i][0], bevelLine[i][1]);
  for (let i = belly.length - 1; i >= 0; i--) bevelPath.lineTo(belly[i][0], belly[i][1]);
  bevelPath.closePath();

  // Darker bevel zone
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(140,140,150,1)';
  ctx.fill(bevelPath);
  ctx.globalCompositeOperation = 'source-over';

  // Subtle gradient within bevel: darker near edge, lighter near bevel line
  ctx.save();
  ctx.clip(bevelPath);
  const bevelGrad = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.85);
  bevelGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
  bevelGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
  bevelGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = bevelGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.restore(); // end main clip

  // Draw bevel line
  ctx.beginPath();
  bevelLine.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = 'rgba(200,200,210,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Subtle plunge line (where bevel starts near heel)
  const plungeIdx = Math.floor(numPts * 0.82);
  if (plungeIdx < bevelLine.length && plungeIdx < belly.length) {
    ctx.beginPath();
    ctx.moveTo(bevelLine[plungeIdx][0], bevelLine[plungeIdx][1]);
    ctx.lineTo(belly[plungeIdx][0], belly[plungeIdx][1]);
    ctx.strokeStyle = 'rgba(200,200,210,0.15)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  drawEdgeHighlights(ctx, spine, belly);
}

// ═══════════════════════════════════════════
// VIEW 4: Anatomy — full knife, point LEFT, pommel RIGHT
// ═══════════════════════════════════════════
function renderAnatomy(canvas, recipe, textureScale) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  const tex = makeFullTexture(recipe, W, H, textureScale);

  // Full knife: point at LEFT, handle at RIGHT
  // Blade tapers from thick (right/heel) to thin (left/point)
  const bladeStartX = W * 0.04;
  const bladeEndX = W * 0.62;
  const bladeLen = bladeEndX - bladeStartX;
  const maxBladeH = H * 0.3;
  const bladeBaseY = H * 0.35;

  const numPts = 60;
  const spine = [], belly = [], bevelLine = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts; // 0 = point (left), 1 = heel (right)
    const x = bladeStartX + t * bladeLen;

    // Width: thin at point, thick at heel
    const width = maxBladeH * (0.05 + t * 0.95);

    // Spine: fairly flat
    const spineY = bladeBaseY - width * 0.35;

    // Belly: curves down, especially in the middle
    const bellyCurve = Math.sin(t * Math.PI * 0.7) * maxBladeH * 0.15 * t;
    const bellyY = bladeBaseY + width * 0.65 + bellyCurve;

    spine.push([x, spineY]);
    belly.push([x, bellyY]);

    // Bevel line
    const bevelY = bellyY - (bellyY - spineY) * 0.25;
    bevelLine.push([x, bevelY]);
  }

  const bladePath = buildBladePath(spine, belly);

  // Draw blade with texture
  ctx.save();
  ctx.clip(bladePath);
  ctx.drawImage(tex, 0, 0, W, H);
  applyMetallicShading(ctx, W, H, 0);

  // Bevel zone
  const bevelPath = new Path2D();
  bevelPath.moveTo(bevelLine[0][0], bevelLine[0][1]);
  for (let i = 1; i < bevelLine.length; i++) bevelPath.lineTo(bevelLine[i][0], bevelLine[i][1]);
  for (let i = belly.length - 1; i >= 0; i--) bevelPath.lineTo(belly[i][0], belly[i][1]);
  bevelPath.closePath();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(150,150,155,1)';
  ctx.fill(bevelPath);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // Bevel line stroke
  ctx.beginPath();
  bevelLine.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = 'rgba(200,200,210,0.15)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  drawEdgeHighlights(ctx, spine, belly);

  // Guard
  const guardX = bladeEndX;
  const guardTop = spine[spine.length - 1][1] - maxBladeH * 0.15;
  const guardBot = belly[belly.length - 1][1] + maxBladeH * 0.15;
  ctx.fillStyle = '#8a7a40';
  ctx.fillRect(guardX, guardTop, W * 0.02, guardBot - guardTop);
  ctx.strokeStyle = '#6a5a30';
  ctx.lineWidth = 1;
  ctx.strokeRect(guardX, guardTop, W * 0.02, guardBot - guardTop);

  // Handle
  const handleX = guardX + W * 0.025;
  const handleW = W * 0.25;
  const handleMidY = (guardTop + guardBot) / 2;
  const handleHalfH = (guardBot - guardTop) * 0.4;

  const handlePath = new Path2D();
  handlePath.moveTo(handleX, handleMidY - handleHalfH);
  handlePath.quadraticCurveTo(handleX + handleW * 0.5, handleMidY - handleHalfH * 1.05, handleX + handleW, handleMidY - handleHalfH * 0.7);
  handlePath.quadraticCurveTo(handleX + handleW * 1.02, handleMidY, handleX + handleW, handleMidY + handleHalfH * 0.7);
  handlePath.quadraticCurveTo(handleX + handleW * 0.5, handleMidY + handleHalfH * 1.05, handleX, handleMidY + handleHalfH);
  handlePath.closePath();

  ctx.fillStyle = '#1a1a1a';
  ctx.fill(handlePath);
  ctx.save();
  ctx.clip(handlePath);
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.5;
  for (let i = -30; i < 60; i++) {
    ctx.beginPath();
    ctx.moveTo(handleX + i * 6, handleMidY - handleHalfH * 2);
    ctx.lineTo(handleX + i * 6 + 50, handleMidY + handleHalfH * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(handleX + i * 6 + 50, handleMidY - handleHalfH * 2);
    ctx.lineTo(handleX + i * 6, handleMidY + handleHalfH * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke(handlePath);

  // Pins
  for (const px of [0.25, 0.65]) {
    ctx.beginPath();
    ctx.arc(handleX + handleW * px, handleMidY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#8a7a40';
    ctx.fill();
    ctx.strokeStyle = '#6a5a30';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Pommel
  ctx.beginPath();
  ctx.ellipse(handleX + handleW + 5, handleMidY, 6, handleHalfH * 0.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#8a7a40';
  ctx.fill();
  ctx.strokeStyle = '#6a5a30';
  ctx.stroke();

  // Labels
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  const label = (text, lx, ly, ax, ay) => {
    ctx.fillStyle = C.amber;
    ctx.fillText(text, lx, ly);
    if (ax !== undefined) {
      ctx.beginPath();
      ctx.moveTo(lx, ly + 3);
      ctx.lineTo(ax, ay);
      ctx.strokeStyle = 'rgba(200,160,64,0.2)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  };

  const topY = H * 0.1;
  const botY = H * 0.88;

  // Top labels
  label('POINT', spine[0][0] + 20, topY, spine[0][0], spine[0][1]);
  label('SPINE / BACK', spine[Math.floor(numPts * 0.35)][0], topY, spine[Math.floor(numPts * 0.35)][0], spine[Math.floor(numPts * 0.35)][1]);
  label('HEEL', spine[numPts][0] - 10, topY, spine[numPts][0], spine[numPts][1]);
  label('GUARD', guardX + W * 0.01, topY, guardX + W * 0.01, guardTop);
  label('PINS', handleX + handleW * 0.45, topY, handleX + handleW * 0.45, handleMidY - 5);
  label('BUTT / POMMEL', handleX + handleW + 5, topY, handleX + handleW + 5, handleMidY - handleHalfH * 0.8);

  // Bottom labels
  label('BELLY', belly[Math.floor(numPts * 0.2)][0], botY, belly[Math.floor(numPts * 0.2)][0], belly[Math.floor(numPts * 0.2)][1]);
  label('EDGE', belly[Math.floor(numPts * 0.45)][0], botY, belly[Math.floor(numPts * 0.45)][0], belly[Math.floor(numPts * 0.45)][1]);
  label('BEVEL / GRIND', bevelLine[Math.floor(numPts * 0.55)][0], botY, bevelLine[Math.floor(numPts * 0.55)][0], bevelLine[Math.floor(numPts * 0.55)][1]);
  label('CHOIL', belly[numPts][0], botY, belly[numPts][0], belly[numPts][1]);
  label('RICASSO', guardX - 15, botY, guardX - 10, belly[numPts][1]);
  label('HANDLE', handleX + handleW * 0.5, botY);

  // Cheek label (inside blade)
  ctx.fillStyle = 'rgba(200,160,64,0.3)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  const cheekIdx = Math.floor(numPts * 0.5);
  ctx.fillText('CHEEK', spine[cheekIdx][0], (spine[cheekIdx][1] + bevelLine[cheekIdx][1]) / 2 + 4);
}

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════
const VIEWS = [
  { id: 'closeup', label: 'CLOSEUP' },
  { id: 'tip', label: 'TIP' },
  { id: 'bevel', label: 'BEVEL' },
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
      else if (view === 'bevel') renderBevel(c, recipe, textureScale);
      else if (view === 'anatomy') renderAnatomy(c, recipe, textureScale);
    }, 120);
    return () => clearTimeout(tid);
  }, [recipe, textureScale, bladeAngle, view]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              padding: '5px 14px', fontSize: 10, letterSpacing: '0.12em',
              fontFamily: 'monospace', background: 'transparent', border: 'none',
              borderBottom: view === v.id ? `2px solid ${C.amber}` : '2px solid transparent',
              color: view === v.id ? C.amber : C.dim, cursor: 'pointer',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, maxWidth: 600 }}>
        <div style={{ flex: 1 }}>
          <Slider label="texture scale" value={textureScale} onChange={setTextureScale}
            min={30} max={300} step={5} tooltip="Pattern grain size on the blade." />
        </div>
        {view === 'closeup' && (
          <div style={{ flex: 1 }}>
            <Slider label="angle" value={bladeAngle} onChange={setBladeAngle}
              min={-15} max={20} step={1} fmt={v => `${v}\u00B0`} tooltip="Blade viewing angle." />
          </div>
        )}
      </div>

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

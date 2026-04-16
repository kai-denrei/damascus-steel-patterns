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

// Chef knife blade — closeup view like the feather damascus reference photo.
// Blade runs diagonally from lower-left (heel) to upper-right (tip).
// Spine at top, cutting edge belly at bottom.
function renderChefKnifeBlade(canvas, recipe, textureScale, bladeAngle) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Dark background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  // Render damascus texture
  const texSize = Math.max(64, Math.round(textureScale * 2));
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texSize;
  texCanvas.height = Math.round(texSize * 0.4);
  renderDamascus(texCanvas, { ...recipe, resolution: 1 });

  // Blade geometry: a wide chef knife viewed as a closeup
  // The blade fills most of the canvas at a slight diagonal angle
  const angleRad = bladeAngle * Math.PI / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Define blade outline in local coords (0,0 = heel, extends right to tip)
  // Width of blade at heel: ~H*0.7, tapers to tip
  const bladeLen = W * 1.15; // extends beyond canvas for full coverage
  const heelWidth = H * 0.55;
  const tipWidth = 2;

  // Build blade polygon: spine (top), tip, belly (bottom), back to heel
  // Spine is nearly straight with very slight curve
  // Belly has the classic chef knife curve
  const numPts = 60;
  const spinePts = [];
  const bellyPts = [];

  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts; // 0 = heel, 1 = tip
    const x = -bladeLen * 0.1 + t * bladeLen;

    // Blade width tapers from heel to tip
    const width = heelWidth * (1 - t * t * 0.95) + tipWidth * t * t;

    // Spine: nearly flat with slight dip toward tip
    const spineY = H * 0.18 + t * t * H * 0.08;

    // Belly: gentle curve — the classic chef knife rocker
    const bellyCurve = Math.sin(t * Math.PI * 0.65) * heelWidth * 0.3;
    const bellyY = spineY + width + bellyCurve * (1 - t);

    spinePts.push([x, spineY]);
    bellyPts.push([x, bellyY]);
  }

  // Apply diagonal rotation around canvas center
  const cx = W * 0.5, cy = H * 0.5;
  const rotate = (x, y) => [
    cx + (x - cx) * cos - (y - cy) * sin,
    cy + (x - cx) * sin + (y - cy) * cos,
  ];

  const rotatedSpine = spinePts.map(([x, y]) => rotate(x, y));
  const rotatedBelly = bellyPts.map(([x, y]) => rotate(x, y));

  // Build Path2D for the blade
  const bladePath = new Path2D();
  bladePath.moveTo(rotatedSpine[0][0], rotatedSpine[0][1]);
  for (let i = 1; i < rotatedSpine.length; i++) {
    bladePath.lineTo(rotatedSpine[i][0], rotatedSpine[i][1]);
  }
  for (let i = rotatedBelly.length - 1; i >= 0; i--) {
    bladePath.lineTo(rotatedBelly[i][0], rotatedBelly[i][1]);
  }
  bladePath.closePath();

  // --- Draw blade with texture ---
  ctx.save();
  ctx.clip(bladePath);

  // Texture: tile the damascus pattern, rotated to follow blade angle
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  ctx.translate(-cx, -cy);
  const pat = ctx.createPattern(texCanvas, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  ctx.restore();

  // --- Metallic shading layers ---

  // 1. Spine-to-edge gradient: bright at spine, darker toward cutting edge
  // Compute gradient perpendicular to blade angle
  const gradNormX = -sin; // perpendicular to blade direction
  const gradNormY = cos;
  const spineGrad = ctx.createLinearGradient(
    cx + gradNormX * H * 0.4, cy + gradNormY * H * 0.4,
    cx - gradNormX * H * 0.4, cy - gradNormY * H * 0.4
  );
  spineGrad.addColorStop(0, 'rgba(255,255,255,0.12)'); // bright at spine
  spineGrad.addColorStop(0.2, 'rgba(255,255,255,0.06)');
  spineGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
  spineGrad.addColorStop(0.8, 'rgba(0,0,0,0.15)');
  spineGrad.addColorStop(1, 'rgba(0,0,0,0.08)'); // slightly brighter at edge (bevel)
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = spineGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Specular highlight band — diagonal band of light along the upper third
  const specGrad = ctx.createLinearGradient(
    cx + gradNormX * H * 0.3, cy + gradNormY * H * 0.3,
    cx + gradNormX * H * 0.1, cy + gradNormY * H * 0.1
  );
  specGrad.addColorStop(0, 'rgba(255,255,255,0)');
  specGrad.addColorStop(0.3, 'rgba(255,255,255,0.06)');
  specGrad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
  specGrad.addColorStop(0.7, 'rgba(255,255,255,0.06)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = specGrad;
  ctx.fillRect(0, 0, W, H);

  // 3. Length-wise gradient: slight variation along blade for 3D feel
  const lenGrad = ctx.createLinearGradient(
    cx - cos * W * 0.5, cy - sin * W * 0.5,
    cx + cos * W * 0.5, cy + sin * W * 0.5
  );
  lenGrad.addColorStop(0, 'rgba(0,0,0,0.1)'); // heel slightly darker
  lenGrad.addColorStop(0.3, 'rgba(0,0,0,0)');
  lenGrad.addColorStop(0.7, 'rgba(255,255,255,0.03)');
  lenGrad.addColorStop(1, 'rgba(0,0,0,0.05)'); // tip slightly darker
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = lenGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore(); // end clip

  // --- Edge bevel highlight ---
  // Thin bright line along the cutting edge (belly)
  ctx.beginPath();
  ctx.moveTo(rotatedBelly[0][0], rotatedBelly[0][1]);
  for (let i = 1; i < rotatedBelly.length; i++) {
    ctx.lineTo(rotatedBelly[i][0], rotatedBelly[i][1]);
  }
  ctx.strokeStyle = 'rgba(220,220,230,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Thinner brighter inner bevel
  ctx.strokeStyle = 'rgba(240,240,245,0.15)';
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // --- Spine edge ---
  ctx.beginPath();
  ctx.moveTo(rotatedSpine[0][0], rotatedSpine[0][1]);
  for (let i = 1; i < rotatedSpine.length; i++) {
    ctx.lineTo(rotatedSpine[i][0], rotatedSpine[i][1]);
  }
  ctx.strokeStyle = 'rgba(180,180,190,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export default function SwordPreview({ recipe }) {
  const canvasRef = useRef(null);
  const [textureScale, setTextureScale] = useState(120);
  const [bladeAngle, setBladeAngle] = useState(8);

  useEffect(() => {
    if (!canvasRef.current) return;
    const tid = setTimeout(() => {
      renderChefKnifeBlade(canvasRef.current, recipe, textureScale, bladeAngle);
    }, 120);
    return () => clearTimeout(tid);
  }, [recipe, textureScale, bladeAngle]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

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
        <div style={{ flex: 1 }}>
          <Slider
            label="angle"
            value={bladeAngle}
            onChange={setBladeAngle}
            min={-15}
            max={20}
            step={1}
            fmt={v => `${v}\u00B0`}
            tooltip="Blade viewing angle. Tilts the blade diagonal."
          />
        </div>
      </div>

      {/* Large blade canvas */}
      <div style={{
        border: `1px solid ${C.border}`,
        background: '#0a0a0a',
      }}>
        <canvas
          ref={canvasRef}
          width={1280}
          height={480}
          style={{ width: '100%', display: 'block' }}
        />
      </div>

      <div style={{
        textAlign: 'center',
        fontFamily: 'monospace',
        fontSize: 10,
        color: C.dim,
      }}>
        feather damascus chef knife &middot; closeup
      </div>
    </div>
  );
}

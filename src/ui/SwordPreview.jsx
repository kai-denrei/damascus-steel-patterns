import { useRef, useEffect, useState } from 'react';
import { renderDamascus } from '../engine/render.js';
import { BASE_WIDTH, BASE_HEIGHT } from '../recipe/schema.js';
import Slider from './Slider.jsx';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

const SWORDS = [
  {
    name: 'Longsword',
    vb: '0 0 100 100',
    outline: 'M 50 95 L 50 80 M 35 80 L 65 80 M 45 80 L 50 10 L 55 80 Z',
    blade: 'M 45 80 L 50 10 L 55 80 Z',
    desc: 'Straight, crossguard',
  },
  {
    name: 'Scimitar',
    vb: '0 0 100 100',
    outline: 'M 50 95 L 52 80 M 40 82 L 60 78 M 50 80 Q 75 60 45 10 Q 85 65 55 80 Z',
    blade: 'M 50 80 Q 75 60 45 10 Q 85 65 55 80 Z',
    desc: 'Curved, Middle Eastern',
  },
  {
    name: 'Broadsword',
    vb: '0 0 100 100',
    outline: 'M 50 95 L 50 75 M 30 65 L 50 75 L 70 65 M 40 75 L 42 10 L 58 10 L 60 75 Z',
    blade: 'M 40 75 L 42 10 L 58 10 L 60 75 Z',
    desc: 'Heavy, V-guard',
  },
  {
    name: 'Katana',
    vb: '0 0 100 100',
    outline: 'M 52 95 L 52 78 M 44 78 L 60 78 M 50 78 Q 58 50 46 8 Q 62 48 54 78 Z',
    blade: 'M 50 78 Q 58 50 46 8 Q 62 48 54 78 Z',
    desc: 'Single-edge, Japanese',
  },
  {
    name: 'Gladius',
    vb: '0 0 100 100',
    outline: 'M 50 95 L 50 80 M 40 80 L 60 80 M 43 80 L 42 25 L 50 10 L 58 25 L 57 80 Z',
    blade: 'M 43 80 L 42 25 L 50 10 L 58 25 L 57 80 Z',
    desc: 'Leaf-shaped, Roman',
  },
  {
    name: 'Chef Knife',
    vb: '0 0 100 100',
    outline: 'M 65 90 L 65 75 M 55 75 L 75 75 M 60 75 Q 55 50 50 35 Q 45 20 35 10 Q 70 25 72 50 Q 74 65 68 75 Z',
    blade: 'M 60 75 Q 55 50 50 35 Q 45 20 35 10 Q 70 25 72 50 Q 74 65 68 75 Z',
    desc: 'Curved belly, like the reference',
  },
];

// Render the blade with damascus texture + metallic shading
function renderBlade(canvas, recipe, sword, textureScale) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Render damascus texture to offscreen canvas at appropriate size
  const texW = Math.round(W * textureScale / 100);
  const texH = Math.round(H * textureScale / 100);
  const texCanvas = document.createElement('canvas');
  texCanvas.width = Math.max(64, texW);
  texCanvas.height = Math.max(32, texH);
  renderDamascus(texCanvas, { ...recipe, resolution: 1 });

  // Transform: rotate blade horizontal (tip right), scale to fill canvas
  const margin = 0.06;
  const scaleX = W * (1 - margin * 2) / 100;
  const scaleY = H * (1 - margin * 2) / 100;
  const scale = Math.min(scaleX, scaleY);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(scale, scale);
  ctx.translate(-50, -50);

  // Clip to blade shape
  const bladePath = new Path2D(sword.blade);
  ctx.save();
  ctx.clip(bladePath);

  // Draw tiled damascus texture within blade clip
  // Reset transform for texture drawing, then tile
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const pat = ctx.createPattern(texCanvas, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Metallic shading overlays (still inside blade clip)

  // Edge darkening — darken toward blade edges
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const edgeGrad = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.15, W * 0.5, H * 0.5, Math.max(W, H) * 0.55);
  edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(0.7, 'rgba(0,0,0,0.05)');
  edgeGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // Specular highlight — broad sweep along blade length
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const specGrad = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.5);
  specGrad.addColorStop(0, 'rgba(255,255,255,0)');
  specGrad.addColorStop(0.4, 'rgba(255,255,255,0.08)');
  specGrad.addColorStop(0.5, 'rgba(255,255,255,0.14)');
  specGrad.addColorStop(0.6, 'rgba(255,255,255,0.08)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = specGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // Subtle horizontal specular (light source from upper-left)
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const hSpecGrad = ctx.createLinearGradient(W * 0.1, 0, W * 0.6, 0);
  hSpecGrad.addColorStop(0, 'rgba(255,255,255,0)');
  hSpecGrad.addColorStop(0.3, 'rgba(255,255,255,0.04)');
  hSpecGrad.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  hSpecGrad.addColorStop(0.7, 'rgba(255,255,255,0.03)');
  hSpecGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = hSpecGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  ctx.restore(); // end blade clip

  // Blade edge highlight (thin bright line along cutting edge)
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = 'rgba(200,200,210,0.2)';
  ctx.lineWidth = 0.6;
  ctx.stroke(bladePath);
  ctx.globalCompositeOperation = 'source-over';

  // Full sword outline (handle, guard, blade)
  const outlinePath = new Path2D(sword.outline);
  ctx.strokeStyle = C.muted;
  ctx.lineWidth = 0.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(outlinePath);

  ctx.restore(); // end main transform
}

// Small selector card
function BladeCard({ sword, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${selected ? C.amber : C.border}`,
        background: selected ? '#111' : '#0d0d0d',
        cursor: 'pointer',
        padding: '8px 12px',
        textAlign: 'center',
        transition: 'border-color 0.15s',
      }}
    >
      <svg viewBox={sword.vb} style={{ width: 30, height: 45, display: 'block', margin: '0 auto 4px' }}>
        <path d={sword.outline} fill="none" stroke={selected ? C.amber : C.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ fontSize: 9, fontFamily: 'monospace', color: selected ? C.amber : C.dim }}>
        {sword.name}
      </div>
    </div>
  );
}

export default function SwordPreview({ recipe }) {
  const canvasRef = useRef(null);
  const [selected, setSelected] = useState('Chef Knife');
  const [textureScale, setTextureScale] = useState(50);
  const activeSword = SWORDS.find(s => s.name === selected) || SWORDS[0];

  useEffect(() => {
    if (!canvasRef.current) return;
    const tid = setTimeout(() => {
      renderBlade(canvasRef.current, recipe, activeSword, textureScale);
    }, 100);
    return () => clearTimeout(tid);
  }, [recipe, activeSword, textureScale]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Texture scale slider */}
      <div style={{ maxWidth: 300 }}>
        <Slider
          label="texture scale"
          value={textureScale}
          onChange={setTextureScale}
          min={10}
          max={150}
          step={5}
          tooltip="Pattern grain size on the blade. Smaller = finer detail, larger = bolder bands."
        />
      </div>

      {/* Large blade canvas */}
      <div style={{
        border: `1px solid ${C.border}`,
        background: '#050505',
        position: 'relative',
      }}>
        <canvas
          ref={canvasRef}
          width={960}
          height={320}
          style={{ width: '100%', display: 'block' }}
        />
      </div>

      {/* Blade info */}
      <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
        <span style={{ fontSize: 12, color: C.amber, letterSpacing: '0.15em' }}>
          {activeSword.name}
        </span>
        <span style={{ fontSize: 10, color: C.dim, marginLeft: 12 }}>
          {activeSword.desc}
        </span>
      </div>

      {/* Selector strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${SWORDS.length}, 1fr)`,
        gap: 6,
      }}>
        {SWORDS.map(sword => (
          <BladeCard
            key={sword.name}
            sword={sword}
            selected={selected === sword.name}
            onClick={() => setSelected(sword.name)}
          />
        ))}
      </div>
    </div>
  );
}

export { SWORDS };

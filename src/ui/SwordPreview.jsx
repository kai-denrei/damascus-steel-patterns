import { useRef, useEffect, useState } from 'react';
import { renderDamascus } from '../engine/render.js';
import { BASE_WIDTH, BASE_HEIGHT } from '../recipe/schema.js';

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
    viewBox: '0 0 100 100',
    path: 'M 50 95 L 50 80 M 35 80 L 65 80 M 45 80 L 50 10 L 55 80 Z',
    // Blade-only fill path (closed, for clipping)
    bladePath: 'M 45 80 L 50 10 L 55 80 Z',
    desc: 'Straight blade, crossguard, balanced',
  },
  {
    name: 'Scimitar',
    viewBox: '0 0 100 100',
    path: 'M 50 95 L 52 80 M 40 82 L 60 78 M 50 80 Q 75 60 45 10 Q 85 65 55 80 Z',
    bladePath: 'M 50 80 Q 75 60 45 10 Q 85 65 55 80 Z',
    desc: 'Curved blade, Middle Eastern',
  },
  {
    name: 'Broadsword',
    viewBox: '0 0 100 100',
    path: 'M 50 95 L 50 75 M 30 65 L 50 75 L 70 65 M 40 75 L 42 10 L 58 10 L 60 75 Z',
    bladePath: 'M 40 75 L 42 10 L 58 10 L 60 75 Z',
    desc: 'Heavy blade, V-guard, claymore style',
  },
  {
    name: 'Katana',
    viewBox: '0 0 100 100',
    path: 'M 52 95 L 52 78 M 44 78 L 60 78 M 50 78 Q 58 50 46 8 Q 62 48 54 78 Z',
    bladePath: 'M 50 78 Q 58 50 46 8 Q 62 48 54 78 Z',
    desc: 'Single-edge curve, Japanese',
  },
  {
    name: 'Gladius',
    viewBox: '0 0 100 100',
    path: 'M 50 95 L 50 80 M 40 80 L 60 80 M 43 80 L 42 25 L 50 10 L 58 25 L 57 80 Z',
    bladePath: 'M 43 80 L 42 25 L 50 10 L 58 25 L 57 80 Z',
    desc: 'Short, leaf-shaped, Roman',
  },
  {
    name: 'Dagger',
    viewBox: '0 0 100 100',
    path: 'M 50 95 L 50 72 M 38 72 L 62 72 M 44 72 L 50 15 L 56 72 Z',
    bladePath: 'M 44 72 L 50 15 L 56 72 Z',
    desc: 'Double-edge, compact',
  },
];

function SwordCard({ sword, recipe, selected, onSelect }) {
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);

  // Render a small damascus texture to use as fill
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 128;
    canvas.height = 128;
    // Render at 1x into a square for the pattern fill
    const squareRecipe = { ...recipe, resolution: 1 };
    renderDamascus(canvas, squareRecipe);
    setRendered(r => !r); // trigger re-render to update pattern
  }, [recipe]);

  const clipId = `blade-clip-${sword.name.replace(/\s/g, '-')}`;
  const patternId = `steel-pattern-${sword.name.replace(/\s/g, '-')}`;

  return (
    <div
      onClick={() => onSelect(sword.name)}
      style={{
        border: `1px solid ${selected ? C.amber : C.border}`,
        background: selected ? '#111' : '#0d0d0d',
        padding: 12,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Hidden canvas for texture generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <svg
        viewBox={sword.viewBox}
        style={{ width: 80, height: 120 }}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={sword.bladePath} />
          </clipPath>
          {canvasRef.current && (
            <pattern id={patternId} patternUnits="objectBoundingBox" width="1" height="1">
              <image
                href={canvasRef.current?.toDataURL() || ''}
                width="100"
                height="100"
                preserveAspectRatio="xMidYMid slice"
              />
            </pattern>
          )}
        </defs>
        {/* Blade filled with damascus pattern */}
        <path
          d={sword.bladePath}
          fill={canvasRef.current ? `url(#${patternId})` : '#333'}
          clipPath={`url(#${clipId})`}
        />
        {/* Full sword outline */}
        <path
          d={sword.path}
          fill="none"
          stroke={C.muted}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: selected ? C.amber : C.text, fontFamily: 'monospace' }}>
          {sword.name}
        </div>
        <div style={{ fontSize: 9, color: C.dim, fontFamily: 'monospace', marginTop: 2 }}>
          {sword.desc}
        </div>
      </div>
    </div>
  );
}

function SwordDetail({ sword, recipe }) {
  const canvasRef = useRef(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = BASE_WIDTH;
    canvas.height = BASE_HEIGHT;
    renderDamascus(canvas, { ...recipe, resolution: 1 });
    setKey(k => k + 1);
  }, [recipe]);

  const clipId = 'blade-clip-detail';
  const patternId = 'steel-pattern-detail';

  return (
    <div style={{
      border: `1px solid ${C.border}`,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
    }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <svg
        viewBox={sword.viewBox}
        style={{ width: 200, height: 300 }}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={sword.bladePath} />
          </clipPath>
          {canvasRef.current && (
            <pattern id={patternId} key={key} patternUnits="objectBoundingBox" width="1" height="1">
              <image
                href={canvasRef.current?.toDataURL() || ''}
                width="100"
                height="100"
                preserveAspectRatio="xMidYMid slice"
              />
            </pattern>
          )}
        </defs>
        {/* Blade with damascus fill */}
        <path
          d={sword.bladePath}
          fill={canvasRef.current ? `url(#${patternId})` : '#333'}
        />
        {/* Full sword wireframe */}
        <path
          d={sword.path}
          fill="none"
          stroke={C.muted}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Subtle edge highlight */}
        <path
          d={sword.bladePath}
          fill="none"
          stroke="rgba(200,160,64,0.15)"
          strokeWidth="0.5"
        />
      </svg>

      <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
        <div style={{ fontSize: 14, color: C.amber, letterSpacing: '0.15em' }}>
          {sword.name}
        </div>
        <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
          {sword.desc}
        </div>
      </div>
    </div>
  );
}

export default function SwordPreview({ recipe }) {
  const [selected, setSelected] = useState('Longsword');
  const activeSword = SWORDS.find(s => s.name === selected) || SWORDS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sword grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 8,
      }}>
        {SWORDS.map(sword => (
          <SwordCard
            key={sword.name}
            sword={sword}
            recipe={recipe}
            selected={selected === sword.name}
            onSelect={setSelected}
          />
        ))}
      </div>

      {/* Detail view */}
      <SwordDetail sword={activeSword} recipe={recipe} />
    </div>
  );
}

export { SWORDS };

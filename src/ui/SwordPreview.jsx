import { useRef, useEffect, useState, useMemo } from 'react';
import { renderDamascus } from '../engine/render.js';
import Slider from './Slider.jsx';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

// All swords defined vertically (tip up). We rotate -90° in the SVG to lay horizontal.
const SWORDS = [
  {
    name: 'Longsword',
    vb: '0 0 100 100',
    outline: 'M 50 95 L 50 80 M 35 80 L 65 80 M 45 80 L 50 10 L 55 80 Z',
    blade: 'M 45 80 L 50 10 L 55 80 Z',
    desc: 'Straight, crossguard, balanced',
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
    desc: 'Heavy, V-guard, claymore',
  },
  {
    name: 'Katana',
    vb: '0 0 100 100',
    outline: 'M 52 95 L 52 78 M 44 78 L 60 78 M 50 78 Q 58 50 46 8 Q 62 48 54 78 Z',
    blade: 'M 50 78 Q 58 50 46 8 Q 62 48 54 78 Z',
    desc: 'Single-edge curve, Japanese',
  },
  {
    name: 'Gladius',
    vb: '0 0 100 100',
    outline: 'M 50 95 L 50 80 M 40 80 L 60 80 M 43 80 L 42 25 L 50 10 L 58 25 L 57 80 Z',
    blade: 'M 43 80 L 42 25 L 50 10 L 58 25 L 57 80 Z',
    desc: 'Short, leaf-shaped, Roman',
  },
  {
    name: 'Dagger',
    vb: '0 0 100 100',
    outline: 'M 50 95 L 50 72 M 38 72 L 62 72 M 44 72 L 50 15 L 56 72 Z',
    blade: 'M 44 72 L 50 15 L 56 72 Z',
    desc: 'Double-edge, compact',
  },
];

// Render damascus texture to a hidden canvas, return dataURL
function useTextureDataURL(recipe, size) {
  const canvasRef = useRef(document.createElement('canvas'));
  const [dataURL, setDataURL] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = size;
    canvas.height = Math.round(size * 0.4); // 2.5:1 aspect like the main canvas
    renderDamascus(canvas, { ...recipe, resolution: 1 });
    setDataURL(canvas.toDataURL());
  }, [recipe, size]);

  return dataURL;
}

function HorizontalBlade({ sword, textureURL, textureScale, selected, onSelect, large }) {
  // Rotate the vertical sword -90° to lay horizontal (tip points right)
  // Original viewBox is 100x100. After -90° rotation around center (50,50),
  // we use a horizontal viewBox to frame it.
  const patternId = `pat-${sword.name.replace(/\s/g, '')}-${large ? 'lg' : 'sm'}`;

  // Pattern tile size in SVG user units — smaller = more repetitions = finer texture
  const tileSize = textureScale;

  const height = large ? 180 : 56;

  return (
    <div
      onClick={() => onSelect(sword.name)}
      style={{
        border: `1px solid ${selected && !large ? C.amber : C.border}`,
        background: large ? '#0a0a0a' : (selected ? '#111' : '#0d0d0d'),
        cursor: large ? 'default' : 'pointer',
        transition: 'border-color 0.15s',
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox="-5 20 110 60"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height, display: 'block' }}
      >
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={tileSize}
            height={tileSize * 0.4}
            patternTransform="rotate(-90 50 50)"
          >
            {textureURL && (
              <image
                href={textureURL}
                width={tileSize}
                height={tileSize * 0.4}
                preserveAspectRatio="none"
              />
            )}
          </pattern>
        </defs>
        <g transform="rotate(-90 50 50)">
          {/* Blade filled with tiled damascus texture */}
          <path
            d={sword.blade}
            fill={textureURL ? `url(#${patternId})` : '#333'}
          />
          {/* Full sword outline (handle, guard, blade edge) */}
          <path
            d={sword.outline}
            fill="none"
            stroke={large ? C.muted : C.dim}
            strokeWidth={large ? 0.8 : 1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Blade edge highlight */}
          <path
            d={sword.blade}
            fill="none"
            stroke="rgba(200,160,64,0.12)"
            strokeWidth="0.4"
          />
        </g>
        {/* Name label for small cards */}
        {!large && (
          <text
            x="100"
            y="75"
            textAnchor="end"
            style={{
              fontSize: 5,
              fill: selected ? C.amber : C.dim,
              fontFamily: 'monospace',
            }}
          >
            {sword.name}
          </text>
        )}
      </svg>
    </div>
  );
}

export default function SwordPreview({ recipe }) {
  const [selected, setSelected] = useState('Longsword');
  const [textureScale, setTextureScale] = useState(40);
  const activeSword = SWORDS.find(s => s.name === selected) || SWORDS[0];

  // Render texture once, share across all blades
  const textureURL = useTextureDataURL(recipe, 256);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Texture scale control */}
      <div style={{ maxWidth: 300 }}>
        <Slider
          label="texture scale"
          value={textureScale}
          onChange={setTextureScale}
          min={15}
          max={100}
          step={1}
          tooltip="Size of the damascus pattern on the blade. Smaller = finer grain, larger = bolder pattern."
        />
      </div>

      {/* Large detail blade — full width */}
      <HorizontalBlade
        sword={activeSword}
        textureURL={textureURL}
        textureScale={textureScale}
        selected={true}
        onSelect={() => {}}
        large={true}
      />

      {/* Label */}
      <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
        <span style={{ fontSize: 12, color: C.amber, letterSpacing: '0.15em' }}>
          {activeSword.name}
        </span>
        <span style={{ fontSize: 10, color: C.dim, marginLeft: 12 }}>
          {activeSword.desc}
        </span>
      </div>

      {/* Selector strip — all blades horizontal, smaller */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
      }}>
        {SWORDS.map(sword => (
          <HorizontalBlade
            key={sword.name}
            sword={sword}
            textureURL={textureURL}
            textureScale={textureScale}
            selected={selected === sword.name}
            onSelect={setSelected}
            large={false}
          />
        ))}
      </div>
    </div>
  );
}

export { SWORDS };

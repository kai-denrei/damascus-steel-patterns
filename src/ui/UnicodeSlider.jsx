import { useState } from 'react';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

const FILLED = '\u25AE';  // ▮
const EMPTY = '\u25AF';   // ▯

export default function UnicodeSlider({ label, value, onChange, min, max, step = 1, blocks = 12, tooltip, fmt }) {
  const [showTip, setShowTip] = useState(false);

  const range = max - min;
  const normalized = (value - min) / range; // 0–1
  const filledCount = Math.round(normalized * blocks);
  const percent = Math.round(normalized * 100);

  const handleClick = (blockIndex) => {
    const newNorm = (blockIndex + 0.5) / blocks;
    let newVal = min + newNorm * range;
    // Snap to step
    newVal = Math.round(newVal / step) * step;
    newVal = Math.max(min, Math.min(max, newVal));
    onChange(newVal);
  };

  const display = fmt ? fmt(value) : (Number.isInteger(step) ? value : value.toFixed(1));

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'monospace',
        fontSize: 11,
        gap: 8,
      }}>
        <span style={{ color: C.amber, minWidth: 80, fontSize: 10 }}>{label}</span>
        <span style={{ cursor: 'pointer', userSelect: 'none', letterSpacing: '1px', fontSize: 13 }}>
          {Array.from({ length: blocks }, (_, i) => (
            <span
              key={i}
              onClick={() => handleClick(i)}
              style={{
                color: i < filledCount ? C.amber : C.dim,
                cursor: 'pointer',
                transition: 'color 0.1s',
              }}
            >
              {i < filledCount ? FILLED : EMPTY}
            </span>
          ))}
        </span>
        <span style={{ color: C.text, minWidth: 48, textAlign: 'right', fontSize: 10 }}>
          {display}
        </span>
      </div>
      {tooltip && showTip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          background: '#1a1a1a',
          border: `1px solid ${C.border}`,
          padding: '5px 7px',
          fontSize: 9,
          color: C.muted,
          fontFamily: 'monospace',
          lineHeight: 1.4,
          zIndex: 10,
          pointerEvents: 'none',
          marginBottom: 3,
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

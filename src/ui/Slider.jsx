import { useState } from 'react';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  border: '#221e18',
};

export default function Slider({ label, value, onChange, min, max, step, fmt, tooltip }) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative' }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
        <span style={{ color: C.amber }}>{label}</span>
        <span style={{ color: C.text }}>{fmt ? fmt(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: C.amber, cursor: 'pointer', margin: 0 }}
      />
      {tooltip && showTip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          background: '#1a1a1a',
          border: `1px solid ${C.border}`,
          padding: '6px 8px',
          fontSize: 10,
          color: C.muted,
          fontFamily: 'monospace',
          lineHeight: 1.4,
          zIndex: 10,
          pointerEvents: 'none',
          marginBottom: 4,
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

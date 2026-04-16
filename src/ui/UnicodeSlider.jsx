import { useState, useRef, useCallback } from 'react';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

export default function UnicodeSlider({ label, value, onChange, min, max, step = 1, blocks = 16, tooltip, fmt }) {
  const [showTip, setShowTip] = useState(false);
  const trackRef = useRef(null);

  const range = max - min;
  const normalized = (value - min) / range;
  const filledCount = Math.round(normalized * blocks);

  // Click/drag handler using track position for precise control
  const updateFromEvent = useCallback((e) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let newVal = min + x * range;
    newVal = Math.round(newVal / step) * step;
    newVal = Math.max(min, Math.min(max, newVal));
    onChange(newVal);
  }, [min, max, range, step, onChange]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    updateFromEvent(e);
    const onMove = (ev) => updateFromEvent(ev);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [updateFromEvent]);

  const display = fmt ? fmt(value) : (Number.isInteger(step) ? value : value.toFixed(1));

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        fontFamily: 'monospace',
        fontSize: 11,
        gap: 10,
        height: 22,
      }}>
        <span style={{ color: C.amber, minWidth: 80, fontSize: 10 }}>{label}</span>

        {/* Track — continuous click/drag area */}
        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          style={{
            flex: 1,
            height: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          {/* Background bar */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 8,
            background: '#161616',
            borderRadius: 2,
            border: `1px solid ${C.border}`,
          }} />
          {/* Filled bar */}
          <div style={{
            position: 'absolute',
            left: 0,
            width: `${normalized * 100}%`,
            height: 8,
            background: C.amber,
            borderRadius: 2,
            transition: 'width 0.05s',
          }} />
          {/* Thumb */}
          <div style={{
            position: 'absolute',
            left: `calc(${normalized * 100}% - 5px)`,
            width: 10,
            height: 14,
            background: C.amber,
            borderRadius: 2,
            border: '1px solid #0b0b0b',
            transition: 'left 0.05s',
          }} />
        </div>

        <span style={{ color: C.text, minWidth: 40, textAlign: 'right', fontSize: 10 }}>
          {display}
        </span>
      </div>
      {tooltip && showTip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 80,
          right: 40,
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

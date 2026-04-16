import { useState, useRef, useCallback, useEffect } from 'react';
import { T, emberColor, SLIDER_GRADIENT } from './theme.js';

export default function UnicodeSlider({ label, value, onChange, min, max, step = 1, tooltip, fmt }) {
  const [showTip, setShowTip] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef(null);

  const range = max - min;
  const normalized = (value - min) / range;

  // Unified position → value update (works for both mouse and touch)
  const updateFromClientX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let newVal = min + x * range;
    newVal = Math.round(newVal / step) * step;
    newVal = Math.max(min, Math.min(max, newVal));
    onChange(newVal);
  }, [min, max, range, step, onChange]);

  // Mouse handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    updateFromClientX(e.clientX);
    const onMove = (ev) => updateFromClientX(ev.clientX);
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [updateFromClientX]);

  // Touch handlers — registered via ref to use { passive: false }
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      e.preventDefault(); // prevents scroll/zoom
      setDragging(true);
      if (e.touches.length > 0) updateFromClientX(e.touches[0].clientX);
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length > 0) updateFromClientX(e.touches[0].clientX);
    };
    const onTouchEnd = () => setDragging(false);

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [updateFromClientX]);

  const display = fmt ? fmt(value) : (Number.isInteger(step) ? value : value.toFixed(1));

  const thumbColor = emberColor(normalized);
  const valueColor = emberColor(Math.min(1, normalized * 1.2));
  const highGlow = normalized > 0.85;

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
        minHeight: 44, // Apple HIG minimum touch target
      }}>
        <span style={{
          color: dragging ? T.textPrim : T.emberLow,
          minWidth: 72,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderLeft: dragging ? `3px solid ${T.emberMid}` : '3px solid transparent',
          paddingLeft: 5,
          transition: 'border-color 0.3s, color 0.15s',
        }}>{label}</span>

        {/* Track — large touch target, thin visual track */}
        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          style={{
            flex: 1,
            height: 44, // full touch target height
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            userSelect: 'none',
            touchAction: 'none', // prevent scroll/zoom on this element
          }}
        >
          {/* Empty track */}
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            height: 3,
            background: T.trackEmpty,
            borderRadius: 1,
          }} />
          {/* Filled track with ember gradient */}
          <div style={{
            position: 'absolute',
            left: 0,
            width: `${normalized * 100}%`,
            height: 3,
            background: SLIDER_GRADIENT,
            backgroundSize: `${100 / Math.max(0.01, normalized)}% 100%`,
            borderRadius: 1,
            boxShadow: highGlow ? '0 0 8px 1px rgba(255,200,100,0.2)' : 'none',
            transition: dragging ? 'none' : 'width 0.05s',
          }} />
          {/* Thumb — larger on mobile for easier grabbing */}
          <div style={{
            position: 'absolute',
            left: `calc(${normalized * 100}% - 6px)`,
            width: 12,
            height: 24,
            background: thumbColor,
            borderRadius: 2,
            border: `1px solid rgba(0,0,0,0.3)`,
            boxShadow: highGlow
              ? `0 0 6px 2px rgba(255,230,180,0.4)`
              : '0 1px 3px rgba(0,0,0,0.3)',
            transition: dragging ? 'none' : 'left 0.05s',
          }} />
        </div>

        <span style={{
          color: valueColor,
          minWidth: 36,
          textAlign: 'right',
          fontSize: 10,
          transition: 'color 0.15s',
        }}>
          {display}
        </span>
      </div>
      {tooltip && showTip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 72, right: 36,
          background: T.bgPanel,
          border: `1px solid ${T.border}`,
          padding: '5px 7px',
          fontSize: 9,
          color: T.textDim,
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

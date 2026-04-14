import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { renderDamascus } from '../engine/render.js';

const C = {
  amber: '#c8a040',
  border: '#221e18',
};

const Canvas = forwardRef(function Canvas({ recipe, onRenderTime, onBusyChange }, ref) {
  const canvasRef = useRef(null);
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => canvasRef.current);

  useEffect(() => {
    setBusy(true);
    if (onBusyChange) onBusyChange(true);
    const tid = setTimeout(() => {
      if (!canvasRef.current) return;
      const elapsed = renderDamascus(canvasRef.current, recipe);
      if (onRenderTime) onRenderTime(elapsed);
      setBusy(false);
      if (onBusyChange) onBusyChange(false);
    }, 180);
    return () => clearTimeout(tid);
  }, [recipe]);

  return (
    <div style={{ position: 'relative', border: `1px solid ${C.border}` }}>
      <canvas
        ref={canvasRef}
        width={640}
        height={256}
        style={{ width: '100%', display: 'block' }}
      />
      {busy && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(11,11,11,0.65)',
          fontSize: 11,
          color: C.amber,
          letterSpacing: '0.25em',
          fontFamily: 'monospace',
        }}>
          FORGING\u2026
        </div>
      )}
    </div>
  );
});

export default Canvas;

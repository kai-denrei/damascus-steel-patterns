import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { renderDamascus } from '../engine/render.js';
import { BASE_WIDTH, BASE_HEIGHT } from '../recipe/schema.js';

const C = {
  amber: '#c8a040',
  border: '#221e18',
  dim: '#443c34',
};

const MAX_DISPLAY_WIDTH = 960;

const Canvas = forwardRef(function Canvas({ recipe, onRenderTime, onBusyChange }, ref) {
  const canvasRef = useRef(null);
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => canvasRef.current);

  const res = recipe.resolution || 1;
  const pixelW = BASE_WIDTH * res;
  const pixelH = BASE_HEIGHT * res;

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
    <div style={{
      position: 'relative',
      border: `1px solid ${C.border}`,
      maxWidth: MAX_DISPLAY_WIDTH,
      width: '100%',
    }}>
      <canvas
        ref={canvasRef}
        width={pixelW}
        height={pixelH}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          imageRendering: res >= 2 ? 'auto' : 'auto',
        }}
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
      <div style={{
        position: 'absolute',
        bottom: 4,
        right: 6,
        fontSize: 9,
        color: C.dim,
        fontFamily: 'monospace',
        pointerEvents: 'none',
      }}>
        {pixelW}&times;{pixelH}
      </div>
    </div>
  );
});

export default Canvas;

import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { renderDamascus } from '../engine/render.js';
import { renderDamascusVector } from '../engine/render-vector.js';
import { BASE_WIDTH, BASE_HEIGHT } from '../recipe/schema.js';

const C = {
  amber: '#c8a040',
  border: '#221e18',
  dim: '#443c34',
};

const MAX_DISPLAY_WIDTH = 960;

// Braille helix loader — two intertwined sine waves like damascus layers
// Ported from Braille Lab loaders (genHelix)
const BRAILLE_DOT_MAP = [[1, 8], [2, 16], [4, 32], [64, 128]];

function gridToBraille(grid) {
  const rows = grid.length, cols = grid[0].length;
  const charCount = Math.ceil(cols / 2);
  let result = '';
  for (let c = 0; c < charCount; c++) {
    let code = 0x2800;
    for (let r = 0; r < 4 && r < rows; r++) {
      for (let d = 0; d < 2; d++) {
        const col = c * 2 + d;
        if (col < cols && grid[r][col]) code |= BRAILLE_DOT_MAP[r][d];
      }
    }
    result += String.fromCodePoint(code);
  }
  return result;
}

function generateHelixFrames() {
  const W = 8, H = 4, totalFrames = 16, frames = [];
  for (let f = 0; f < totalFrames; f++) {
    const g = Array.from({ length: H }, () => Array(W).fill(false));
    for (let c = 0; c < W; c++) {
      const phase = (f + c) * (Math.PI / 4);
      const y1 = Math.round((Math.sin(phase) + 1) / 2 * (H - 1));
      const y2 = Math.round((Math.sin(phase + Math.PI) + 1) / 2 * (H - 1));
      g[y1][c] = true;
      g[y2][c] = true;
    }
    frames.push(gridToBraille(g));
  }
  return frames;
}

const HELIX_FRAMES = generateHelixFrames();

// Inject CSS animation keyframes once (compositor-thread animation survives JS blocking)
const STYLE_ID = 'braille-loader-css';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes braille-pulse {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.08); }
    }
    @keyframes braille-glow {
      0%, 100% { text-shadow: 0 0 4px rgba(200,160,64,0.2); }
      50% { text-shadow: 0 0 12px rgba(200,160,64,0.6); }
    }
    .braille-loader-text {
      animation: braille-pulse 0.8s ease-in-out infinite, braille-glow 0.8s ease-in-out infinite;
      will-change: opacity, transform;
    }
    .braille-loader-label {
      animation: braille-pulse 1.2s ease-in-out infinite;
      will-change: opacity;
    }
  `;
  document.head.appendChild(style);
}

function BrailleLoader() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const tid = setInterval(() => {
      setFrame(f => (f + 1) % HELIX_FRAMES.length);
    }, 50); // 20fps — fast enough to show movement in the debounce window
    return () => clearInterval(tid);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
    }}>
      <span
        className="braille-loader-text"
        style={{
          fontSize: 32,
          lineHeight: 1,
          letterSpacing: '0.08em',
          color: C.amber,
        }}
      >
        {HELIX_FRAMES[frame]}
      </span>
      <span
        className="braille-loader-label"
        style={{
          fontSize: 10,
          letterSpacing: '0.3em',
          color: C.amber,
        }}
      >
        FORGING
      </span>
    </div>
  );
}

const Canvas = forwardRef(function Canvas({ recipe, onRenderTime, onBusyChange }, ref) {
  const canvasRef = useRef(null);
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => canvasRef.current);

  const res = recipe.resolution || 1;
  const pixelW = BASE_WIDTH * res;
  const pixelH = BASE_HEIGHT * res;

  // Longer debounce at higher resolutions so the animation gets screen time
  const ssaaFactor = recipe.supersample ? 1.5 : 1;
  const debounce = Math.round((res >= 8 ? 600 : res >= 4 ? 400 : res >= 2 ? 250 : 180) * ssaaFactor);

  useEffect(() => {
    setBusy(true);
    if (onBusyChange) onBusyChange(true);
    const tid = setTimeout(() => {
      if (!canvasRef.current) return;
      const render = recipe.vectorMode ? renderDamascusVector : renderDamascus;
      const elapsed = render(canvasRef.current, recipe);
      if (onRenderTime) onRenderTime(elapsed);
      setBusy(false);
      if (onBusyChange) onBusyChange(false);
    }, debounce);
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
        }}
      />
      {busy && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(11,11,11,0.7)',
          fontFamily: 'monospace',
        }}>
          <BrailleLoader />
        </div>
      )}
      {!busy && (
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
      )}
    </div>
  );
});

export default Canvas;

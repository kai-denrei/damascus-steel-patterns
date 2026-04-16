import { useState, useRef, useEffect, useCallback } from 'react';
import { generateSVG, downloadSVG } from '../engine/export-svg.js';
import VectorControls, { DEFAULT_VECTOR_SETTINGS } from './VectorControls.jsx';

import { T, btnStyle } from './theme.js';

export default function SvgViewer({ recipe }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_VECTOR_SETTINGS);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [renderTime, setRenderTime] = useState(null);

  const generate = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      const t0 = performance.now();
      const svg = generateSVG(recipe, 1920, 768, settings);
      setRenderTime(((performance.now() - t0) / 1000).toFixed(1));
      setSvgContent(svg);
      setGenerating(false);
    }, 50);
  }, [recipe, settings]);

  // Regenerate when recipe or settings change
  useEffect(() => {
    generate();
  }, [generate]);

  const handleSaveSVG = useCallback(() => {
    downloadSVG(recipe, 1920, 768, settings);
  }, [recipe, settings]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.5, Math.min(20, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const svgDataUrl = svgContent
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`
    : '';

  const sizeKB = svgContent ? (new Blob([svgContent]).size / 1024).toFixed(0) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Vector settings */}
      <VectorControls settings={settings} onChange={setSettings} />

      {/* Status bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 10,
        fontFamily: 'monospace',
      }}>
        <div style={{ color: T.textDim }}>
          scroll to zoom &middot; drag to pan &middot; {zoom.toFixed(1)}x &middot; {sizeKB}KB{renderTime ? ` \u00B7 ${renderTime}s` : ''}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setSettings(s => ({ ...s, fixAnomalies: !s.fixAnomalies }))} style={btnStyle(settings.fixAnomalies)}>FIX</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={btnStyle()}>RESET VIEW</button>
          <button onClick={handleSaveSVG} style={btnStyle(true)}>SAVE SVG
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        style={{
          border: `1px solid ${T.border}`,
          overflow: 'hidden',
          cursor: dragging ? 'grabbing' : 'grab',
          height: 400,
          position: 'relative',
          background: '#050505',
        }}
      >
        {generating && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5,5,5,0.8)', zIndex: 2,
            color: T.emberLow, fontSize: 11, fontFamily: 'monospace',
            letterSpacing: '0.2em',
          }}>
            GENERATING SVG\u2026
          </div>
        )}
        {svgDataUrl && (
          <img
            src={svgDataUrl}
            alt="Damascus pattern SVG"
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              imageRendering: 'auto',
              userSelect: 'none',
            }}
          />
        )}
      </div>

      {zoom > 3 && (
        <div style={{
          fontSize: 9, color: T.textDim, fontFamily: 'monospace', textAlign: 'center',
        }}>
          vector curves stay smooth at any zoom
        </div>
      )}
    </div>
  );
}

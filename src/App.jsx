import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_RECIPE } from './recipe/schema.js';
import { applyPreset } from './recipe/presets.js';
import { encodeRecipeToHash, decodeRecipeFromHash } from './recipe/url.js';
import Canvas from './ui/Canvas.jsx';
import Header from './ui/Header.jsx';
import Controls from './ui/Controls.jsx';
import DeformationStack from './ui/DeformationStack.jsx';
import Gallery from './ui/Gallery.jsx';
import StatusBar from './ui/StatusBar.jsx';
import SwordPreview from './ui/SwordPreview.jsx';
import Explore from './ui/Explore.jsx';

const C = {
  amber: '#c8a040',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

const TAB_STYLE = (active) => ({
  padding: '6px 16px',
  fontSize: 10,
  letterSpacing: '0.15em',
  fontFamily: 'monospace',
  background: 'transparent',
  border: 'none',
  borderBottom: active ? `2px solid ${C.amber}` : '2px solid transparent',
  color: active ? C.amber : C.dim,
  cursor: 'pointer',
  transition: 'color 0.15s, border-color 0.15s',
});

export default function App() {
  const [recipe, setRecipe] = useState(() => {
    const fromHash = decodeRecipeFromHash(window.location.hash);
    return fromHash || JSON.parse(JSON.stringify(DEFAULT_RECIPE));
  });
  const [renderTime, setRenderTime] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('pattern');
  const canvasRef = useRef(null);

  // Sync recipe → URL hash (debounced)
  useEffect(() => {
    const tid = setTimeout(() => {
      const hash = encodeRecipeToHash(recipe);
      window.history.replaceState(null, '', hash);
    }, 300);
    return () => clearTimeout(tid);
  }, [recipe]);

  const handlePresetChange = useCallback((presetName) => {
    setRecipe(prev => applyPreset(prev, presetName));
  }, []);

  const handleSeedChange = useCallback((seed) => {
    setRecipe(prev => ({ ...prev, seed }));
  }, []);

  const handleRandomSeed = useCallback(() => {
    setRecipe(prev => ({ ...prev, seed: Math.floor(Math.random() * 999999) }));
  }, []);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `damascus_${recipe.pattern}_s${recipe.seed}.png`;
    a.href = canvas.toDataURL();
    a.click();
  }, [recipe]);

  const handleCopyRecipe = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
  }, [recipe]);

  const handleResolutionChange = useCallback((resolution) => {
    setRecipe(prev => ({ ...prev, resolution }));
  }, []);

  const handleDeformationChange = useCallback((deformations) => {
    setRecipe(prev => ({ ...prev, deformations, pattern: 'custom' }));
  }, []);

  const handleGalleryLoad = useCallback((loadedRecipe) => {
    setRecipe(loadedRecipe);
  }, []);

  return (
    <div style={{
      background: '#0b0b0b',
      minHeight: '100vh',
      padding: '16px 24px',
      fontFamily: 'monospace',
      color: '#d8d4cc',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      maxWidth: 1000,
      margin: '0 auto',
    }}>
      <Header
        recipe={recipe}
        onPresetChange={handlePresetChange}
        onSeedChange={handleSeedChange}
        onRandomSeed={handleRandomSeed}
        onDownload={handleDownload}
        onCopyRecipe={handleCopyRecipe}
        onResolutionChange={handleResolutionChange}
      />

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button style={TAB_STYLE(tab === 'pattern')} onClick={() => setTab('pattern')}>
          PATTERN
        </button>
        <button style={TAB_STYLE(tab === 'explore')} onClick={() => setTab('explore')}>
          EXPLORE
        </button>
        <button style={TAB_STYLE(tab === 'swords')} onClick={() => setTab('swords')}>
          BLADES
        </button>
      </div>

      {tab === 'pattern' && (
        <>
          <Canvas
            ref={canvasRef}
            recipe={recipe}
            onRenderTime={setRenderTime}
            onBusyChange={setBusy}
          />

          <Gallery
            recipe={recipe}
            onLoad={handleGalleryLoad}
            canvasRef={canvasRef}
          />

          <Controls
            recipe={recipe}
            onChange={setRecipe}
          />

          <DeformationStack
            deformations={recipe.deformations}
            onChange={handleDeformationChange}
          />

          <StatusBar
            recipe={recipe}
            renderTime={renderTime}
            busy={busy}
          />
        </>
      )}

      {tab === 'explore' && (
        <Explore onLoadRecipe={(r) => { setRecipe(r); setTab('pattern'); }} />
      )}

      {tab === 'swords' && (
        <SwordPreview recipe={recipe} />
      )}
    </div>
  );
}

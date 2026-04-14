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

export default function App() {
  const [recipe, setRecipe] = useState(() => {
    const fromHash = decodeRecipeFromHash(window.location.hash);
    return fromHash || JSON.parse(JSON.stringify(DEFAULT_RECIPE));
  });
  const [renderTime, setRenderTime] = useState(null);
  const [busy, setBusy] = useState(false);
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
      padding: 16,
      fontFamily: 'monospace',
      color: '#d8d4cc',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <Header
        recipe={recipe}
        onPresetChange={handlePresetChange}
        onSeedChange={handleSeedChange}
        onRandomSeed={handleRandomSeed}
        onDownload={handleDownload}
        onCopyRecipe={handleCopyRecipe}
      />

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
    </div>
  );
}

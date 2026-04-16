import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DEFAULT_RECIPE } from './recipe/schema.js';
import { applyPreset } from './recipe/presets.js';
import { PRESET_NAMES, PRESET_LABELS } from './recipe/presets.js';
import { encodeRecipeToHash, decodeRecipeFromHash } from './recipe/url.js';
import { renderDamascus } from './engine/render.js';
import { generateSVG, downloadSVG } from './engine/export-svg.js';
import { ALLOY_NAMES } from './engine/alloys.js';
import { T, btnStyle, tabStyle, sectionHeader, emberColor } from './ui/theme.js';
import Slider from './ui/Slider.jsx';
import UnicodeSlider from './ui/UnicodeSlider.jsx';
import { DEFAULT_VECTOR_SETTINGS } from './ui/VectorControls.jsx';
import { PARAM_RANGES, TOOLTIPS } from './recipe/schema.js';

// Generate a random recipe
function randomRecipe() {
  const types = ['twist', 'ladder', 'raindrop', 'feather'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rf = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

  const approach = Math.random();
  let deformations, pattern;
  if (approach < 0.2) { deformations = []; pattern = 'wild'; }
  else if (approach < 0.5) {
    const t = pick(types);
    deformations = [randomDeform(t)];
    pattern = t;
  } else {
    deformations = [randomDeform(pick(types)), randomDeform(pick(types))];
    pattern = 'custom';
  }

  return {
    ...DEFAULT_RECIPE,
    seed: ri(0, 999999),
    pattern,
    deformations,
    warp: { turbulence: rf(0.3, 1.8), passes: ri(2, 6), scale: rf(0.8, 3.5), octaves: ri(3, 6) },
    layers: { count: ri(10, 48), alloy: pick(ALLOY_NAMES) },
    crossSection: { depth: rf(0, 0.6), angle: rf(0, 0.8) },
  };
}

function randomDeform(type) {
  const rf = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  switch (type) {
    case 'twist': return { type: 'twist', rate: rf(1.5, 7), center: [rf(0.3, 0.7), rf(0.3, 0.7)] };
    case 'ladder': return { type: 'ladder', frequency: ri(3, 12), amplitude: rf(0.05, 0.3), profile: pick(['sine', 'step', 'rounded']) };
    case 'raindrop': return { type: 'raindrop', count: ri(5, 18), radius: rf(0.04, 0.18), amplitude: rf(0.1, 0.4), layout: pick(['hex', 'grid', 'random']) };
    case 'feather': return { type: 'feather', frequency: ri(2, 8), amplitude: rf(0.05, 0.3), angle: rf(0, 1) };
    default: return { type };
  }
}

// Generate SVG vector texture, rasterize to image, return as Promise<HTMLImageElement>
function generateVectorTexture(recipe, width, height, vecSettings, textureScale) {
  // Generate SVG with patternScale baked into the recipe
  const scaledRecipe = { ...recipe, patternScale: textureScale / 100 };
  const svgStr = generateSVG(scaledRecipe, width, height, vecSettings);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// Blade renderer (bevel view) — uses vector SVG texture
async function renderBevel(canvas, recipe, textureScale, vecSettings) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = T.bgDeep;
  ctx.fillRect(0, 0, W, H);

  // Generate vector texture via SVG pipeline
  const texImg = await generateVectorTexture(recipe, W, H, vecSettings, textureScale);
  if (!texImg) return;

  // Blade geometry
  const numPts = 80;
  const spine = [], belly = [], bevelLine = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const x = -W * 0.15 + t * W * 1.05;
    const bladeWidth = H * 0.48 * (1 - t * t * 0.97);
    const spineY = H * 0.15 + t * H * 0.28;
    const bellyCurve = Math.sin(t * Math.PI * 0.6) * H * 0.12 * (1 - t);
    let bellyY = spineY + bladeWidth + bellyCurve;
    if (bellyY < spineY + 2) {
      const mid = (spineY + bellyY) / 2;
      spine.push([x, mid]); belly.push([x, mid]); bevelLine.push([x, mid]);
    } else {
      spine.push([x, spineY]); belly.push([x, bellyY]);
      bevelLine.push([x, bellyY - (bellyY - spineY) * 0.28]);
    }
  }

  // Build blade path
  const bladePath = new Path2D();
  bladePath.moveTo(spine[0][0], spine[0][1]);
  for (let i = 1; i < spine.length; i++) bladePath.lineTo(spine[i][0], spine[i][1]);
  for (let i = belly.length - 1; i >= 0; i--) bladePath.lineTo(belly[i][0], belly[i][1]);
  bladePath.closePath();

  // Draw texture clipped to blade
  ctx.save();
  ctx.clip(bladePath);
  ctx.drawImage(texImg, 0, 0, W, H);

  // Metallic shading
  const cx = W / 2, cy = H / 2;
  const sg = ctx.createLinearGradient(cx, cy - H * 0.4, cx, cy + H * 0.4);
  sg.addColorStop(0, 'rgba(255,255,255,0.12)');
  sg.addColorStop(0.2, 'rgba(255,255,255,0.06)');
  sg.addColorStop(0.5, 'rgba(0,0,0,0)');
  sg.addColorStop(0.8, 'rgba(0,0,0,0.15)');
  sg.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);

  const sp = ctx.createLinearGradient(cx, cy - H * 0.3, cx, cy - H * 0.1);
  sp.addColorStop(0, 'rgba(255,255,255,0)');
  sp.addColorStop(0.5, 'rgba(255,255,255,0.11)');
  sp.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = sp;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  // Bevel zone
  const bevelPath = new Path2D();
  bevelPath.moveTo(bevelLine[0][0], bevelLine[0][1]);
  for (let i = 1; i < bevelLine.length; i++) bevelPath.lineTo(bevelLine[i][0], bevelLine[i][1]);
  for (let i = belly.length - 1; i >= 0; i--) bevelPath.lineTo(belly[i][0], belly[i][1]);
  bevelPath.closePath();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(140,140,150,1)';
  ctx.fill(bevelPath);
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();

  // Edge highlights
  ctx.beginPath();
  belly.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = 'rgba(220,220,230,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(240,240,245,0.15)'; ctx.lineWidth = 0.7; ctx.stroke();

  ctx.beginPath();
  spine.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = 'rgba(180,180,190,0.15)'; ctx.lineWidth = 1; ctx.stroke();

  // Bevel line
  ctx.beginPath();
  bevelLine.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = 'rgba(200,200,210,0.2)'; ctx.lineWidth = 1; ctx.stroke();
}

export default function AppV2() {
  const [recipe, setRecipe] = useState(() => {
    const fromHash = decodeRecipeFromHash(window.location.hash);
    return fromHash || randomRecipe();
  });
  const [textureScale, setTextureScale] = useState(120);
  const [vecSettings, setVecSettings] = useState(DEFAULT_VECTOR_SETTINGS);
  const [section, setSection] = useState('blade');
  const canvasRef = useRef(null);

  // URL sync
  useEffect(() => {
    const tid = setTimeout(() => {
      window.history.replaceState(null, '', encodeRecipeToHash(recipe));
    }, 300);
    return () => clearTimeout(tid);
  }, [recipe]);

  // Render blade
  const [rendering, setRendering] = useState(false);
  useEffect(() => {
    if (!canvasRef.current || section !== 'blade') return;
    let cancelled = false;
    setRendering(true);
    const tid = setTimeout(async () => {
      if (cancelled) return;
      await renderBevel(canvasRef.current, recipe, textureScale, vecSettings);
      if (!cancelled) setRendering(false);
    }, 200);
    return () => { cancelled = true; clearTimeout(tid); };
  }, [recipe, textureScale, vecSettings, section]);

  const handleReroll = useCallback(() => setRecipe(randomRecipe()), []);

  const handleSavePNG = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `damascus_blade_s${recipe.seed}.png`;
      a.href = url; a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
    navigator.clipboard.writeText(JSON.stringify({
      seed: recipe.seed, pattern: recipe.pattern, alloy: recipe.layers.alloy,
      layers: recipe.layers.count, textureScale,
    })).catch(() => {});
  }, [recipe, textureScale]);

  const handleSaveSVG = useCallback(() => {
    downloadSVG(recipe, 1920, 768, vecSettings);
  }, [recipe, vecSettings]);

  // Preset info string
  const deformStr = recipe.deformations.length === 0
    ? 'wild'
    : recipe.deformations.map(d => d.type).join(' + ');

  return (
    <div style={{
      background: T.bgDeep,
      minHeight: '100vh',
      fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
      color: T.textPrim,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ═══ Header ═══ */}
      <div style={{
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${T.border}`,
        maxWidth: 1100,
        width: '100%',
        margin: '0 auto',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            DAMASCUS FORGE
          </div>
          <div style={{ fontSize: 9, color: T.textDim, letterSpacing: '0.05em', marginTop: 1 }}>
            {deformStr} &middot; {recipe.layers.alloy} &middot; seed {recipe.seed}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button style={btnStyle()} onClick={handleReroll}>ROLL</button>
          <button style={btnStyle()} onClick={handleSavePNG}>PNG &darr;</button>
          <button style={btnStyle(true)} onClick={handleSaveSVG}>SVG &darr;</button>
        </div>
      </div>

      {/* ═══ Nav ═══ */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: `1px solid ${T.border}`,
        maxWidth: 1100, width: '100%', margin: '0 auto',
      }}>
        {[
          { id: 'blade', label: 'BLADE' },
          { id: 'pattern', label: 'PATTERN' },
          { id: 'vector', label: 'VECTOR' },
          { id: 'about', label: 'ABOUT' },
        ].map(t => (
          <button key={t.id} style={tabStyle(section === t.id)} onClick={() => setSection(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Content ═══ */}
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', flex: 1 }}>

        {section === 'blade' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Blade — hero */}
            <div style={{ position: 'relative', background: T.bgDeep }}>
              <canvas
                ref={canvasRef}
                width={1280}
                height={480}
                style={{ width: '100%', display: 'block' }}
              />
              {/* Forge vignette */}
              <div style={{
                background: 'radial-gradient(ellipse at center, transparent 35%, rgba(8,6,4,0.45) 70%, rgba(4,3,2,0.75) 100%)',
                pointerEvents: 'none', position: 'absolute', inset: 0,
              }} />
              {rendering && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(13,11,9,0.6)',
                  fontFamily: 'monospace', fontSize: 11, color: T.emberLow,
                  letterSpacing: '0.2em',
                }}>FORGING\u2026</div>
              )}
            </div>

            {/* Controls strip */}
            <div style={{
              padding: '12px 24px',
              display: 'flex',
              gap: 20,
              alignItems: 'flex-end',
              borderBottom: `1px solid ${T.border}`,
            }}>
              <div style={{ flex: 1, maxWidth: 300 }}>
                <UnicodeSlider label="texture scale" value={textureScale} onChange={setTextureScale}
                  min={30} max={300} step={5} tooltip="Pattern zoom on the blade." />
              </div>
              <div style={{ flex: 1, maxWidth: 200 }}>
                <UnicodeSlider label="seed" value={recipe.seed}
                  onChange={v => setRecipe(r => ({ ...r, seed: v }))}
                  min={0} max={999999} step={1} />
              </div>
              <div style={{ flex: 1, maxWidth: 200 }}>
                <UnicodeSlider label="layers" value={recipe.layers.count}
                  onChange={v => setRecipe(r => ({ ...r, layers: { ...r.layers, count: v } }))}
                  min={4} max={96} step={1} tooltip="Layer count in the billet." />
              </div>
            </div>

            {/* Vector settings — bottom */}
            <div style={{ padding: '12px 24px' }}>
              <div style={sectionHeader}>VECTOR EXPORT SETTINGS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px 20px', maxWidth: 800 }}>
                <UnicodeSlider label="levels" value={vecSettings.levels}
                  onChange={v => setVecSettings(s => ({ ...s, levels: v }))}
                  min={2} max={20} step={1}
                  tooltip="Color gradient bands in SVG export." />
                <UnicodeSlider label="detail" value={vecSettings.detail}
                  onChange={v => setVecSettings(s => ({ ...s, detail: v }))}
                  min={1} max={5} step={1}
                  tooltip="Grid sampling density for contour extraction." />
                <UnicodeSlider label="smoothing" value={vecSettings.smoothing}
                  onChange={v => setVecSettings(s => ({ ...s, smoothing: v }))}
                  min={1} max={6} step={1}
                  tooltip="Contour curve smoothing radius." />
                <UnicodeSlider label="grain" value={vecSettings.grain}
                  onChange={v => setVecSettings(s => ({ ...s, grain: v }))}
                  min={0} max={100} step={5} fmt={v => `${v}%`}
                  tooltip="SVG grain texture intensity." />
                <UnicodeSlider label="vignette" value={vecSettings.vignette}
                  onChange={v => setVecSettings(s => ({ ...s, vignette: v }))}
                  min={0} max={80} step={5} fmt={v => `${v}%`}
                  tooltip="SVG edge darkening." />
                <UnicodeSlider label="variation" value={vecSettings.colorVariation}
                  onChange={v => setVecSettings(s => ({ ...s, colorVariation: v }))}
                  min={0} max={100} step={5} fmt={v => `${v}%`}
                  tooltip="Per-band color randomness." />
                <UnicodeSlider label="min size" value={vecSettings.minSize}
                  onChange={v => setVecSettings(s => ({ ...s, minSize: v }))}
                  min={0} max={200} step={5}
                  tooltip="Minimum contour length. Removes stray fragments." />
                <UnicodeSlider label="blur" value={vecSettings.blur}
                  onChange={v => setVecSettings(s => ({ ...s, blur: v }))}
                  min={0} max={8} step={0.5}
                  tooltip="SVG Gaussian blur for soft band transitions." />
              </div>
            </div>
          </div>
        )}

        {section === 'pattern' && (
          <div style={{ padding: 24, color: T.textDim, fontSize: 11 }}>
            <p>Pattern editor — coming soon. Use the main app for now.</p>
          </div>
        )}

        {section === 'vector' && (
          <div style={{ padding: 24, color: T.textDim, fontSize: 11 }}>
            <p>Vector viewer — coming soon. Use SVG &darr; to export.</p>
          </div>
        )}

        {section === 'about' && (
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.7, maxWidth: 600 }}>
              <p>Damascus steel pattern simulator. Composable deformation stack engine with
              Perlin noise domain warping, marching squares contour extraction, and
              cubic Bezier curve fitting.</p>
              <p style={{ marginTop: 8 }}>
                <a href="https://github.com/kai-denrei/damascus-steel-patterns" target="_blank"
                  rel="noopener" style={{ color: T.emberLow, borderBottom: `1px solid ${T.border}`, textDecoration: 'none' }}>
                  Source &amp; references on GitHub
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

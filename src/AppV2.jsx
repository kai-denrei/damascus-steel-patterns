import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_RECIPE } from './recipe/schema.js';
import { encodeRecipeToHash, decodeRecipeFromHash } from './recipe/url.js';
import { renderDamascus } from './engine/render.js';
import { generateSVG, downloadSVG } from './engine/export-svg.js';
import { ALLOY_NAMES } from './engine/alloys.js';
import { T, btnStyle, tabStyle, sectionHeader } from './ui/theme.js';
import UnicodeSlider from './ui/UnicodeSlider.jsx';
import { DEFAULT_VECTOR_SETTINGS } from './ui/VectorControls.jsx';

// ═══════════════════════════════════════════
// Random recipe generation
// ═══════════════════════════════════════════
const rf = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function randomDeform(type) {
  switch (type) {
    case 'twist': return { type: 'twist', rate: rf(1.5, 7), center: [rf(0.3, 0.7), rf(0.3, 0.7)] };
    case 'ladder': return { type: 'ladder', frequency: ri(3, 12), amplitude: rf(0.05, 0.3), profile: pick(['sine', 'step', 'rounded']) };
    case 'raindrop': return { type: 'raindrop', count: ri(5, 18), radius: rf(0.04, 0.18), amplitude: rf(0.1, 0.4), layout: pick(['hex', 'grid', 'random']) };
    case 'feather': return { type: 'feather', frequency: ri(2, 8), amplitude: rf(0.05, 0.3), angle: rf(0, 1) };
    default: return { type };
  }
}

function randomRecipe() {
  const types = ['twist', 'ladder', 'raindrop', 'feather'];
  const approach = Math.random();
  let deformations, pattern;
  if (approach < 0.2) { deformations = []; pattern = 'wild'; }
  else if (approach < 0.5) { const t = pick(types); deformations = [randomDeform(t)]; pattern = t; }
  else { deformations = [randomDeform(pick(types)), randomDeform(pick(types))]; pattern = 'custom'; }
  return {
    ...DEFAULT_RECIPE, seed: ri(0, 999999), pattern, deformations,
    warp: { turbulence: rf(0.3, 1.8), passes: ri(2, 6), scale: rf(0.8, 3.5), octaves: ri(3, 6) },
    layers: { count: ri(10, 48), alloy: pick(ALLOY_NAMES) },
    crossSection: { depth: rf(0, 0.6), angle: rf(0, 0.8) },
  };
}

// ═══════════════════════════════════════════
// SVG texture → rasterized image
// ═══════════════════════════════════════════
function rasterizeSVG(recipe, width, height, vecSettings, textureScale) {
  const svgStr = generateSVG({ ...recipe, patternScale: textureScale / 100 }, width, height, vecSettings);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
  });
}

// ═══════════════════════════════════════════
// Blade geometry — shared by all blade renderers
// ═══════════════════════════════════════════
function bladeGeometry(W, H) {
  const numPts = 80;
  const spine = [], belly = [], bevelLine = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const x = -W * 0.12 + t * W * 1.02;
    // Sharper tip: cubic taper with steeper convergence
    const bladeWidth = H * 0.48 * Math.pow(1 - t, 1.3) * (0.15 + 0.85 * (1 - t * t * 0.5));
    const spineY = H * 0.15 + t * H * 0.32;
    const bellyCurve = Math.sin(t * Math.PI * 0.55) * H * 0.1 * (1 - t);
    let bellyY = spineY + bladeWidth + bellyCurve;
    if (bellyY < spineY + 1.5) {
      const mid = (spineY + bellyY) / 2;
      spine.push([x, mid]); belly.push([x, mid]); bevelLine.push([x, mid]);
    } else {
      spine.push([x, spineY]); belly.push([x, bellyY]);
      bevelLine.push([x, bellyY - (bellyY - spineY) * 0.28]);
    }
  }
  return { spine, belly, bevelLine };
}

function buildBladePath(spine, belly) {
  const p = new Path2D();
  p.moveTo(spine[0][0], spine[0][1]);
  for (let i = 1; i < spine.length; i++) p.lineTo(spine[i][0], spine[i][1]);
  for (let i = belly.length - 1; i >= 0; i--) p.lineTo(belly[i][0], belly[i][1]);
  p.closePath();
  return p;
}

// ═══════════════════════════════════════════
// Blade renderer — full bevel with metallic shading
// ═══════════════════════════════════════════
async function renderBlade(canvas, recipe, textureScale, vecSettings) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = T.bgDeep;
  ctx.fillRect(0, 0, W, H);

  const texImg = await rasterizeSVG(recipe, W, H, vecSettings, textureScale);
  if (!texImg) return;

  const { spine, belly, bevelLine } = bladeGeometry(W, H);
  const bladePath = buildBladePath(spine, belly);

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
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);

  const sp = ctx.createLinearGradient(cx, cy - H * 0.3, cx, cy - H * 0.1);
  sp.addColorStop(0, 'rgba(255,255,255,0)');
  sp.addColorStop(0.5, 'rgba(255,255,255,0.11)');
  sp.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = sp; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  // Bevel zone
  const bevelPath = new Path2D();
  bevelPath.moveTo(bevelLine[0][0], bevelLine[0][1]);
  for (let i = 1; i < bevelLine.length; i++) bevelPath.lineTo(bevelLine[i][0], bevelLine[i][1]);
  for (let i = belly.length - 1; i >= 0; i--) bevelPath.lineTo(belly[i][0], belly[i][1]);
  bevelPath.closePath();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(140,140,150,1)'; ctx.fill(bevelPath);
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
  ctx.beginPath();
  bevelLine.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = 'rgba(200,200,210,0.2)'; ctx.lineWidth = 1; ctx.stroke();
}

// ═══════════════════════════════════════════
// Explore: render 9 small blade thumbnails
// ═══════════════════════════════════════════
function renderMiniBladePixel(canvas, recipe) {
  // Fast pixel render for thumbnail (no SVG pipeline)
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = T.bgDeep; ctx.fillRect(0, 0, W, H);

  const tex = document.createElement('canvas');
  tex.width = W; tex.height = H;
  renderDamascus(tex, { ...recipe, resolution: 1, patternScale: 1.2 });

  const { spine, belly } = bladeGeometry(W, H);
  const bladePath = buildBladePath(spine, belly);
  ctx.save(); ctx.clip(bladePath);
  ctx.drawImage(tex, 0, 0, W, H);
  ctx.restore();
}

// ═══════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════
export default function AppV2() {
  const [recipe, setRecipe] = useState(() => {
    const fromHash = decodeRecipeFromHash(window.location.hash);
    return fromHash || randomRecipe();
  });
  const [textureScale, setTextureScale] = useState(120);
  const [vecSettings, setVecSettings] = useState(DEFAULT_VECTOR_SETTINGS);
  const [section, setSection] = useState('blade');
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef(null);

  // Explore state
  const [exploreRecipes, setExploreRecipes] = useState([]);
  const exploreRefs = useRef([]);

  // URL sync
  useEffect(() => {
    const tid = setTimeout(() => {
      window.history.replaceState(null, '', encodeRecipeToHash(recipe));
    }, 300);
    return () => clearTimeout(tid);
  }, [recipe]);

  // Render blade
  useEffect(() => {
    if (!canvasRef.current || section !== 'blade') return;
    let cancelled = false;
    setRendering(true);
    const tid = setTimeout(async () => {
      if (cancelled) return;
      await renderBlade(canvasRef.current, recipe, textureScale, vecSettings);
      if (!cancelled) setRendering(false);
    }, 200);
    return () => { cancelled = true; clearTimeout(tid); };
  }, [recipe, textureScale, vecSettings, section]);

  // Render explore thumbnails
  useEffect(() => {
    if (section !== 'explore' || exploreRecipes.length === 0) return;
    exploreRecipes.forEach((r, i) => {
      const c = exploreRefs.current[i];
      if (c) renderMiniBladePixel(c, r);
    });
  }, [exploreRecipes, section]);

  const handleForgeAnew = useCallback(() => {
    if (section === 'explore') {
      setExploreRecipes(Array.from({ length: 9 }, () => randomRecipe()));
    } else {
      setRecipe(randomRecipe());
    }
  }, [section]);

  const handleSavePNG = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      const a = document.createElement('a');
      a.download = `damascus_blade_s${recipe.seed}.png`;
      a.href = URL.createObjectURL(blob); a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
    navigator.clipboard.writeText(JSON.stringify({
      seed: recipe.seed, pattern: recipe.pattern, alloy: recipe.layers.alloy,
      layers: recipe.layers.count, textureScale,
    })).catch(() => {});
  }, [recipe, textureScale]);

  const handleSaveSVG = useCallback(() => {
    downloadSVG({ ...recipe, patternScale: textureScale / 100 }, 1920, 768, vecSettings);
  }, [recipe, vecSettings, textureScale]);

  const deformStr = recipe.deformations.length === 0
    ? 'wild' : recipe.deformations.map(d => d.type).join(' + ');

  // Init explore on first visit
  useEffect(() => {
    if (section === 'explore' && exploreRecipes.length === 0) {
      setExploreRecipes(Array.from({ length: 9 }, () => randomRecipe()));
    }
  }, [section]);

  return (
    <div style={{
      background: T.bgDeep, minHeight: '100vh',
      fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
      color: T.textPrim, display: 'flex', flexDirection: 'column',
    }}>

      {/* ═══ Header ═══ */}
      <div style={{
        padding: '10px 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: `1px solid ${T.border}`,
        maxWidth: 1100, width: '100%', margin: '0 auto',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            DAMASCUS FORGE
          </div>
          <div style={{ fontSize: 9, color: T.textDim, letterSpacing: '0.05em', marginTop: 1 }}>
            {deformStr} &middot; {recipe.layers.alloy} &middot; s{recipe.seed}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {/* Forge Anew button */}
          <button
            onClick={handleForgeAnew}
            title="Forge Anew"
            style={{
              ...btnStyle(),
              fontSize: 18,
              padding: '2px 10px',
              lineHeight: 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.fontSize = '12px'; e.target.textContent = '\u2692 Forge Anew'; e.target.style.color = T.emberLow; e.target.style.borderColor = T.emberLow; }}
            onMouseLeave={e => { e.target.style.fontSize = '18px'; e.target.textContent = '\u2692'; e.target.style.color = T.textDim; e.target.style.borderColor = T.border; }}
          >{'\u2692'}</button>

          {section === 'blade' && <button style={btnStyle()} onClick={handleSavePNG}>PNG &darr;</button>}
          <button style={btnStyle(true)} onClick={handleSaveSVG}>SVG &darr;</button>
        </div>
      </div>

      {/* ═══ Nav ═══ */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: `1px solid ${T.border}`,
        maxWidth: 1100, width: '100%', margin: '0 auto',
      }}>
        {[
          { id: 'blade', label: 'BLADE', sub: 'preview \u00B7 export png' },
          { id: 'explore', label: 'EXPLORE', sub: 'roll 9 patterns' },
          { id: 'vector', label: 'VECTOR', sub: 'export svg for blender' },
          { id: 'about', label: 'ABOUT', sub: 'sources \u00B7 research' },
        ].map(t => (
          <button key={t.id} style={{
            ...tabStyle(section === t.id),
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
            padding: '8px 16px',
          }} onClick={() => setSection(t.id)}>
            <span>{t.label}</span>
            <span style={{ fontSize: 8, color: T.textDim, letterSpacing: '0.02em', textTransform: 'none' }}>{t.sub}</span>
          </button>
        ))}
      </div>

      {/* ═══ Content ═══ */}
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', flex: 1 }}>

        {/* ─── BLADE ─── */}
        {section === 'blade' && (
          <div>
            <div style={{ position: 'relative', background: T.bgDeep }}>
              <canvas ref={canvasRef} width={1280} height={480}
                style={{ width: '100%', display: 'block' }} />
              <div style={{
                background: 'radial-gradient(ellipse at center, transparent 35%, rgba(8,6,4,0.45) 70%, rgba(4,3,2,0.75) 100%)',
                pointerEvents: 'none', position: 'absolute', inset: 0,
              }} />
              {rendering && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(13,11,9,0.6)', fontSize: 11, color: T.emberLow, letterSpacing: '0.2em',
                }}>FORGING\u2026</div>
              )}
            </div>

            <div style={{ padding: '12px 24px', display: 'flex', gap: 20, borderBottom: `1px solid ${T.border}` }}>
              <div style={{ flex: 1, maxWidth: 300 }}>
                <UnicodeSlider label="texture scale" value={textureScale} onChange={setTextureScale}
                  min={30} max={300} step={5} tooltip="Pattern zoom on the blade." />
              </div>
              <div style={{ flex: 1, maxWidth: 200 }}>
                <UnicodeSlider label="seed" value={recipe.seed}
                  onChange={v => setRecipe(r => ({ ...r, seed: v }))} min={0} max={999999} step={1} />
              </div>
              <div style={{ flex: 1, maxWidth: 200 }}>
                <UnicodeSlider label="layers" value={recipe.layers.count}
                  onChange={v => setRecipe(r => ({ ...r, layers: { ...r.layers, count: v } }))}
                  min={4} max={96} step={1} tooltip="Layer count." />
              </div>
            </div>

            <div style={{ padding: '12px 24px' }}>
              <div style={sectionHeader}>VECTOR EXPORT SETTINGS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px 20px', maxWidth: 800 }}>
                {[
                  { key: 'levels', min: 2, max: 20, step: 1, tip: 'Color gradient bands.' },
                  { key: 'detail', min: 1, max: 5, step: 1, tip: 'Grid density for contours.' },
                  { key: 'smoothing', min: 1, max: 6, step: 1, tip: 'Curve smoothing radius.' },
                  { key: 'grain', min: 0, max: 100, step: 5, fmt: v => `${v}%`, tip: 'SVG grain texture.' },
                  { key: 'vignette', min: 0, max: 80, step: 5, fmt: v => `${v}%`, tip: 'Edge darkening.' },
                  { key: 'colorVariation', label: 'variation', min: 0, max: 100, step: 5, fmt: v => `${v}%`, tip: 'Color randomness.' },
                  { key: 'minSize', label: 'min size', min: 0, max: 200, step: 5, tip: 'Remove small fragments.' },
                  { key: 'blur', min: 0, max: 8, step: 0.5, tip: 'Blur band transitions.' },
                ].map(s => (
                  <UnicodeSlider key={s.key} label={s.label || s.key} value={vecSettings[s.key]}
                    onChange={v => setVecSettings(prev => ({ ...prev, [s.key]: v }))}
                    min={s.min} max={s.max} step={s.step} fmt={s.fmt} tooltip={s.tip} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── EXPLORE ─── */}
        {section === 'explore' && (
          <div style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: T.textDim }}>
                click a blade to send it to BLADE view &middot; hit {'\u2692'} to re-forge all 9
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {exploreRecipes.map((r, i) => (
                <div key={`${r.seed}-${i}`}
                  onClick={() => { setRecipe(r); setSection('blade'); }}
                  style={{
                    cursor: 'pointer', border: `1px solid ${T.border}`,
                    background: T.bgPanel, transition: 'border-color 0.15s',
                    position: 'relative', overflow: 'hidden',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.emberLow}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                >
                  <canvas
                    ref={el => exploreRefs.current[i] = el}
                    width={420} height={160}
                    style={{ width: '100%', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '4px 8px', background: 'rgba(13,11,9,0.7)',
                    fontSize: 9, color: T.textDim, fontFamily: 'monospace',
                  }}>
                    {r.deformations.length === 0 ? 'wild' : r.deformations.map(d => d.type).join('+')}
                    {' \u00B7 '}{r.layers.alloy}{' \u00B7 s'}{r.seed}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── VECTOR ─── */}
        {section === 'vector' && (
          <div style={{ padding: '24px' }}>
            <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.7, maxWidth: 600 }}>
              <div style={{ ...sectionHeader, marginTop: 0 }}>SVG VECTOR EXPORT</div>
              <p>Export the current pattern as a resolution-independent SVG with smooth
              Bezier contour curves. The SVG includes multi-threshold color bands,
              optional grain texture, and recipe metadata in the {'<desc>'} element.</p>
              <p style={{ marginTop: 8 }}>
                <strong style={{ color: T.textPrim }}>For Blender:</strong> The SVG can be imported directly.
                Use the recipe metadata to regenerate matching diffuse, normal, and roughness
                texture maps at any resolution for PBR materials.
              </p>
              <p style={{ marginTop: 8 }}>
                Adjust vector settings on the BLADE tab before exporting.
                SVG &darr; in the header exports with the current settings.
              </p>
              <button style={{ ...btnStyle(true), marginTop: 16 }} onClick={handleSaveSVG}>
                SVG &darr; EXPORT
              </button>
            </div>
          </div>
        )}

        {/* ─── ABOUT ─── */}
        {section === 'about' && (
          <div style={{ padding: '24px' }}>
            <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.7, maxWidth: 600 }}>
              <p>Damascus steel pattern simulator. Composable deformation stack engine with
              Perlin noise domain warping, marching squares contour extraction, and
              cubic Bezier curve fitting.</p>
              <p style={{ marginTop: 8 }}>
                <a href="https://github.com/kai-denrei/damascus-steel-patterns" target="_blank"
                  rel="noopener" style={{ color: T.emberLow, borderBottom: `1px solid ${T.border}`, textDecoration: 'none' }}>
                  Source, research &amp; references on GitHub
                </a>
              </p>
              <p style={{ marginTop: 4 }}>
                <a href="index.html" style={{ color: T.textDim, borderBottom: `1px solid ${T.border}`, textDecoration: 'none', fontSize: 10 }}>
                  Classic editor (v1) with full pattern controls
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

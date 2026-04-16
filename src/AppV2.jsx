import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_RECIPE } from './recipe/schema.js';
import { encodeRecipeToHash, decodeRecipeFromHash } from './recipe/url.js';
import { renderDamascus } from './engine/render.js';
import { generateSVG, downloadSVG } from './engine/export-svg.js';
import { ALLOY_NAMES } from './engine/alloys.js';
import { T, btnStyle, tabStyle, sectionHeader } from './ui/theme.js';
import UnicodeSlider from './ui/UnicodeSlider.jsx';
import { DEFAULT_VECTOR_SETTINGS } from './ui/VectorControls.jsx';
import About from './ui/About.jsx';
import { BLADE_SHAPES, BLADE_NAMES, generateClipPoint, generateTanto, generateSpearPoint } from './ui/BladeShapes.js';

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
    const x = -W * 0.15 + t * W * 1.05;
    const bladeWidth = H * 0.48 * (1 - t * t * 0.97);
    const spineY = H * 0.15 + t * H * 0.28;
    const bellyCurve = Math.sin(t * Math.PI * 0.6) * H * 0.12 * (1 - t);
    let bellyY = spineY + bladeWidth + bellyCurve;
    // Near the tip: curve spine down and belly up so they meet in a rounded point
    if (t > 0.88) {
      const tipT = (t - 0.88) / 0.12; // 0→1 over last 12%
      const pinch = tipT * tipT;
      const mid = (spineY + bellyY) / 2;
      const curvedSpine = spineY + (mid - spineY) * pinch;
      const curvedBelly = bellyY - (bellyY - mid) * pinch;
      spine.push([x, curvedSpine]); belly.push([x, curvedBelly]);
      bevelLine.push([x, curvedBelly - (curvedBelly - curvedSpine) * 0.28]);
    } else if (bellyY < spineY + 2) {
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
// Blade renderer — anisotropic shading, fuller, edge gleam
// Based on blade-rendering-research.md
// ═══════════════════════════════════════════
async function renderBlade(canvas, recipe, textureScale, vecSettings) {
  const geo = bladeGeometry(canvas.width, canvas.height);
  return renderBladeWithGeo(canvas, recipe, textureScale, vecSettings, geo, true);
}

async function renderBladeWithGeo(canvas, recipe, textureScale, vecSettings, geo, showFuller = true) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = T.bgDeep;
  ctx.fillRect(0, 0, W, H);

  const texImg = await rasterizeSVG(recipe, W, H, vecSettings, textureScale);
  if (!texImg) return;

  const { spine, belly, bevelLine } = geo;
  const bladePath = buildBladePath(spine, belly);
  const numPts = spine.length;

  // ── 1. Damascus texture clipped to blade ──
  ctx.save();
  ctx.clip(bladePath);
  ctx.drawImage(texImg, 0, 0, W, H);

  // ── 2. Anisotropic metallic gradient (research 2e) ──
  // Gradient runs spine→belly (perpendicular to blade axis), not radially.
  // Mimics how polished steel reflects: bright band on cheek, dark at spine/edge.
  // Use the blade's average spine/belly Y to orient the gradient.
  const midIdx = Math.floor(numPts * 0.4);
  const spineAvgY = spine[midIdx][1];
  const bellyAvgY = belly[midIdx][1];
  const anisoGrad = ctx.createLinearGradient(0, spineAvgY, 0, bellyAvgY);
  anisoGrad.addColorStop(0.0, 'rgba(58,56,54,0.4)');    // spine region: darker
  anisoGrad.addColorStop(0.15, 'rgba(154,152,144,0.18)'); // first reflection
  anisoGrad.addColorStop(0.35, 'rgba(212,208,202,0.12)'); // primary cheek hotspot
  anisoGrad.addColorStop(0.55, 'rgba(122,120,116,0.15)'); // mid-cheek
  anisoGrad.addColorStop(0.72, 'rgba(42,40,36,0.35)');    // bevel transition: dark
  anisoGrad.addColorStop(0.88, 'rgba(20,18,16,0.4)');     // edge zone: darkest
  anisoGrad.addColorStop(1.0, 'rgba(42,40,36,0.2)');      // very edge: slightly lighter
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = anisoGrad; ctx.fillRect(0, 0, W, H);

  // ── 3. Bevel zone — grind-aware shading ──
  const bevelPath = new Path2D();
  bevelPath.moveTo(bevelLine[0][0], bevelLine[0][1]);
  for (let i = 1; i < bevelLine.length; i++) bevelPath.lineTo(bevelLine[i][0], bevelLine[i][1]);
  for (let i = belly.length - 1; i >= 0; i--) bevelPath.lineTo(belly[i][0], belly[i][1]);
  bevelPath.closePath();

  // Bevel gets a gradient from shoulder to edge (not flat multiply)
  ctx.save();
  ctx.clip(bevelPath);
  const bevelGrad = ctx.createLinearGradient(0, bevelLine[midIdx][1], 0, belly[midIdx][1]);
  bevelGrad.addColorStop(0, 'rgba(88,86,78,0.5)');   // shoulder highlight
  bevelGrad.addColorStop(0.15, 'rgba(40,38,34,0.55)'); // steep drop
  bevelGrad.addColorStop(0.7, 'rgba(28,26,22,0.6)');   // deep bevel
  bevelGrad.addColorStop(1.0, 'rgba(44,42,38,0.3)');   // slightly lighter at edge
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = bevelGrad; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // ── 4. Fuller groove (research 2c) — only if enabled for this profile ──
  if (showFuller) {
  // Positioned at ~38% from spine to bevel, runs 8%→75% of blade length
  // Tapers at both ends for realistic capsule shape
  const fullerPts = [];
  const fullerMaxW = H * 0.022;
  const fullerStart = 0.08, fullerEnd = 0.75;
  const taperLen = 0.06; // 6% of blade length for taper in/out

  for (let i = 0; i < numPts; i++) {
    const t = i / (numPts - 1);
    if (t < fullerStart || t > fullerEnd) continue;
    const sy = spine[i][1];
    const by = bevelLine[i][1];
    const fullerY = sy + (by - sy) * 0.38;

    // Taper: ease in at start, ease out at end
    let widthScale = 1;
    if (t < fullerStart + taperLen) {
      const p = (t - fullerStart) / taperLen;
      widthScale = p * p * (3 - 2 * p); // smoothstep
    } else if (t > fullerEnd - taperLen) {
      const p = (fullerEnd - t) / taperLen;
      widthScale = p * p * (3 - 2 * p);
    }
    fullerPts.push([spine[i][0], fullerY, fullerMaxW * widthScale]);
  }

  if (fullerPts.length > 2) {
    // Layer 1: Dark groove fill with tapered width
    ctx.beginPath();
    // Upper edge (forward)
    ctx.moveTo(fullerPts[0][0], fullerPts[0][1] - fullerPts[0][2] / 2);
    for (let i = 1; i < fullerPts.length; i++) {
      ctx.lineTo(fullerPts[i][0], fullerPts[i][1] - fullerPts[i][2] / 2);
    }
    // Rounded tip cap
    const last = fullerPts[fullerPts.length - 1];
    ctx.quadraticCurveTo(last[0] + last[2], last[1], last[0], last[1] + last[2] / 2);
    // Lower edge (backward)
    for (let i = fullerPts.length - 2; i >= 0; i--) {
      ctx.lineTo(fullerPts[i][0], fullerPts[i][1] + fullerPts[i][2] / 2);
    }
    // Rounded heel cap
    const first = fullerPts[0];
    ctx.quadraticCurveTo(first[0] - first[2], first[1], first[0], first[1] - first[2] / 2);
    ctx.closePath();

    const fullerGrad = ctx.createLinearGradient(0, fullerPts[10][1] - fullerMaxW / 2, 0, fullerPts[10][1] + fullerMaxW / 2);
    fullerGrad.addColorStop(0, 'rgba(24,22,20,0.7)');
    fullerGrad.addColorStop(0.5, 'rgba(12,10,8,0.85)');
    fullerGrad.addColorStop(1, 'rgba(24,22,20,0.7)');
    ctx.fillStyle = fullerGrad; ctx.fill();

    // Layer 2: Upper lip AO shadow
    ctx.beginPath();
    ctx.moveTo(fullerPts[0][0], fullerPts[0][1] - fullerPts[0][2] / 2);
    for (let i = 1; i < fullerPts.length; i++) ctx.lineTo(fullerPts[i][0], fullerPts[i][1] - fullerPts[i][2] / 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();

    // Layer 3: Lower lip specular highlight
    ctx.beginPath();
    ctx.moveTo(fullerPts[0][0], fullerPts[0][1] + fullerPts[0][2] / 2);
    for (let i = 1; i < fullerPts.length; i++) ctx.lineTo(fullerPts[i][0], fullerPts[i][1] + fullerPts[i][2] / 2);
    ctx.strokeStyle = 'rgba(200,190,175,0.22)'; ctx.lineWidth = 0.7; ctx.stroke();
  }
  } // end showFuller

  ctx.restore(); // end blade clip

  // ── 5. Bevel shoulder line ──
  ctx.beginPath();
  bevelLine.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = 'rgba(200,200,210,0.15)'; ctx.lineWidth = 0.8;
  ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);

  // ── 6. Spine stroke ──
  ctx.beginPath();
  spine.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = 'rgba(154,152,148,0.2)'; ctx.lineWidth = 1.4; ctx.stroke();

  // ── 7. Edge gleam (research 2e) ──
  // The cutting edge reflects as a bright thin line — the thinner the steel, the brighter.
  // Applied as the FINAL layer over everything, not clipped.
  ctx.save();
  ctx.beginPath();
  belly.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = '#f0ece6'; ctx.globalAlpha = 0.35; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.globalAlpha = 0.18; ctx.lineWidth = 2; ctx.stroke(); // soft glow behind
  ctx.restore();
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
// 刃 Ha section — experimental blade shapes
// ═══════════════════════════════════════════
function renderSvgBlade(canvas, recipe, textureScale, vecSettings, shape) {
  return new Promise(async (resolve) => {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = T.bgDeep;
    ctx.fillRect(0, 0, W, H);

    // Generate vector texture
    const texImg = await rasterizeSVG(recipe, W, H, vecSettings, textureScale);
    if (!texImg) { resolve(); return; }

    // Parse the SVG blade path
    const bladePath = new Path2D(shape.bladePath);

    // Compute transform: fit the shape viewBox into the canvas
    const [, , vbW, vbH] = shape.viewBox.split(' ').map(Number);
    const scaleX = W / vbW;
    const scaleY = H / vbH;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    const offX = (W - vbW * scale) / 2;
    const offY = (H - vbH * scale) / 2;

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    // Clip to blade shape
    ctx.save();
    ctx.clip(bladePath);

    // Draw texture: reset transform, draw full canvas, re-apply clip
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(texImg, 0, 0, W, H);
    ctx.restore();

    // Metallic shading inside clip (in viewBox coords)
    const sg = ctx.createLinearGradient(0, 0, 0, vbH);
    sg.addColorStop(0, 'rgba(255,255,255,0.1)');
    sg.addColorStop(0.3, 'rgba(255,255,255,0.04)');
    sg.addColorStop(0.6, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, vbW, vbH);

    ctx.restore(); // end clip

    // Blade outline
    ctx.strokeStyle = 'rgba(200,200,210,0.2)';
    ctx.lineWidth = 2 / scale;
    ctx.stroke(bladePath);

    // Guard if exists
    if (shape.guardPath) {
      const guardP = new Path2D(shape.guardPath);
      ctx.fillStyle = '#2a2520';
      ctx.fill(guardP);
      ctx.strokeStyle = 'rgba(180,170,150,0.2)';
      ctx.lineWidth = 1.5 / scale;
      ctx.stroke(guardP);
    }

    ctx.restore(); // end transform
    resolve();
  });
}

function HaSection({ recipe, textureScale, vecSettings }) {
  const canvasRef = useRef(null);
  const [bladeKey, setBladeKey] = useState('chef');
  const [rendering, setRendering] = useState(false);
  const [localScale, setLocalScale] = useState(textureScale);

  const shape = BLADE_SHAPES[bladeKey];

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    setRendering(true);

    const tid = setTimeout(async () => {
      if (cancelled) return;
      const c = canvasRef.current;

      if (shape.type.startsWith('procedural')) {
        // Pick the right geometry generator
        const geoFn = {
          'procedural': () => bladeGeometry(c.width, c.height),
          'procedural-clip': () => generateClipPoint(c.width, c.height),
          'procedural-tanto': () => generateTanto(c.width, c.height),
          'procedural-spear': () => generateSpearPoint(c.width, c.height),
        }[shape.type] || (() => bladeGeometry(c.width, c.height));
        await renderBladeWithGeo(c, recipe, localScale, vecSettings, geoFn(), shape.fuller !== false);
      } else if (shape.type === 'svg') {
        await renderSvgBlade(c, recipe, localScale, vecSettings, shape);
      }
      if (!cancelled) setRendering(false);
    }, 200);
    return () => { cancelled = true; clearTimeout(tid); };
  }, [recipe, localScale, vecSettings, bladeKey]);

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Blade selector */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 24px 12px',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {BLADE_NAMES.map(key => {
          const s = BLADE_SHAPES[key];
          const active = bladeKey === key;
          return (
            <button key={key} onClick={() => setBladeKey(key)} style={{
              ...btnStyle(active),
              padding: '5px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
            }}>
              <span style={{ fontSize: 10 }}>{s.name}</span>
              <span style={{ fontSize: 8, opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>{s.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Canvas */}
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

      {/* Scale slider */}
      <div style={{ padding: '12px 24px', maxWidth: 300 }}>
        <UnicodeSlider label="texture scale" value={localScale} onChange={setLocalScale}
          min={30} max={300} step={5} tooltip="Pattern zoom on the blade." />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// VECTOR section with SVG preview + settings
// ═══════════════════════════════════════════
function VectorSection({ recipe, textureScale, vecSettings, setVecSettings, onSaveSVG }) {
  const [svgContent, setSvgContent] = useState('');
  const [genTime, setGenTime] = useState(null);

  useEffect(() => {
    const tid = setTimeout(() => {
      const t0 = performance.now();
      const svg = generateSVG({ ...recipe, patternScale: textureScale / 100 }, 1920, 768, vecSettings);
      setGenTime(((performance.now() - t0) / 1000).toFixed(1));
      setSvgContent(svg);
    }, 200);
    return () => clearTimeout(tid);
  }, [recipe, textureScale, vecSettings]);

  const svgUrl = svgContent ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}` : '';
  const sizeKB = svgContent ? (new Blob([svgContent]).size / 1024).toFixed(0) : 0;

  const deformStr = recipe.deformations.length === 0 ? 'wild' : recipe.deformations.map(d => d.type).join(' + ');

  return (
    <div style={{ padding: '16px 24px' }}>
      <div style={{ ...sectionHeader, marginTop: 0 }}>SVG VECTOR PREVIEW</div>

      {/* Preview */}
      <div style={{ border: `1px solid ${T.border}`, background: '#050505', marginBottom: 8 }}>
        {svgUrl && <img src={svgUrl} alt="SVG preview" style={{ width: '100%', display: 'block' }} />}
      </div>

      {/* Info strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 10, fontFamily: 'monospace' }}>
        <div style={{ color: T.textDim }}>
          {deformStr} &middot; {recipe.layers.alloy} &middot; s{recipe.seed}
          &middot; {sizeKB}KB{genTime ? ` \u00B7 ${genTime}s` : ''}
        </div>
        <button style={btnStyle(true)} onClick={onSaveSVG}>SVG &darr; EXPORT</button>
      </div>

      {/* Blender note */}
      <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.6, marginBottom: 16, maxWidth: 600 }}>
        <strong style={{ color: T.textPrim }}>For Blender:</strong> Import the SVG directly.
        Recipe metadata is embedded in {'<desc>'} for reproducibility.
        Use alongside diffuse/normal/roughness texture maps for PBR materials.
      </div>

      {/* Settings */}
      <div style={sectionHeader}>VECTOR SETTINGS</div>
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
  );
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
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          DAMASCUS FORGE
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
          { id: 'ha', label: '\u5203', sub: 'blade shapes' },
          { id: 'about', label: 'ABOUT', sub: 'sources \u00B7 research' },
          { id: 'anatomy', label: 'ANATOMY', sub: 'blade reference', href: 'blade-anatomy.html' },
        ].map(t => t.href ? (
          <a key={t.id} href={t.href} style={{
            ...tabStyle(false),
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
            padding: '8px 16px', textDecoration: 'none',
          }}>
            <span>{t.label}</span>
            <span style={{ fontSize: 8, color: T.textDim, letterSpacing: '0.02em', textTransform: 'none' }}>{t.sub}</span>
          </a>
        ) : (
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

            {/* Pattern info line */}
            <div style={{
              padding: '6px 24px', fontSize: 9, color: T.textDim, fontFamily: 'monospace',
              letterSpacing: '0.05em', borderBottom: `1px solid ${T.border}`,
            }}>
              {deformStr} &middot; {recipe.layers.alloy} &middot; {recipe.layers.count} layers &middot; seed {recipe.seed}
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
          <VectorSection recipe={recipe} textureScale={textureScale}
            vecSettings={vecSettings} setVecSettings={setVecSettings}
            onSaveSVG={handleSaveSVG} />
        )}

        {/* ─── 刃 ─── */}
        {section === 'ha' && (
          <HaSection recipe={recipe} textureScale={textureScale} vecSettings={vecSettings} />
        )}

        {/* ─── ABOUT ─── */}
        {section === 'about' && (
          <div style={{ padding: '24px' }}>
            <About />
            <div style={{ marginTop: 16 }}>
              <a href="v1.html" style={{ color: T.textDim, borderBottom: `1px solid ${T.border}`, textDecoration: 'none', fontSize: 10, fontFamily: 'monospace' }}>
                Classic editor (v1) with full pattern controls
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

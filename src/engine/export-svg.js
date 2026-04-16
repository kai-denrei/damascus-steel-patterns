// Export damascus pattern as SVG with color gradient via widely-spaced isolines
//
// Key insight: artifacts came from closely-spaced threshold levels interfering.
// Fix: use 5-6 levels at 20% spacing — contours are far enough apart that
// smoothing can't make them cross. feGaussianBlur softens band transitions.
//
// Uses the proven extractContours pipeline (padding + box filter + subsample).

import { buildPerm } from './noise.js';
import { ALLOYS } from './alloys.js';
import { sampleLayerField } from './sample.js';
import { sig } from './shade.js';
import { extractContours } from './contour.js';

const DEFAULTS = { levels: 6, detail: 2, smoothing: 3, grain: 50, vignette: 30, colorVariation: 50, minSize: 30, blur: 3 };

function seededRand(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

// Convert polyline to SVG path using relative cubic Bezier
function polyToPath(points) {
  const n = points.length;
  if (n < 2) return '';
  const closed = Math.abs(points[0][0] - points[n - 1][0]) < 2 &&
                 Math.abs(points[0][1] - points[n - 1][1]) < 2;

  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  if (n === 2) {
    d += `l${(points[1][0] - points[0][0]).toFixed(1)},${(points[1][1] - points[0][1]).toFixed(1)}`;
    return closed ? d + 'z' : d;
  }

  const get = closed
    ? (i) => points[((i % n) + n) % n]
    : (i) => points[Math.max(0, Math.min(n - 1, i))];

  const T = 0.3;
  const count = closed ? n : n - 1;
  let cx = points[0][0], cy = points[0][1];

  for (let i = 0; i < count; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) * T;
    const c1y = p1[1] + (p2[1] - p0[1]) * T;
    const c2x = p2[0] - (p3[0] - p1[0]) * T;
    const c2y = p2[1] - (p3[1] - p1[1]) * T;
    d += `c${(c1x-cx).toFixed(1)},${(c1y-cy).toFixed(1)},${(c2x-cx).toFixed(1)},${(c2y-cy).toFixed(1)},${(p2[0]-cx).toFixed(1)},${(p2[1]-cy).toFixed(1)}`;
    cx = p2[0]; cy = p2[1];
  }
  return closed ? d + 'z' : d;
}

export function generateSVG(recipe, width = 1920, height = 768, settings = {}) {
  const opts = { ...DEFAULTS, ...settings };
  const perm = buildPerm(recipe.seed);
  const alloy = ALLOYS[recipe.layers.alloy];
  const rand = seededRand(recipe.seed + 7919);

  // Grid must resolve the layer structure: ≥ 4 samples per layer cycle.
  // Also scale with detail slider. Cap at 1600×640 for sanity.
  const minH = Math.max(128, recipe.layers.count * 4);
  const baseH = Math.max(minH, 128 * opts.detail);
  const gH = Math.min(640, baseH);
  const gW = Math.min(1600, Math.round(gH * 2.5));

  // Sample material field
  const matField = new Float32Array(gW * gH);
  for (let gy = 0; gy < gH; gy++) {
    for (let gx = 0; gx < gW; gx++) {
      const bx = (gx + 0.5) / gW;
      const by = (gy + 0.5) / gH;
      const bz = recipe.crossSection.depth + bx * Math.tan(recipe.crossSection.angle) * 0.35;
      const t = sampleLayerField(perm, bx, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      matField[gy * gW + gx] = sig(t, alloy.sh);
    }
  }

  // Scale levels down for complex patterns to keep file size reasonable.
  // High layer counts produce many contour lines per level — 20 levels × 96 layers = huge SVG.
  // Budget: ~500 contour lines total. Each layer produces ~2 contours per level.
  const maxLevels = Math.max(3, Math.min(opts.levels, Math.floor(300 / Math.max(1, recipe.layers.count))));
  const NUM = Math.max(2, Math.min(20, maxLevels));
  const dark = alloy.dark;
  const bright = alloy.bright;
  const variationScale = opts.colorVariation / 50;

  // Background: darkest
  let pathElements = '';

  // Stack levels from lowest threshold up — each overpaints previous
  for (let li = 0; li < NUM; li++) {
    // Thresholds widely spaced: e.g. for 6 levels → 0.083, 0.25, 0.417, 0.583, 0.75, 0.917
    const threshold = (li + 0.5) / NUM;

    const compactness = opts.fixAnomalies ? 0.01 : 0;
    const contours = extractContours(matField, gH, gW, threshold, width, height, opts.smoothing, opts.minSize, compactness);
    if (contours.length === 0) continue;

    // Color for this level
    const v = (rand() - 0.5) * 2 * variationScale * 6;
    const r = Math.max(0, Math.min(255, Math.round(dark[0] + (bright[0] - dark[0]) * threshold + v)));
    const g = Math.max(0, Math.min(255, Math.round(dark[1] + (bright[1] - dark[1]) * threshold + v)));
    const b = Math.max(0, Math.min(255, Math.round(dark[2] + (bright[2] - dark[2]) * threshold + v)));

    const parts = contours.map(pl => polyToPath(pl)).filter(Boolean);
    if (parts.length === 0) continue;

    pathElements += `<path d="${parts.join('')}" fill="rgb(${r},${g},${b})" fill-rule="evenodd"/>\n`;
  }

  // SVG filters
  const blurRadius = opts.blur || 0;
  const grainFreq = (0.4 + opts.grain * 0.01).toFixed(2);
  const vigOpacity = (opts.vignette / 100).toFixed(2);
  const useBlur = blurRadius > 0;
  const useGrain = opts.grain > 0;
  const useVignette = opts.vignette > 0;

  let defs = '<defs>\n';
  if (useBlur || useGrain) {
    defs += '<filter id="fx" x="-2%" y="-2%" width="104%" height="104%">\n';
    if (useBlur && useGrain) {
      // Blur first, then multiply with grain
      defs += `<feGaussianBlur in="SourceGraphic" stdDeviation="${blurRadius}" result="blurred"/>\n`;
      defs += `<feTurbulence type="fractalNoise" baseFrequency="${grainFreq}" numOctaves="3" seed="${recipe.seed}" result="n"/>\n`;
      defs += '<feColorMatrix type="saturate" values="0" in="n" result="gn"/>\n';
      defs += '<feBlend mode="multiply" in="blurred" in2="gn"/>\n';
    } else if (useBlur) {
      defs += `<feGaussianBlur in="SourceGraphic" stdDeviation="${blurRadius}"/>\n`;
    } else {
      // Grain only
      defs += `<feTurbulence type="fractalNoise" baseFrequency="${grainFreq}" numOctaves="3" seed="${recipe.seed}" result="n"/>\n`;
      defs += '<feColorMatrix type="saturate" values="0" in="n" result="gn"/>\n';
      defs += '<feBlend mode="multiply" in="SourceGraphic" in2="gn"/>\n';
    }
    defs += '</filter>\n';
  }
  if (useVignette) {
    defs += `<radialGradient id="v" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${vigOpacity}"/></radialGradient>\n`;
  }
  defs += '</defs>';

  const filterAttr = (useBlur || useGrain) ? ' filter="url(#fx)"' : '';
  const recipeStr = JSON.stringify(recipe).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<desc>${recipeStr}</desc>
${defs}
<g${filterAttr}>
<rect width="${width}" height="${height}" fill="rgb(${dark[0]},${dark[1]},${dark[2]})"/>
${pathElements}</g>${useVignette ? `\n<rect width="${width}" height="${height}" fill="url(#v)"/>` : ''}
</svg>`;
}

export function downloadSVG(recipe, width, height, settings) {
  const svg = generateSVG(recipe, width, height, settings);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `damascus_${recipe.pattern}_s${recipe.seed}.svg`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

// Export damascus pattern as SVG with multi-threshold color gradient contours
//
// Pipeline:
//   1. Sample material field on grid (continuous values 0–1)
//   2. Extract contours at N threshold levels (topographic approach)
//   3. Stack filled contour bands bottom-up: each level overpaints previous
//   4. Catmull-Rom → cubic Bezier for smooth curves
//   5. SVG feTurbulence filter for resolution-independent grain
//   6. Radial gradient vignette overlay

import { buildPerm } from './noise.js';
import { ALLOYS } from './alloys.js';
import { sampleLayerField } from './sample.js';
import { sig } from './shade.js';
import { extractContours } from './contour.js';

// Seeded RNG for per-band color variation
function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s >>> 0) / 0x100000000;
  };
}

// Convert polyline to SVG cubic Bezier path
function polylineToBezierPath(points) {
  if (points.length < 2) return '';
  const n = points.length;

  const dx = points[0][0] - points[n - 1][0];
  const dy = points[0][1] - points[n - 1][1];
  const closed = Math.abs(dx) < 2 && Math.abs(dy) < 2;

  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;

  if (n === 2) {
    d += `L${points[1][0].toFixed(2)},${points[1][1].toFixed(2)}`;
    return closed ? d + 'Z' : d;
  }

  const get = closed
    ? (i) => points[((i % n) + n) % n]
    : (i) => points[Math.max(0, Math.min(n - 1, i))];

  const T = 0.3;
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) * T;
    const c1y = p1[1] + (p2[1] - p0[1]) * T;
    const c2x = p2[0] - (p3[0] - p1[0]) * T;
    const c2y = p2[1] - (p3[1] - p1[1]) * T;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)},${c2x.toFixed(2)},${c2y.toFixed(2)},${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }

  return closed ? d + 'Z' : d;
}

// Interpolate color between dark and bright with optional variation
function bandColor(dark, bright, t, variation) {
  return [0, 1, 2].map(c => {
    const base = dark[c] + (bright[c] - dark[c]) * t;
    return Math.max(0, Math.min(255, Math.round(base + variation * 6)));
  });
}

export function generateSVG(recipe, width = 1920, height = 768) {
  const perm = buildPerm(recipe.seed);
  const alloy = ALLOYS[recipe.layers.alloy];
  const rand = seededRand(recipe.seed + 7919); // offset seed for color variation

  const gW = 640;
  const gH = 256;

  // Sample the raw layer field (pre-sigmoid) for multi-threshold extraction
  const rawField = new Float32Array(gW * gH);
  for (let gy = 0; gy < gH; gy++) {
    for (let gx = 0; gx < gW; gx++) {
      const bx = (gx + 0.5) / gW;
      const by = (gy + 0.5) / gH;
      const bz = recipe.crossSection.depth + bx * Math.tan(recipe.crossSection.angle) * 0.35;
      const t = sampleLayerField(perm, bx, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      // Apply sigmoid to get material value 0–1
      rawField[gy * gW + gx] = sig(t, alloy.sh);
    }
  }

  // Multi-threshold contour extraction
  // More levels = smoother gradient. 10 levels gives good visual quality.
  const NUM_LEVELS = 10;
  const thresholds = [];
  for (let i = 0; i < NUM_LEVELS; i++) {
    thresholds.push((i + 0.5) / NUM_LEVELS); // 0.05, 0.15, ..., 0.95
  }

  // Extract contours at each threshold level
  const levels = thresholds.map(threshold => ({
    threshold,
    contours: extractContours(rawField, gH, gW, threshold, width, height),
  }));

  // Build SVG
  const recipeStr = JSON.stringify(recipe)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const darkRGB = alloy.dark;
  const brightRGB = alloy.bright;

  // Background: darkest color
  const bgColor = bandColor(darkRGB, brightRGB, 0, 0);

  let pathElements = '';

  // Stack levels bottom-up: each overwrites previous, building gradient
  for (let li = 0; li < levels.length; li++) {
    const { threshold, contours } = levels[li];
    if (contours.length === 0) continue;

    // Color for this level — interpolated with seeded variation
    const variation = (rand() - 0.5) * 2; // ±1 range, scaled by 6 in bandColor
    const color = bandColor(darkRGB, brightRGB, threshold, variation);
    const rgb = `rgb(${color[0]},${color[1]},${color[2]})`;

    // Compound path for all contours at this level
    const parts = [];
    for (const pl of contours) {
      if (pl.length < 4) continue;
      const pathStr = polylineToBezierPath(pl);
      if (pathStr) parts.push(pathStr);
    }
    if (parts.length === 0) continue;

    pathElements += `<path d="${parts.join(' ')}" fill="${rgb}" fill-rule="evenodd" stroke="none"/>\n`;
  }

  // SVG filters for grain and vignette
  const filters = `
<defs>
  <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="${recipe.seed}" result="noise"/>
    <feColorMatrix type="saturate" values="0" in="noise" result="grey"/>
    <feBlend mode="multiply" in="SourceGraphic" in2="grey"/>
  </filter>
  <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
    <stop offset="0%" stop-color="white" stop-opacity="0"/>
    <stop offset="100%" stop-color="black" stop-opacity="0.3"/>
  </radialGradient>
</defs>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<desc>Damascus s${recipe.seed} ${recipe.pattern} | ${recipeStr}</desc>
${filters}
<g filter="url(#grain)">
<rect width="${width}" height="${height}" fill="rgb(${bgColor[0]},${bgColor[1]},${bgColor[2]})"/>
${pathElements}</g>
<rect width="${width}" height="${height}" fill="url(#vignette)"/>
</svg>`;
}

export function downloadSVG(recipe, width, height) {
  const svg = generateSVG(recipe, width, height);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `damascus_${recipe.pattern}_s${recipe.seed}.svg`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

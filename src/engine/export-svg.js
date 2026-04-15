// Export damascus pattern as SVG with isoband color gradients
//
// Isobands: non-overlapping band polygons between threshold pairs.
// No stacking interference — each band covers exactly its range.
// Smoothed with box filter, simplified with Visvalingam-Whyatt.
// SVG paths use relative coordinates for compact output.

import { buildPerm } from './noise.js';
import { ALLOYS } from './alloys.js';
import { sampleLayerField } from './sample.js';
import { sig } from './shade.js';
import { extractIsoband, chainIsobandSegments } from './isobands.js';
import { padField } from './contour.js';

const DEFAULTS = { levels: 8, detail: 3, smoothing: 3, grain: 50, vignette: 30, colorVariation: 50, minSize: 30 };

// Seeded RNG
function seededRand(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

// Smooth polyline coordinates with iterated box filter
function smoothPoly(points, radius, iterations) {
  const n = points.length;
  if (n < 3) return points;
  const closed = Math.abs(points[0][0] - points[n - 1][0]) < 1 &&
                 Math.abs(points[0][1] - points[n - 1][1]) < 1;
  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next = [];
    for (let i = 0; i < n; i++) {
      let sx = 0, sy = 0, count = 0;
      for (let j = -radius; j <= radius; j++) {
        const idx = closed ? ((i + j) % n + n) % n : Math.max(0, Math.min(n - 1, i + j));
        sx += pts[idx][0]; sy += pts[idx][1]; count++;
      }
      next.push([sx / count, sy / count]);
    }
    pts = next;
  }
  return pts;
}

// Visvalingam-Whyatt simplification — removes points by triangle area
function simplifyVW(points, minArea) {
  if (points.length <= 3) return points;
  const pts = points.map((p, i) => ({ x: p[0], y: p[1], idx: i, removed: false }));
  const n = pts.length;

  const triArea = (a, b, c) =>
    Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) * 0.5;

  // Compute initial areas
  const areas = new Float64Array(n);
  areas[0] = Infinity;
  areas[n - 1] = Infinity;
  for (let i = 1; i < n - 1; i++) areas[i] = triArea(pts[i - 1], pts[i], pts[i + 1]);

  // Iteratively remove point with smallest area
  let remaining = n;
  while (remaining > 3) {
    let minIdx = -1, minVal = Infinity;
    for (let i = 1; i < n - 1; i++) {
      if (pts[i].removed) continue;
      if (areas[i] < minVal) { minVal = areas[i]; minIdx = i; }
    }
    if (minIdx === -1 || minVal >= minArea) break;

    pts[minIdx].removed = true;
    remaining--;

    // Recompute neighbors
    let prev = minIdx - 1;
    while (prev >= 0 && pts[prev].removed) prev--;
    let next = minIdx + 1;
    while (next < n && pts[next].removed) next++;

    if (prev > 0) {
      let pp = prev - 1;
      while (pp >= 0 && pts[pp].removed) pp--;
      if (pp >= 0 && next < n) areas[prev] = triArea(pts[pp], pts[prev], pts[next]);
    }
    if (next < n - 1) {
      let nn = next + 1;
      while (nn < n && pts[nn].removed) nn++;
      if (nn < n && prev >= 0) areas[next] = triArea(pts[prev], pts[next], pts[nn]);
    }
  }

  return pts.filter(p => !p.removed).map(p => [p.x, p.y]);
}

// Polyline arc length
function polyLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

// Subsample every Kth point
function subsample(points, step) {
  if (points.length <= step * 2) return points;
  const result = [points[0]];
  for (let i = step; i < points.length - 1; i += step) result.push(points[i]);
  result.push(points[points.length - 1]);
  return result;
}

// Convert polyline to SVG path using relative cubic Bezier (compact)
function polyToRelBezier(points) {
  const n = points.length;
  if (n < 2) return '';
  const closed = Math.abs(points[0][0] - points[n - 1][0]) < 2 &&
                 Math.abs(points[0][1] - points[n - 1][1]) < 2;

  const P = 1; // decimal places
  let d = `M${points[0][0].toFixed(P)},${points[0][1].toFixed(P)}`;

  if (n === 2) {
    const dx = points[1][0] - points[0][0];
    const dy = points[1][1] - points[0][1];
    d += `l${dx.toFixed(P)},${dy.toFixed(P)}`;
    return closed ? d + 'z' : d;
  }

  const get = closed
    ? (i) => points[((i % n) + n) % n]
    : (i) => points[Math.max(0, Math.min(n - 1, i))];

  const T = 0.3;
  const count = closed ? n : n - 1;
  let curX = points[0][0], curY = points[0][1];

  for (let i = 0; i < count; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) * T;
    const c1y = p1[1] + (p2[1] - p0[1]) * T;
    const c2x = p2[0] - (p3[0] - p1[0]) * T;
    const c2y = p2[1] - (p3[1] - p1[1]) * T;
    // Relative offsets from current position
    d += `c${(c1x - curX).toFixed(P)},${(c1y - curY).toFixed(P)},${(c2x - curX).toFixed(P)},${(c2y - curY).toFixed(P)},${(p2[0] - curX).toFixed(P)},${(p2[1] - curY).toFixed(P)}`;
    curX = p2[0]; curY = p2[1];
  }

  return closed ? d + 'z' : d;
}

export function generateSVG(recipe, width = 1920, height = 768, settings = {}) {
  const opts = { ...DEFAULTS, ...settings };
  const perm = buildPerm(recipe.seed);
  const alloy = ALLOYS[recipe.layers.alloy];
  const rand = seededRand(recipe.seed + 7919);

  // Grid density from detail setting
  const gW = 320 * opts.detail;
  const gH = 128 * opts.detail;

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

  // Pad field so bands at edges are closed
  const { padded, padW, padH } = padField(matField, gH, gW);

  // Scale factors: padded grid coords → SVG coords (account for +1 padding offset)
  const sx = width / gW;
  const sy = height / gH;

  // Build isobands for each threshold pair
  const NUM = opts.levels;
  const dark = alloy.dark;
  const bright = alloy.bright;
  const variationScale = opts.colorVariation / 50;

  // Background
  const bgR = dark[0], bgG = dark[1], bgB = dark[2];
  let pathElements = '';

  for (let li = 0; li < NUM; li++) {
    const lo = li / NUM;
    const hi = (li + 1) / NUM;
    const midT = (lo + hi) / 2;

    // Extract isoband on padded field
    const rawSegments = extractIsoband(padded, padH, padW, lo, hi);
    const polygons = chainIsobandSegments(rawSegments, 0.01);

    // Process polygons: shift, scale, smooth, simplify, filter
    const processed = polygons
      .map(poly => {
        // Shift from padded coords, scale to SVG
        let pts = poly.map(([x, y]) => [(x - 1) * sx, (y - 1) * sy]);
        // Smooth
        pts = smoothPoly(pts, opts.smoothing, 2);
        // Subsample
        pts = subsample(pts, 2);
        // Visvalingam-Whyatt simplification (area threshold in SVG px²)
        pts = simplifyVW(pts, 2.0);
        return pts;
      })
      .filter(pts => pts.length >= 3)
      .filter(pts => polyLength(pts) >= opts.minSize);

    if (processed.length === 0) continue;

    // Band color with seeded variation
    const v = (rand() - 0.5) * 2 * variationScale * 6;
    const r = Math.max(0, Math.min(255, Math.round(dark[0] + (bright[0] - dark[0]) * midT + v)));
    const g = Math.max(0, Math.min(255, Math.round(dark[1] + (bright[1] - dark[1]) * midT + v)));
    const b = Math.max(0, Math.min(255, Math.round(dark[2] + (bright[2] - dark[2]) * midT + v)));

    // Compound path for this band
    const pathData = processed.map(pts => polyToRelBezier(pts)).filter(Boolean).join('');
    if (pathData) {
      pathElements += `<path d="${pathData}" fill="rgb(${r},${g},${b})" fill-rule="evenodd"/>\n`;
    }
  }

  // SVG filters
  const grainFreq = (0.4 + opts.grain * 0.01).toFixed(2);
  const vigOpacity = (opts.vignette / 100).toFixed(2);
  const useGrain = opts.grain > 0;
  const useVignette = opts.vignette > 0;

  let defs = '<defs>\n';
  if (useGrain) {
    defs += `<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${grainFreq}" numOctaves="3" seed="${recipe.seed}"/><feColorMatrix type="saturate" values="0"/><feComposite operator="in" in2="SourceGraphic"/><feBlend mode="multiply" in="SourceGraphic"/></filter>\n`;
  }
  if (useVignette) {
    defs += `<radialGradient id="v" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${vigOpacity}"/></radialGradient>\n`;
  }
  defs += '</defs>';

  const recipeStr = JSON.stringify(recipe).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<desc>${recipeStr}</desc>
${defs}
<g${useGrain ? ' filter="url(#g)"' : ''}>
<rect width="${width}" height="${height}" fill="rgb(${bgR},${bgG},${bgB})"/>
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

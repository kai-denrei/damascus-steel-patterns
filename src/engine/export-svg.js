// Export damascus pattern as SVG with smooth cubic Bezier contour paths
//
// Pipeline:
//   1. Sample material field on grid
//   2. Pad grid with zeros → forces all contours closed
//   3. Marching squares → chain → Chaikin smooth
//   4. Catmull-Rom → cubic Bezier for SVG path output
//   5. Even-odd fill: dark background + bright compound path

import { buildPerm } from './noise.js';
import { ALLOYS } from './alloys.js';
import { sampleLayerField } from './sample.js';
import { sig } from './shade.js';
import { extractContours } from './contour.js';

// Convert polyline to SVG path with Catmull-Rom → cubic Bezier curves
function polylineToBezierPath(points) {
  if (points.length < 2) return '';
  const n = points.length;

  // Check if closed
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

  const T = 0.3; // Catmull-Rom tension

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

export function generateSVG(recipe, width = 1920, height = 768) {
  const perm = buildPerm(recipe.seed);
  const alloy = ALLOYS[recipe.layers.alloy];

  // Fine grid — raw marching squares polyline is smooth since the noise field is smooth.
  // Bezier conversion handles the rest.
  const gW = 640;
  const gH = 256;
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

  // Extract contours — padding forces all contours closed
  const contours = extractContours(matField, gH, gW, 0.5, width, height);

  // Build compound fill path (all contours as subpaths, one <path> element)
  const fillParts = [];
  const strokeParts = [];

  for (const pl of contours) {
    if (pl.length < 4) continue;
    const pathStr = polylineToBezierPath(pl);
    if (pathStr) {
      fillParts.push(pathStr);
      strokeParts.push(pathStr);
    }
  }

  const fillPathData = fillParts.join(' ');
  const strokePathData = strokeParts.join(' ');

  const darkRGB = `rgb(${alloy.dark.join(',')})`;
  const brightRGB = `rgb(${alloy.bright.join(',')})`;

  // Recipe metadata (compact)
  const recipeStr = JSON.stringify(recipe)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<desc>Damascus s${recipe.seed} ${recipe.pattern} | ${recipeStr}</desc>
<rect width="${width}" height="${height}" fill="${darkRGB}"/>
<path d="${fillPathData}" fill="${brightRGB}" fill-rule="evenodd" stroke="none"/>
<path d="${strokePathData}" fill="none" stroke="${darkRGB}" stroke-width="0.6" stroke-opacity="0.2"/>
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

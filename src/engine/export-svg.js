// Export damascus pattern as SVG with smooth Bezier contour paths
//
// Uses the same pipeline as vector renderer:
//   field sampling → marching squares → Chaikin smooth → SVG <path>
//
// Output: standalone SVG string with:
//   - Dark alloy background rect
//   - Bright alloy fill paths (even-odd)
//   - Contour stroke paths for edge definition
//   - Recipe metadata in SVG <desc>

import { buildPerm } from './noise.js';
import { ALLOYS } from './alloys.js';
import { sampleLayerField } from './sample.js';
import { sig } from './shade.js';
import { marchingSquares, chainSegments, smoothChaikin } from './contour.js';

// Convert a polyline to an SVG path string with smooth cubic Bezier curves
// Uses Catmull-Rom → cubic Bezier conversion for C1-continuous curves
function polylineToCubicPath(points, closed) {
  if (points.length < 2) return '';

  const n = points.length;
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;

  if (points.length === 2) {
    d += ` L ${points[1][0].toFixed(2)} ${points[1][1].toFixed(2)}`;
    if (closed) d += ' Z';
    return d;
  }

  // Convert Catmull-Rom control points to cubic Bezier segments
  // For a smooth closed curve, we need to wrap around
  const getPoint = (i) => {
    if (closed) return points[((i % n) + n) % n];
    return points[Math.max(0, Math.min(n - 1, i))];
  };

  const tension = 0.35; // lower = smoother curves

  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = getPoint(i - 1);
    const p1 = getPoint(i);
    const p2 = getPoint(i + 1);
    const p3 = getPoint(i + 2);

    // Control points from Catmull-Rom tangents
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }

  if (closed) d += ' Z';
  return d;
}

export function generateSVG(recipe, width = 1920, height = 768) {
  const perm = buildPerm(recipe.seed);
  const alloy = ALLOYS[recipe.layers.alloy];

  // Sample material field on grid
  // Higher density for SVG since it will be viewed at any zoom
  const gW = Math.ceil(width * 0.4);
  const gH = Math.ceil(height * 0.4);
  const matField = new Float32Array(gW * gH);

  for (let gy = 0; gy < gH; gy++) {
    for (let gx = 0; gx < gW; gx++) {
      const bx = gx / gW;
      const by = gy / gH;
      const bz = recipe.crossSection.depth + bx * Math.tan(recipe.crossSection.angle) * 0.35;
      const t = sampleLayerField(perm, bx, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      matField[gy * gW + gx] = sig(t, alloy.sh);
    }
  }

  // Extract contours
  const segments = marchingSquares(matField, gH, gW, 0.5);
  const polylines = chainSegments(segments, 0.01);
  const smoothed = polylines.map(pl => smoothChaikin(pl, 3));

  // Scale to SVG coordinates
  const sx = width / gW;
  const sy = height / gH;
  const scaled = smoothed.map(pl => pl.map(([x, y]) => [x * sx, y * sy]));

  // Build SVG
  const darkRGB = `rgb(${alloy.dark.join(',')})`;
  const brightRGB = `rgb(${alloy.bright.join(',')})`;

  // Separate closed and open contours
  const closedPaths = [];
  const openPaths = [];

  for (const pl of scaled) {
    if (pl.length < 4) continue;
    const dx = Math.abs(pl[0][0] - pl[pl.length - 1][0]);
    const dy = Math.abs(pl[0][1] - pl[pl.length - 1][1]);
    const isClosed = dx < sx * 3 && dy < sy * 3;

    if (isClosed) {
      closedPaths.push(polylineToCubicPath(pl, true));
    } else {
      openPaths.push(polylineToCubicPath(pl, false));
    }
  }

  // Combine closed paths into one compound fill path (even-odd)
  const fillPathData = closedPaths.join(' ');

  // Recipe metadata
  const recipeJSON = JSON.stringify(recipe, null, 2)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <desc>Damascus Steel Pattern — seed: ${recipe.seed}, pattern: ${recipe.pattern}
Recipe:
${recipeJSON}
  </desc>

  <!-- Background: dark alloy -->
  <rect width="${width}" height="${height}" fill="${darkRGB}"/>

  <!-- Layer regions: bright alloy (even-odd fill for nested contours) -->
  <path d="${fillPathData}" fill="${brightRGB}" fill-rule="evenodd" stroke="none"/>

  <!-- Contour edges (subtle) -->
  <g stroke="${darkRGB}" stroke-width="0.5" stroke-opacity="0.3" fill="none">
    ${closedPaths.map(d => `<path d="${d}"/>`).join('\n    ')}
    ${openPaths.map(d => `<path d="${d}"/>`).join('\n    ')}
  </g>
</svg>`;

  return svg;
}

export function downloadSVG(recipe) {
  const svg = generateSVG(recipe);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `damascus_${recipe.pattern}_s${recipe.seed}.svg`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

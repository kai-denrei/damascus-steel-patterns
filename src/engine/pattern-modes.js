// Pattern Mode System — physics-grounded Damascus pattern generators
//
// Each mode is a field sampler: (bx, by, params) → t ∈ [0,1]
// t is then passed through the existing sigmoid → shade pipeline.
// This means alloy colors, bump map, SVG export, etc. all work unchanged.
//
// Modes:
//   organic  — existing Perlin domain-warp (delegated to sampleLayerField)
//   twist    — sinusoidal bands from helical layer geometry
//   feather  — V-fold chevron from bilateral fold operation
//   ladder   — periodic Gaussian groove indentations
//   heart    — arched bilateral parabolas + V-base + weld seam
//   raindrop — circular Gaussian indentations in a grid

import { n3, fbm } from './noise.js';

// ═══════════════════════════════════════════
// TWIST — OP-3: Billet twisted along length axis
// Cross-section of helical layers = sinusoidal bands
// ═══════════════════════════════════════════
export function sampleTwist(bx, by, params, perm) {
  const {
    layers = 24,
    turns = 3,
    grindDepth = 0.5,
    irregularity = 0.1,
  } = params;

  // Each layer i has boundary at normalized height i/layers.
  // After twist, at position bx along blade, the layer boundary
  // at height h appears at: h + (grindDepth - 0.5) * cos(bx * turns * 2π)
  // We compute which layer the current (bx, by) point falls in.

  // Add slight noise for organic feel
  const noise = irregularity > 0
    ? fbm(perm, bx * 4, by * 4, 0, 3) * irregularity * 0.15
    : 0;

  const angle = bx * turns * Math.PI * 2;
  const offset = grindDepth * Math.cos(angle);
  const effectiveY = by - offset + noise;

  // Map to layer value (sawtooth 0→1 repeating)
  return (((effectiveY * layers) % 1) + 2) % 1;
}

// ═══════════════════════════════════════════
// FEATHER — OP-5: V/W chevron from bilateral fold
// Layers displaced by |x - center| creating V-shapes
// ═══════════════════════════════════════════
export function sampleFeather(bx, by, params, perm) {
  const {
    layers = 32,
    angle = 0.6,        // chevron steepness
    periods = 1,        // 1 = single feather, 2+ = repeating W
    offset = 0,         // phase offset
    irregularity = 0.1,
  } = params;

  const noise = irregularity > 0
    ? fbm(perm, bx * 3, by * 3, 0, 3) * irregularity * 0.1
    : 0;

  // V-fold: within each period, layers shift by |x - center|
  const period = 1.0 / periods;
  const localX = (((bx + offset) % period) + period) % period / period; // 0→1 in period
  const v = Math.abs(localX - 0.5) * 2; // 0 at peak, 1 at valley

  const foldedY = by + angle * v - angle * 0.5 + noise;

  return (((foldedY * layers) % 1) + 2) % 1;
}

// ═══════════════════════════════════════════
// LADDER — OP-4: Periodic groove indentations
// Gaussian deformation at regular intervals
// ═══════════════════════════════════════════
export function sampleLadder(bx, by, params, perm) {
  const {
    layers = 24,
    grooveCount = 6,    // number of grooves across the blade
    grooveDepth = 0.3,  // how deep each groove pushes
    grooveWidth = 0.06, // sigma of Gaussian
    irregularity = 0.1,
  } = params;

  const noise = irregularity > 0
    ? fbm(perm, bx * 4, by * 4, 0, 3) * irregularity * 0.08
    : 0;

  // Each groove at position xi pushes layers down proportional to
  // their distance from the surface: surface layers deform most
  let totalDisplacement = 0;
  const sigma2 = 2 * grooveWidth * grooveWidth;
  for (let i = 0; i < grooveCount; i++) {
    const xi = (i + 0.5) / grooveCount;
    const dist2 = (bx - xi) * (bx - xi);
    totalDisplacement += by * grooveDepth * Math.exp(-dist2 / sigma2);
  }

  const deformedY = by - totalDisplacement + noise;

  return (((deformedY * layers) % 1) + 2) % 1;
}

// ═══════════════════════════════════════════
// HEART — OP-5: Arched bilateral fold + V-base
// Parabolic layer arches, mirrored, with weld seam
// ═══════════════════════════════════════════
export function sampleHeart(bx, by, params, perm) {
  const {
    layers = 24,
    curvature = 0.45,   // arch height
    lobeWidth = 0.55,   // lobe spread
    vDepth = 0.3,       // bottom point depth
    seamSoftness = 0.15, // weld seam wobble
  } = params;

  // Center coordinates: bx ∈ [0,1] → nx ∈ [-1, 1]
  const nx = bx * 2 - 1;
  const ny = by;

  // Bilateral fold: work with absolute distance from center
  let halfX = Math.abs(nx) / lobeWidth;
  halfX = Math.min(halfX, 2); // clamp

  // Weld seam: add noise wobble at the center line
  if (seamSoftness > 0) {
    const seamNoise = n3(perm, 0, by * 8, 0) * seamSoftness * 0.1;
    halfX = Math.abs(nx + seamNoise) / lobeWidth;
  }

  // Arched layer: parabolic displacement
  // Higher curvature = more arched layers
  const archY = ny - curvature * halfX * halfX;

  // V-base: layers converge to a point at center-bottom
  const vShape = halfX * (1 - ny) * (1 - ny) * vDepth;
  const finalY = archY - vShape;

  return (((finalY * layers) % 1) + 2) % 1;
}

// ═══════════════════════════════════════════
// RAINDROP — OP-4: Circular Gaussian indentations
// Like ladder but radial instead of linear
// ═══════════════════════════════════════════
export function sampleRaindrop(bx, by, params, perm) {
  const {
    layers = 24,
    cols = 4,
    rows = 3,
    depth = 0.25,
    radius = 0.08,
    layout = 'hex',     // 'hex' | 'grid'
    irregularity = 0.1,
  } = params;

  const noise = irregularity > 0
    ? fbm(perm, bx * 3, by * 3, 0, 3) * irregularity * 0.06
    : 0;

  // Generate center positions
  let totalDisplacement = 0;
  const r2inv = 1 / (radius * radius);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let cx, cy;
      if (layout === 'hex') {
        cx = (c + (r % 2) * 0.5 + 0.5) / (cols + 0.5);
        cy = (r + 0.5) / rows;
      } else {
        cx = (c + 0.5) / cols;
        cy = (r + 0.5) / rows;
      }
      const dist2 = (bx - cx) * (bx - cx) + (by - cy) * (by - cy);
      totalDisplacement += by * depth * Math.exp(-dist2 * r2inv);
    }
  }

  const deformedY = by - totalDisplacement + noise;
  return (((deformedY * layers) % 1) + 2) % 1;
}

// ═══════════════════════════════════════════
// Mode registry — maps mode name to sampler function
// ═══════════════════════════════════════════
export const PATTERN_MODES = {
  organic: null, // uses existing sampleLayerField
  twist: sampleTwist,
  feather: sampleFeather,
  ladder: sampleLadder,
  heart: sampleHeart,
  raindrop: sampleRaindrop,
};

export const MODE_NAMES = Object.keys(PATTERN_MODES);

export const MODE_LABELS = {
  organic: 'Organic',
  twist: 'Twist',
  feather: 'Feather',
  ladder: 'Ladder',
  heart: 'Heart',
  raindrop: 'Raindrop',
};

// Default params per mode
export const MODE_DEFAULTS = {
  organic: {},
  twist: { layers: 24, turns: 3, grindDepth: 0.5, irregularity: 0.1 },
  feather: { layers: 32, angle: 0.6, periods: 1, offset: 0, irregularity: 0.1 },
  ladder: { layers: 24, grooveCount: 6, grooveDepth: 0.3, grooveWidth: 0.06, irregularity: 0.1 },
  heart: { layers: 24, curvature: 0.45, lobeWidth: 0.55, vDepth: 0.3, seamSoftness: 0.15 },
  raindrop: { layers: 24, cols: 4, rows: 3, depth: 0.25, radius: 0.08, layout: 'hex', irregularity: 0.1 },
};

// Slider definitions per mode (for UI generation)
export const MODE_SLIDERS = {
  organic: [], // uses existing forge controls
  twist: [
    { key: 'layers', label: 'layers', min: 4, max: 64, step: 1, tip: 'Layer count in the billet' },
    { key: 'turns', label: 'turns', min: 0.5, max: 10, step: 0.5, tip: 'Full rotations of the twist' },
    { key: 'grindDepth', label: 'grind', min: 0, max: 1, step: 0.05, tip: 'Depth of the grinding reveal' },
    { key: 'irregularity', label: 'noise', min: 0, max: 0.5, step: 0.05, tip: 'Organic irregularity from hammer' },
  ],
  feather: [
    { key: 'layers', label: 'layers', min: 8, max: 64, step: 1, tip: 'Layer count' },
    { key: 'angle', label: 'angle', min: 0.1, max: 1.2, step: 0.05, tip: 'Chevron steepness' },
    { key: 'periods', label: 'periods', min: 1, max: 6, step: 1, tip: '1 = single V, 2+ = repeating W' },
    { key: 'offset', label: 'offset', min: 0, max: 1, step: 0.05, tip: 'Phase offset along blade' },
    { key: 'irregularity', label: 'noise', min: 0, max: 0.5, step: 0.05, tip: 'Organic hammer noise' },
  ],
  ladder: [
    { key: 'layers', label: 'layers', min: 4, max: 64, step: 1, tip: 'Layer count' },
    { key: 'grooveCount', label: 'grooves', min: 2, max: 16, step: 1, tip: 'Number of groove indentations' },
    { key: 'grooveDepth', label: 'depth', min: 0.05, max: 0.6, step: 0.05, tip: 'Groove press depth' },
    { key: 'grooveWidth', label: 'width', min: 0.02, max: 0.15, step: 0.01, tip: 'Groove tool width (sigma)' },
    { key: 'irregularity', label: 'noise', min: 0, max: 0.5, step: 0.05, tip: 'Hammer irregularity' },
  ],
  heart: [
    { key: 'layers', label: 'layers', min: 8, max: 48, step: 1, tip: 'Layer count' },
    { key: 'curvature', label: 'arch', min: 0.1, max: 0.8, step: 0.05, tip: 'Lobe arch height' },
    { key: 'lobeWidth', label: 'lobe', min: 0.3, max: 0.9, step: 0.05, tip: 'Lobe spread width' },
    { key: 'vDepth', label: 'v-depth', min: 0, max: 0.6, step: 0.05, tip: 'Bottom point depth' },
    { key: 'seamSoftness', label: 'seam', min: 0, max: 0.4, step: 0.05, tip: 'Weld seam wobble' },
  ],
  raindrop: [
    { key: 'layers', label: 'layers', min: 4, max: 48, step: 1, tip: 'Layer count' },
    { key: 'cols', label: 'columns', min: 2, max: 8, step: 1, tip: 'Drops per row' },
    { key: 'rows', label: 'rows', min: 1, max: 6, step: 1, tip: 'Number of rows' },
    { key: 'depth', label: 'depth', min: 0.05, max: 0.5, step: 0.05, tip: 'Punch press depth' },
    { key: 'radius', label: 'radius', min: 0.03, max: 0.2, step: 0.01, tip: 'Punch tool radius' },
    { key: 'irregularity', label: 'noise', min: 0, max: 0.5, step: 0.05, tip: 'Hammer irregularity' },
  ],
};

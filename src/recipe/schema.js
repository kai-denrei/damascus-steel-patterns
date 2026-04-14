// Base canvas dimensions — resolution multiplier scales these
export const BASE_WIDTH = 640;
export const BASE_HEIGHT = 256;

export const DEFAULT_RECIPE = {
  version: 1,
  seed: 42,
  pattern: 'wild',
  resolution: 1,
  deformations: [],
  warp: {
    turbulence: 0.75,
    passes: 3,
    scale: 1.8,
    octaves: 5,
  },
  layers: {
    count: 32,
    alloy: '1095 + 15N20',
  },
  crossSection: {
    depth: 0.0,
    angle: 0.0,
  },
};

export const PARAM_RANGES = {
  seed:       { min: 0, max: 999999, step: 1 },
  passes:     { min: 1, max: 8, step: 1 },
  turbulence: { min: 0.1, max: 2.5, step: 0.05 },
  scale:      { min: 0.5, max: 5.0, step: 0.1 },
  octaves:    { min: 2, max: 7, step: 1 },
  count:      { min: 4, max: 128, step: 1 },
  depth:      { min: 0, max: 1.0, step: 0.01 },
  angle:      { min: 0, max: 1.4, step: 0.01 },
  'twist.rate':           { min: 0.5, max: 10.0, step: 0.1 },
  'twist.center.x':      { min: 0, max: 1, step: 0.01 },
  'twist.center.y':      { min: 0, max: 1, step: 0.01 },
  'ladder.frequency':     { min: 1, max: 20, step: 1 },
  'ladder.amplitude':     { min: 0.01, max: 0.5, step: 0.01 },
  'raindrop.count':       { min: 1, max: 30, step: 1 },
  'raindrop.radius':      { min: 0.02, max: 0.3, step: 0.01 },
  'raindrop.amplitude':   { min: 0.05, max: 0.8, step: 0.01 },
  'feather.frequency':    { min: 1, max: 12, step: 1 },
  'feather.amplitude':    { min: 0.01, max: 0.5, step: 0.01 },
  'feather.angle':        { min: 0, max: Math.PI, step: 0.01 },
};

export const TOOLTIPS = {
  passes:     'Number of forge welding passes. More passes = more accumulated deformation.',
  turbulence: 'Intensity of each hammer blow. Higher values = more chaotic layer distortion.',
  scale:      'Spatial frequency of the turbulent deformation field. Higher = finer grain chaos.',
  octaves:    'Layers of noise detail. More octaves = smaller-scale turbulent features.',
  count:      'Number of steel layers in the billet. Real billets range from ~30 to ~500.',
  depth:      'How deep into the billet the cross-section is taken. Reveals different layer geometry.',
  angle:      'Oblique grinding angle. Tilting the cut plane produces asymmetric patterns.',
  'twist.rate':         'Rotations per unit length. Higher = tighter spiral pattern.',
  'twist.center.x':    'Horizontal center of the twist axis.',
  'twist.center.y':    'Vertical center of the twist axis.',
  'ladder.frequency':   'Number of groove impressions across the billet width.',
  'ladder.amplitude':   'Depth of each groove pressing into the layers.',
  'ladder.profile':     'Groove shape: sine (smooth), step (sharp), rounded (soft shoulders).',
  'raindrop.count':     'Number of punch impressions in the billet surface.',
  'raindrop.radius':    'Size of each circular impression.',
  'raindrop.amplitude': 'Depth of each circular punch into the layers.',
  'raindrop.layout':    'Arrangement: hex (honeycomb), grid (regular), random (seeded).',
  'feather.frequency':  'Number of chevron peaks across the billet width.',
  'feather.amplitude':  'Depth of each chevron fold in the layers.',
  'feather.angle':      'Rotation of the chevron axis in radians.',
};

export function cloneRecipe(recipe) {
  return JSON.parse(JSON.stringify(recipe));
}

export function createRecipe(overrides = {}) {
  const base = cloneRecipe(DEFAULT_RECIPE);
  return {
    ...base,
    ...overrides,
    warp: { ...base.warp, ...(overrides.warp || {}) },
    layers: { ...base.layers, ...(overrides.layers || {}) },
    crossSection: { ...base.crossSection, ...(overrides.crossSection || {}) },
    deformations: overrides.deformations ? overrides.deformations.map(d => ({ ...d })) : base.deformations,
  };
}

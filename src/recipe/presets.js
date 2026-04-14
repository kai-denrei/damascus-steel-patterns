export const PRESET_DEFINITIONS = {
  wild: {
    pattern: 'wild',
    deformations: [],
  },
  twist: {
    pattern: 'twist',
    deformations: [
      { type: 'twist', rate: 3.0, center: [0.5, 0.5] },
    ],
  },
  ladder: {
    pattern: 'ladder',
    deformations: [
      { type: 'ladder', frequency: 6, amplitude: 0.15, profile: 'sine' },
    ],
  },
  raindrop: {
    pattern: 'raindrop',
    deformations: [
      { type: 'raindrop', count: 12, radius: 0.08, amplitude: 0.2, layout: 'hex' },
    ],
  },
  feather: {
    pattern: 'feather',
    deformations: [
      { type: 'feather', frequency: 4, amplitude: 0.18, angle: 0 },
    ],
  },
  'turkish-rose': {
    pattern: 'turkish-rose',
    deformations: [
      { type: 'twist', rate: 2.5, center: [0.5, 0.5] },
      { type: 'ladder', frequency: 5, amplitude: 0.12, profile: 'sine' },
    ],
  },
  star: {
    pattern: 'star',
    deformations: [
      { type: 'twist', rate: 3.0, center: [0.5, 0.5] },
      { type: 'raindrop', count: 8, radius: 0.08, amplitude: 0.2, layout: 'hex' },
    ],
  },
};

export const PRESET_NAMES = Object.keys(PRESET_DEFINITIONS);

export const PRESET_LABELS = {
  wild: 'Wild',
  twist: 'Twist',
  ladder: 'Ladder',
  raindrop: 'Raindrop',
  feather: 'Feather',
  'turkish-rose': 'Turkish Rose',
  star: 'Star',
};

// Apply a preset: replaces deformations + pattern name, preserves warp/layers/crossSection/seed
export function applyPreset(currentRecipe, presetName) {
  const def = PRESET_DEFINITIONS[presetName];
  if (!def) return currentRecipe;
  return {
    ...currentRecipe,
    pattern: def.pattern,
    deformations: def.deformations.map(d => ({
      ...d,
      center: d.center ? [...d.center] : undefined,
    })),
  };
}

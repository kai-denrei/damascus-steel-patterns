import { describe, it, expect } from 'vitest';
import { sampleLayerField } from '../../src/engine/sample.js';
import { buildPerm } from '../../src/engine/noise.js';

describe('sampleLayerField', () => {
  it('returns t in [0, 1]', () => {
    const perm = buildPerm(42);
    const warp = { turbulence: 0.75, passes: 3, scale: 1.8, octaves: 5 };
    for (let i = 0; i < 50; i++) {
      const t = sampleLayerField(perm, i * 0.02, i * 0.03, 0.0, warp, 32, []);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic', () => {
    const perm = buildPerm(42);
    const warp = { turbulence: 0.75, passes: 3, scale: 1.8, octaves: 5 };
    const a = sampleLayerField(perm, 0.5, 0.5, 0.0, warp, 32, []);
    const b = sampleLayerField(perm, 0.5, 0.5, 0.0, warp, 32, []);
    expect(a).toBe(b);
  });

  it('deformation stack changes result', () => {
    const perm = buildPerm(42);
    const warp = { turbulence: 0.75, passes: 3, scale: 1.8, octaves: 5 };
    const noStack = sampleLayerField(perm, 0.3, 0.7, 0.5, warp, 32, []);
    const withTwist = sampleLayerField(perm, 0.3, 0.7, 0.5, warp, 32, [
      { type: 'twist', rate: 3.0, center: [0.5, 0.5] }
    ]);
    expect(noStack).not.toBe(withTwist);
  });
});

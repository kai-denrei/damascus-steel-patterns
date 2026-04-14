import { describe, it, expect } from 'vitest';
import { sig, shadePixel } from '../../src/engine/shade.js';
import { buildPerm } from '../../src/engine/noise.js';

describe('sig', () => {
  it('returns 0.5 at t=0.5', () => {
    expect(sig(0.5, 30)).toBeCloseTo(0.5, 5);
  });

  it('returns near 0 at t=0', () => {
    expect(sig(0, 30)).toBeLessThan(0.01);
  });

  it('returns near 1 at t=1', () => {
    expect(sig(1, 30)).toBeGreaterThan(0.99);
  });

  it('lower sharpness gives softer transition', () => {
    const hard = sig(0.4, 30);
    const soft = sig(0.4, 10);
    expect(soft).toBeGreaterThan(hard);
  });
});

describe('shadePixel', () => {
  it('returns RGB array with values in [0, 255]', () => {
    const perm = buildPerm(42);
    const alloy = { dark: [16, 10, 6], bright: [224, 217, 204], sh: 30 };
    const rgb = shadePixel(0.5, 0.55, 0.52, 0.005, alloy, 100, 50, perm, 0.0);
    expect(rgb.length).toBe(3);
    rgb.forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(255);
    });
  });
});

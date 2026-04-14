import { describe, it, expect } from 'vitest';
import { lcgRand, lcgPositions } from '../../src/util/lcg.js';

describe('lcgRand', () => {
  it('returns value in [0, 1)', () => {
    let s = 42;
    for (let i = 0; i < 100; i++) {
      const [val, next] = lcgRand(s);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
      s = next;
    }
  });

  it('is deterministic', () => {
    const [a] = lcgRand(42);
    const [b] = lcgRand(42);
    expect(a).toBe(b);
  });
});

describe('lcgPositions', () => {
  it('returns correct number of [x, y] pairs', () => {
    const pts = lcgPositions(42, 10);
    expect(pts.length).toBe(10);
    pts.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(1);
    });
  });

  it('is deterministic', () => {
    const a = lcgPositions(42, 5);
    const b = lcgPositions(42, 5);
    expect(a).toEqual(b);
  });

  it('different seeds give different positions', () => {
    const a = lcgPositions(42, 5);
    const b = lcgPositions(99, 5);
    expect(a).not.toEqual(b);
  });
});

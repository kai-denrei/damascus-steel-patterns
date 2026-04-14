import { describe, it, expect } from 'vitest';
import { buildPerm, n3, fbm } from '../../src/engine/noise.js';

describe('buildPerm', () => {
  it('returns Uint8Array of length 512', () => {
    const p = buildPerm(42);
    expect(p).toBeInstanceOf(Uint8Array);
    expect(p.length).toBe(512);
  });

  it('is deterministic', () => {
    const a = buildPerm(42);
    const b = buildPerm(42);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('different seeds give different tables', () => {
    const a = buildPerm(42);
    const b = buildPerm(99);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it('first 256 entries mirror second 256', () => {
    const p = buildPerm(42);
    for (let i = 0; i < 256; i++) {
      expect(p[i]).toBe(p[i + 256]);
    }
  });
});

describe('n3', () => {
  it('returns value in [-1, 1] range', () => {
    const p = buildPerm(42);
    for (let i = 0; i < 100; i++) {
      const v = n3(p, i * 0.37, i * 0.53, i * 0.17);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic', () => {
    const p = buildPerm(42);
    const a = n3(p, 1.5, 2.7, 0.3);
    const b = n3(p, 1.5, 2.7, 0.3);
    expect(a).toBe(b);
  });
});

describe('fbm', () => {
  it('returns value approximately in [-1, 1]', () => {
    const p = buildPerm(42);
    for (let i = 0; i < 50; i++) {
      const v = fbm(p, i * 0.1, i * 0.2, 0, 5);
      expect(v).toBeGreaterThan(-2);
      expect(v).toBeLessThan(2);
    }
  });

  it('more octaves adds detail', () => {
    const p = buildPerm(42);
    const v3 = fbm(p, 1.23, 4.56, 0, 3);
    const v6 = fbm(p, 1.23, 4.56, 0, 6);
    expect(v3).not.toBe(v6);
  });
});

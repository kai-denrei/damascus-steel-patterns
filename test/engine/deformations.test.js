import { describe, it, expect } from 'vitest';
import { applyDeformation, applyDeformationStack } from '../../src/engine/deformations.js';
import { buildPerm } from '../../src/engine/noise.js';

describe('twist', () => {
  it('rotates coordinates around center', () => {
    const [bx, by, bz] = applyDeformation(
      0.7, 0.5, 1.0,
      { type: 'twist', rate: Math.PI, center: [0.5, 0.5] },
      null, 0
    );
    expect(bx).toBeCloseTo(0.3, 5);
    expect(by).toBeCloseTo(0.5, 5);
    expect(bz).toBe(1.0);
  });

  it('no rotation at bz=0', () => {
    const [bx, by] = applyDeformation(
      0.7, 0.5, 0.0,
      { type: 'twist', rate: 3.0, center: [0.5, 0.5] },
      null, 0
    );
    expect(bx).toBeCloseTo(0.7, 10);
    expect(by).toBeCloseTo(0.5, 10);
  });
});

describe('ladder', () => {
  it('displaces by in sine profile', () => {
    const [bx, by] = applyDeformation(
      0.25, 0.5, 0.0,
      { type: 'ladder', frequency: 1, amplitude: 0.1, profile: 'sine' },
      null, 0
    );
    expect(bx).toBeCloseTo(0.25, 10);
    expect(by).toBeCloseTo(0.6, 5);
  });

  it('step profile gives hard steps', () => {
    const [, by] = applyDeformation(
      0.1, 0.5, 0.0,
      { type: 'ladder', frequency: 1, amplitude: 0.1, profile: 'step' },
      null, 0
    );
    expect(by).toBeCloseTo(0.6, 5);
  });
});

describe('raindrop', () => {
  it('is deterministic with same seed', () => {
    const perm = buildPerm(42);
    const a = applyDeformation(0.3, 0.7, 0.0,
      { type: 'raindrop', count: 5, radius: 0.1, amplitude: 0.2, layout: 'random' },
      perm, 0
    );
    const b = applyDeformation(0.3, 0.7, 0.0,
      { type: 'raindrop', count: 5, radius: 0.1, amplitude: 0.2, layout: 'random' },
      perm, 0
    );
    expect(a).toEqual(b);
  });
});

describe('feather', () => {
  it('creates triangle wave displacement', () => {
    const [bx, by] = applyDeformation(
      0.5, 0.5, 0.0,
      { type: 'feather', frequency: 1, amplitude: 0.2, angle: 0 },
      null, 0
    );
    expect(bx).toBeCloseTo(0.5, 10);
    expect(by).toBeCloseTo(0.5, 5);
  });
});

describe('applyDeformationStack', () => {
  it('empty stack returns input unchanged', () => {
    const [bx, by, bz] = applyDeformationStack(0.3, 0.7, 0.2, [], null, 42);
    expect(bx).toBe(0.3);
    expect(by).toBe(0.7);
    expect(bz).toBe(0.2);
  });
});

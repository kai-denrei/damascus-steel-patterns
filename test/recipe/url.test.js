import { describe, it, expect } from 'vitest';
import { encodeRecipeToHash, decodeRecipeFromHash } from '../../src/recipe/url.js';
import { DEFAULT_RECIPE } from '../../src/recipe/schema.js';

describe('URL hash encoding', () => {
  it('roundtrips a recipe', () => {
    const hash = encodeRecipeToHash(DEFAULT_RECIPE);
    expect(hash).toMatch(/^#recipe=/);
    const decoded = decodeRecipeFromHash(hash);
    expect(decoded).toEqual(DEFAULT_RECIPE);
  });

  it('roundtrips recipe with deformations', () => {
    const recipe = {
      ...DEFAULT_RECIPE,
      deformations: [
        { type: 'twist', rate: 2.5, center: [0.5, 0.5] },
        { type: 'ladder', frequency: 6, amplitude: 0.12, profile: 'sine' },
      ],
    };
    const hash = encodeRecipeToHash(recipe);
    const decoded = decodeRecipeFromHash(hash);
    expect(decoded).toEqual(recipe);
  });

  it('returns null for invalid hash', () => {
    expect(decodeRecipeFromHash('')).toBeNull();
    expect(decodeRecipeFromHash('#foo=bar')).toBeNull();
    expect(decodeRecipeFromHash('#recipe=!!!invalid')).toBeNull();
  });
});

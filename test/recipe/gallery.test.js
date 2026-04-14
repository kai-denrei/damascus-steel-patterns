import { describe, it, expect, beforeEach } from 'vitest';
import { saveToGallery, loadGallery, deleteFromGallery } from '../../src/recipe/gallery.js';
import { DEFAULT_RECIPE } from '../../src/recipe/schema.js';

const storage = {};
const mockLocalStorage = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = value; },
  removeItem: (key) => { delete storage[key]; },
};

describe('gallery', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
  });

  it('saves and loads entries', () => {
    saveToGallery('Test Pattern', DEFAULT_RECIPE, 'data:image/png;base64,abc', mockLocalStorage);
    const entries = loadGallery(mockLocalStorage);
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe('Test Pattern');
    expect(entries[0].recipe).toEqual(DEFAULT_RECIPE);
    expect(entries[0].thumbnail).toBe('data:image/png;base64,abc');
  });

  it('deletes by id', () => {
    saveToGallery('A', DEFAULT_RECIPE, '', mockLocalStorage);
    saveToGallery('B', DEFAULT_RECIPE, '', mockLocalStorage);
    let entries = loadGallery(mockLocalStorage);
    expect(entries.length).toBe(2);
    deleteFromGallery(entries[0].id, mockLocalStorage);
    entries = loadGallery(mockLocalStorage);
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe('B');
  });

  it('returns empty array when no data', () => {
    expect(loadGallery(mockLocalStorage)).toEqual([]);
  });
});

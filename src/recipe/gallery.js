const STORAGE_KEY = 'damascus-gallery';

export function loadGallery(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveToGallery(name, recipe, thumbnail, storage = localStorage) {
  const entries = loadGallery(storage);
  entries.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    recipe,
    thumbnail,
    savedAt: Date.now(),
  });
  storage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function deleteFromGallery(id, storage = localStorage) {
  const entries = loadGallery(storage).filter(e => e.id !== id);
  storage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

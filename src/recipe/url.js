export function encodeRecipeToHash(recipe) {
  const json = JSON.stringify(recipe);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return '#recipe=' + encoded;
}

export function decodeRecipeFromHash(hash) {
  if (!hash || !hash.startsWith('#recipe=')) return null;
  try {
    const encoded = hash.slice('#recipe='.length);
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

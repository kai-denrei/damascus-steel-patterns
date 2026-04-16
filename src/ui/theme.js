// FORGE ROOM — Skin Tokens
// Industrial furnace instrument panel. Heat, mass, process.

export const T = {
  bgDeep:     '#0d0b09',
  bgPanel:    '#141210',
  bgPreview:  '#1a1714',
  border:     '#2e2925',
  textPrim:   '#c8b89a',  // warm bone
  textDim:    '#6b5e50',
  emberLow:   '#e8a020',  // yellow-amber
  emberMid:   '#d43a10',  // deep red-orange
  emberHot:   '#ffffff',  // white hot
  glowSoft:   'rgba(220,100,20,0.12)',
  glowHot:    'rgba(255,240,200,0.08)',
  trackEmpty: '#1e1a16',  // unlit iron
};

// Interpolate between ember colors based on normalized value (0–1)
export function emberColor(t) {
  if (t < 0.55) {
    // amber → red-orange
    const p = t / 0.55;
    return lerpRGB([232, 160, 32], [212, 58, 16], p);
  } else if (t < 0.80) {
    // red-orange → bright orange
    const p = (t - 0.55) / 0.25;
    return lerpRGB([212, 58, 16], [255, 106, 0], p);
  } else {
    // bright orange → white hot
    const p = (t - 0.80) / 0.20;
    return lerpRGB([255, 106, 0], [255, 255, 255], p);
  }
}

function lerpRGB(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

// CSS gradient string for slider fill (4-stop ember)
export const SLIDER_GRADIENT = 'linear-gradient(to right, #e8a020, #d43a10 55%, #ff6a00 80%, #ffffff 100%)';

// Standard button style
export const btnStyle = (active = false) => ({
  padding: '4px 10px',
  fontSize: 10,
  letterSpacing: '0.08em',
  border: `1px solid ${active ? T.emberLow : T.border}`,
  background: active ? 'rgba(232,160,32,0.08)' : 'transparent',
  color: active ? T.emberLow : T.textDim,
  cursor: 'pointer',
  fontFamily: 'monospace',
  textTransform: 'uppercase',
  borderRadius: 1,
  transition: 'border-color 0.15s, color 0.15s',
});

// Tab style
export const tabStyle = (active) => ({
  padding: '6px 16px',
  fontSize: 10,
  letterSpacing: '0.08em',
  fontFamily: 'monospace',
  textTransform: 'uppercase',
  background: 'transparent',
  border: 'none',
  borderBottom: active ? `1px solid ${T.emberLow}` : '1px solid transparent',
  color: active ? T.textPrim : T.textDim,
  cursor: 'pointer',
  transition: 'color 0.15s, border-color 0.15s',
});

// Section header
export const sectionHeader = {
  fontSize: 10,
  color: T.textDim,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  borderBottom: `1px solid ${T.border}`,
  paddingBottom: 4,
  fontFamily: 'monospace',
  marginBottom: 6,
};

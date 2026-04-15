import { PRESET_NAMES, PRESET_LABELS } from '../recipe/presets.js';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

const btn = {
  padding: '4px 10px',
  fontSize: 10,
  letterSpacing: '0.1em',
  border: `1px solid ${C.dim}`,
  background: 'transparent',
  color: C.muted,
  cursor: 'pointer',
  fontFamily: 'monospace',
};

const RESOLUTIONS = [
  { value: 1, label: '1\u00D7 (640\u00D7256)' },
  { value: 2, label: '2\u00D7 (1280\u00D7512)' },
  { value: 4, label: '4\u00D7 (2560\u00D71024)' },
  { value: 8, label: '8\u00D7 (5120\u00D72048)' },
];

export default function Header({ recipe, onPresetChange, onSeedChange, onRandomSeed, onDownload, onCopyRecipe, onResolutionChange, onSupersampleChange }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderBottom: `1px solid ${C.border}`,
      paddingBottom: 10,
      flexWrap: 'wrap',
      gap: 8,
    }}>
      <div>
        <div style={{ fontSize: 13, color: C.amber, letterSpacing: '0.2em', fontFamily: 'monospace' }}>
          DAMASCUS PATTERN SIMULATOR
        </div>
        <div style={{ fontSize: 10, color: C.dim, marginTop: 2, fontFamily: 'monospace' }}>
          Composable Deformation Stack &middot; Perlin Domain Warp &middot; v1.0
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={recipe.pattern}
          onChange={e => onPresetChange(e.target.value)}
          style={{
            ...btn,
            background: '#111',
            color: C.text,
            padding: '3px 6px',
          }}
        >
          {PRESET_NAMES.map(name => (
            <option key={name} value={name}>{PRESET_LABELS[name] || name}</option>
          ))}
          {!PRESET_NAMES.includes(recipe.pattern) && (
            <option value={recipe.pattern}>{recipe.pattern}</option>
          )}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace' }}>seed</span>
          <input
            type="number"
            value={recipe.seed}
            min={0}
            max={999999}
            onChange={e => onSeedChange(parseInt(e.target.value, 10) || 0)}
            style={{
              background: '#111',
              border: `1px solid ${C.border}`,
              color: C.text,
              fontSize: 11,
              padding: '3px 6px',
              fontFamily: 'monospace',
              width: 72,
            }}
          />
        </div>
        <button style={btn} onClick={onRandomSeed}>RNG</button>
        {/* Resolution selector */}
        <select
          value={recipe.resolution || 1}
          onChange={e => onResolutionChange(parseInt(e.target.value, 10))}
          style={{
            ...btn,
            background: '#111',
            color: C.text,
            padding: '3px 6px',
          }}
        >
          {RESOLUTIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        {/* SSAA toggle */}
        <button
          style={{
            ...btn,
            color: recipe.supersample ? C.amber : C.dim,
            borderColor: recipe.supersample ? C.amber : C.dim,
          }}
          onClick={() => onSupersampleChange(!recipe.supersample)}
          title="2\u00D72 supersampling anti-aliasing — smoother layer edges, ~3\u00D7 slower"
        >
          SSAA
        </button>
        <button style={btn} onClick={onDownload}>PNG &darr;</button>
        <button style={btn} onClick={onCopyRecipe}>COPY RECIPE</button>
      </div>
    </div>
  );
}

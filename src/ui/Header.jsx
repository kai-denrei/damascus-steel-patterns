import { PRESET_NAMES, PRESET_LABELS } from '../recipe/presets.js';
import { T, btnStyle } from './theme.js';

const RESOLUTIONS = [
  { value: 1, label: '1\u00D7 (640\u00D7256)' },
  { value: 2, label: '2\u00D7 (1280\u00D7512)' },
  { value: 4, label: '4\u00D7 (2560\u00D71024)' },
  { value: 8, label: '8\u00D7 (5120\u00D72048)' },
];

export default function Header({ recipe, onPresetChange, onSeedChange, onRandomSeed, onDownload, onDownloadSVG, onCopyRecipe, onResolutionChange, onSupersampleChange, onVectorModeChange }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderBottom: `1px solid ${T.border}`,
      paddingBottom: 10,
      flexWrap: 'wrap',
      gap: 8,
    }}>
      <div>
        <div style={{
          fontSize: 14, color: T.textPrim, letterSpacing: '0.15em',
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
          textTransform: 'uppercase',
        }}>
          DAMASCUS PATTERN SIMULATOR
        </div>
        <div style={{
          fontSize: 10, color: T.textDim, marginTop: 2,
          fontFamily: 'monospace', letterSpacing: '0.05em',
        }}>
          Composable Deformation Stack &middot; Perlin Domain Warp &middot; v1.0.019
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={recipe.pattern}
          onChange={e => onPresetChange(e.target.value)}
          style={{
            ...btnStyle(),
            background: T.bgPanel,
            color: T.textPrim,
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
          <span style={{ fontSize: 10, color: T.textDim, fontFamily: 'monospace' }}>seed</span>
          <input
            type="number"
            value={recipe.seed}
            min={0}
            max={999999}
            onChange={e => onSeedChange(parseInt(e.target.value, 10) || 0)}
            style={{
              background: T.bgPanel,
              border: `1px solid ${T.border}`,
              color: T.textPrim,
              fontSize: 11,
              padding: '3px 6px',
              fontFamily: 'monospace',
              width: 72,
              borderRadius: 1,
            }}
          />
        </div>
        <button style={btnStyle()} onClick={onRandomSeed}>RNG</button>
        <select
          value={recipe.resolution || 1}
          onChange={e => onResolutionChange(parseInt(e.target.value, 10))}
          style={{
            ...btnStyle(),
            background: T.bgPanel,
            color: T.textPrim,
            padding: '3px 6px',
          }}
        >
          {RESOLUTIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <button
          style={btnStyle(recipe.vectorMode)}
          onClick={() => onVectorModeChange(!recipe.vectorMode)}
          title="Vector contour rendering"
        >VEC</button>
        <button
          style={btnStyle(recipe.supersample)}
          onClick={() => onSupersampleChange(!recipe.supersample)}
          title="2\u00D72 supersampling"
        >SSAA</button>
        <button style={btnStyle()} onClick={onDownload}>PNG &darr;</button>
        <button style={btnStyle()} onClick={onDownloadSVG}>SVG &darr;</button>
        <button style={btnStyle()} onClick={onCopyRecipe}>COPY RECIPE</button>
      </div>
    </div>
  );
}

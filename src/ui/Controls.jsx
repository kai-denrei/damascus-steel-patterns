import { useState } from 'react';
import Slider from './Slider.jsx';
import { ALLOY_NAMES } from '../engine/alloys.js';
import { PARAM_RANGES, TOOLTIPS } from '../recipe/schema.js';

const C = {
  amber: '#c8a040',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

const secTitle = {
  fontSize: 10,
  color: C.dim,
  letterSpacing: '0.15em',
  borderBottom: `1px solid ${C.border}`,
  paddingBottom: 4,
  fontFamily: 'monospace',
  marginBottom: 6,
};

const expandBtn = {
  fontSize: 10,
  color: C.dim,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'monospace',
  padding: '2px 0',
  textAlign: 'left',
};

export default function Controls({ recipe, onChange }) {
  const [forgeExpanded, setForgeExpanded] = useState(false);
  const [csExpanded, setCsExpanded] = useState(false);

  const setWarp = (key, val) => onChange({
    ...recipe,
    warp: { ...recipe.warp, [key]: val },
    pattern: recipe.pattern === 'custom' ? 'custom' : recipe.pattern,
  });
  const setLayers = (key, val) => onChange({
    ...recipe,
    layers: { ...recipe.layers, [key]: val },
  });
  const setCross = (key, val) => onChange({
    ...recipe,
    crossSection: { ...recipe.crossSection, [key]: val },
  });

  const alloyBtn = (active) => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    fontSize: 10,
    fontFamily: 'monospace',
    padding: '3px 0 3px 8px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: active ? C.amber : C.muted,
    borderLeft: active ? `1px solid ${C.amber}` : '1px solid transparent',
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px,150px) 1fr 1fr', gap: 24 }}>
      {/* Alloy */}
      <div>
        <div style={secTitle}>ALLOY</div>
        {ALLOY_NAMES.map(name => (
          <button
            key={name}
            style={alloyBtn(recipe.layers.alloy === name)}
            onClick={() => setLayers('alloy', name)}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Forge */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={secTitle}>FORGE</div>
        <Slider
          label="passes" value={recipe.warp.passes} onChange={v => setWarp('passes', v)}
          {...PARAM_RANGES.passes} tooltip={TOOLTIPS.passes}
        />
        <Slider
          label="turbulence" value={recipe.warp.turbulence} onChange={v => setWarp('turbulence', v)}
          {...PARAM_RANGES.turbulence} tooltip={TOOLTIPS.turbulence}
        />
        <button style={expandBtn} onClick={() => setForgeExpanded(!forgeExpanded)}>
          {forgeExpanded ? '\u2212 advanced' : '+ advanced'}
        </button>
        {forgeExpanded && (
          <>
            <Slider
              label="scale" value={recipe.warp.scale} onChange={v => setWarp('scale', v)}
              {...PARAM_RANGES.scale} tooltip={TOOLTIPS.scale}
            />
            <Slider
              label="octaves" value={recipe.warp.octaves} onChange={v => setWarp('octaves', v)}
              {...PARAM_RANGES.octaves} tooltip={TOOLTIPS.octaves}
            />
          </>
        )}
      </div>

      {/* Cross-Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={secTitle}>CROSS-SECTION</div>
        <Slider
          label="layers N" value={recipe.layers.count} onChange={v => setLayers('count', v)}
          {...PARAM_RANGES.count} tooltip={TOOLTIPS.count}
        />
        <Slider
          label="depth \u03B6" value={recipe.crossSection.depth} onChange={v => setCross('depth', v)}
          {...PARAM_RANGES.depth} tooltip={TOOLTIPS.depth}
        />
        <Slider
          label="angle \u03B8" value={recipe.crossSection.angle} onChange={v => setCross('angle', v)}
          {...PARAM_RANGES.angle} tooltip={TOOLTIPS.angle}
          fmt={v => (v * 180 / Math.PI).toFixed(1) + '\u00B0'}
        />
        <button style={expandBtn} onClick={() => setCsExpanded(!csExpanded)}>
          {csExpanded ? '\u2212 advanced' : '+ advanced'}
        </button>
        {csExpanded && (
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace', fontStyle: 'italic' }}>
            Additional cross-section controls planned for v2
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import Slider from './Slider.jsx';
import { PARAM_RANGES, TOOLTIPS } from '../recipe/schema.js';

const C = {
  amber: '#c8a040',
  dim: '#443c34',
  border: '#221e18',
  text: '#d8d4cc',
};

const DEFORM_SLIDERS = {
  twist: [
    { key: 'rate', label: 'rate', range: 'twist.rate', tooltip: 'twist.rate' },
  ],
  ladder: [
    { key: 'frequency', label: 'frequency', range: 'ladder.frequency', tooltip: 'ladder.frequency' },
    { key: 'amplitude', label: 'amplitude', range: 'ladder.amplitude', tooltip: 'ladder.amplitude' },
  ],
  raindrop: [
    { key: 'count', label: 'count', range: 'raindrop.count', tooltip: 'raindrop.count' },
    { key: 'radius', label: 'radius', range: 'raindrop.radius', tooltip: 'raindrop.radius' },
    { key: 'amplitude', label: 'amplitude', range: 'raindrop.amplitude', tooltip: 'raindrop.amplitude' },
  ],
  feather: [
    { key: 'frequency', label: 'frequency', range: 'feather.frequency', tooltip: 'feather.frequency' },
    { key: 'amplitude', label: 'amplitude', range: 'feather.amplitude', tooltip: 'feather.amplitude' },
  ],
};

const DEFORM_ADVANCED = {
  twist: [
    { key: 'center.x', label: 'center x', range: 'twist.center.x', tooltip: 'twist.center.x',
      get: d => d.center[0], set: (d, v) => ({ ...d, center: [v, d.center[1]] }) },
    { key: 'center.y', label: 'center y', range: 'twist.center.y', tooltip: 'twist.center.y',
      get: d => d.center[1], set: (d, v) => ({ ...d, center: [d.center[0], v] }) },
  ],
  ladder: [
    { key: 'profile', label: 'profile', type: 'select', options: ['sine', 'step', 'rounded'] },
  ],
  raindrop: [
    { key: 'layout', label: 'layout', type: 'select', options: ['hex', 'grid', 'random'] },
  ],
  feather: [
    { key: 'angle', label: 'angle', range: 'feather.angle', tooltip: 'feather.angle',
      fmt: v => (v * 180 / Math.PI).toFixed(1) + '\u00B0' },
  ],
};

export default function DeformationPanel({ deformation, index, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const sliders = DEFORM_SLIDERS[deformation.type] || [];
  const advanced = DEFORM_ADVANCED[deformation.type] || [];

  const update = (key, val) => {
    onChange(index, { ...deformation, [key]: val });
  };

  return (
    <div style={{
      border: `1px solid ${C.border}`,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 11,
        fontFamily: 'monospace',
      }}>
        <span style={{ color: C.amber }}>{deformation.type}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {!isFirst && (
            <button onClick={() => onMoveUp(index)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>{'\u25B2'}</button>
          )}
          {!isLast && (
            <button onClick={() => onMoveDown(index)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>{'\u25BC'}</button>
          )}
          <button onClick={() => onRemove(index)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>{'\u00D7'}</button>
        </div>
      </div>

      {sliders.map(s => (
        <Slider
          key={s.key}
          label={s.label}
          value={deformation[s.key]}
          onChange={v => update(s.key, v)}
          {...PARAM_RANGES[s.range]}
          tooltip={TOOLTIPS[s.tooltip]}
        />
      ))}

      {advanced.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ fontSize: 10, color: C.dim, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'monospace', padding: '2px 0', textAlign: 'left' }}
          >
            {expanded ? '\u2212 advanced' : '+ advanced'}
          </button>
          {expanded && advanced.map(a => {
            if (a.type === 'select') {
              return (
                <div key={a.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace', alignItems: 'center' }}>
                  <span style={{ color: C.amber }}>{a.label}</span>
                  <select
                    value={deformation[a.key]}
                    onChange={e => update(a.key, e.target.value)}
                    style={{ background: '#111', border: `1px solid ${C.border}`, color: C.text, fontSize: 10, fontFamily: 'monospace', padding: '2px 4px' }}
                  >
                    {a.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
            }
            const val = a.get ? a.get(deformation) : deformation[a.key];
            const handleChange = v => {
              if (a.set) {
                onChange(index, a.set(deformation, v));
              } else {
                update(a.key, v);
              }
            };
            return (
              <Slider
                key={a.key}
                label={a.label}
                value={val}
                onChange={handleChange}
                {...PARAM_RANGES[a.range]}
                tooltip={TOOLTIPS[a.tooltip]}
                fmt={a.fmt}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

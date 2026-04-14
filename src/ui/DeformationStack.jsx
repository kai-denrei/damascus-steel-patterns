import { useState } from 'react';
import DeformationPanel from './DeformationPanel.jsx';

const C = {
  amber: '#c8a040',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

const DEFORM_TYPES = ['twist', 'ladder', 'raindrop', 'feather'];

const DEFORM_DEFAULTS = {
  twist: { type: 'twist', rate: 3.0, center: [0.5, 0.5] },
  ladder: { type: 'ladder', frequency: 6, amplitude: 0.15, profile: 'sine' },
  raindrop: { type: 'raindrop', count: 12, radius: 0.08, amplitude: 0.2, layout: 'hex' },
  feather: { type: 'feather', frequency: 4, amplitude: 0.18, angle: 0 },
};

export default function DeformationStack({ deformations, onChange }) {
  const [expanded, setExpanded] = useState(false);

  const summary = deformations.length === 0
    ? 'none (wild)'
    : deformations.map(d => d.type).join(' + ');

  const updateDeformation = (index, updated) => {
    const next = [...deformations];
    next[index] = updated;
    onChange(next);
  };

  const removeDeformation = (index) => {
    onChange(deformations.filter((_, i) => i !== index));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...deformations];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index) => {
    if (index === deformations.length - 1) return;
    const next = [...deformations];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  const addDeformation = (type) => {
    const def = DEFORM_DEFAULTS[type];
    onChange([...deformations, {
      ...def,
      center: def.center ? [...def.center] : undefined,
    }]);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: 10,
          fontFamily: 'monospace',
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: 4,
          marginBottom: expanded ? 8 : 0,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ color: C.dim, letterSpacing: '0.15em' }}>
          {expanded ? '\u25BC' : '\u25B6'} DEFORMATION STACK
        </span>
        <span style={{ color: C.muted }}>{summary}</span>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {deformations.map((d, i) => (
            <DeformationPanel
              key={`${d.type}-${i}`}
              deformation={d}
              index={i}
              onChange={updateDeformation}
              onRemove={removeDeformation}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              isFirst={i === 0}
              isLast={i === deformations.length - 1}
            />
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            {DEFORM_TYPES.map(type => (
              <button
                key={type}
                onClick={() => addDeformation(type)}
                style={{
                  padding: '3px 8px',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  background: 'transparent',
                  border: `1px solid ${C.dim}`,
                  color: C.dim,
                  cursor: 'pointer',
                }}
              >
                + {type}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

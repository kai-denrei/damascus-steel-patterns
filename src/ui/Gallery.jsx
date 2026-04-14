import { useState } from 'react';
import { loadGallery, saveToGallery, deleteFromGallery } from '../recipe/gallery.js';

const C = {
  amber: '#c8a040',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

export default function Gallery({ recipe, onLoad, canvasRef }) {
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState(() => loadGallery());

  const refresh = () => setEntries(loadGallery());

  const handleSave = () => {
    const name = prompt('Pattern name:');
    if (!name) return;
    let thumbnail = '';
    if (canvasRef?.current) {
      const thumb = document.createElement('canvas');
      thumb.width = 80;
      thumb.height = 32;
      thumb.getContext('2d').drawImage(canvasRef.current, 0, 0, 80, 32);
      thumbnail = thumb.toDataURL('image/png');
    }
    saveToGallery(name, recipe, thumbnail);
    refresh();
  };

  const handleDelete = (id) => {
    deleteFromGallery(id);
    refresh();
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
          {expanded ? '\u25BC' : '\u25B6'} GALLERY
        </span>
        <span style={{ color: C.muted }}>{entries.length} saved</span>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {entries.map(entry => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {entry.thumbnail ? (
                  <img
                    src={entry.thumbnail}
                    alt={entry.name}
                    style={{ width: 80, height: 32, border: `1px solid ${C.border}`, display: 'block' }}
                    onClick={() => onLoad(entry.recipe)}
                  />
                ) : (
                  <div
                    style={{ width: 80, height: 32, background: '#111', border: `1px solid ${C.border}` }}
                    onClick={() => onLoad(entry.recipe)}
                  />
                )}
                <span style={{ fontSize: 9, color: C.muted, fontFamily: 'monospace', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                  style={{ position: 'absolute', top: -4, right: -4, background: '#111', border: `1px solid ${C.border}`, color: C.dim, fontSize: 9, cursor: 'pointer', width: 14, height: 14, padding: 0, lineHeight: '12px', fontFamily: 'monospace' }}
                >
                  {'\u00D7'}
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            style={{
              alignSelf: 'flex-start',
              padding: '3px 10px',
              fontSize: 10,
              fontFamily: 'monospace',
              background: 'transparent',
              border: `1px solid ${C.dim}`,
              color: C.dim,
              cursor: 'pointer',
            }}
          >
            + SAVE CURRENT
          </button>
        </div>
      )}
    </div>
  );
}

import UnicodeSlider from './UnicodeSlider.jsx';

const C = {
  dim: '#443c34',
  border: '#221e18',
};

export const DEFAULT_VECTOR_SETTINGS = {
  levels: 8,
  detail: 3,
  smoothing: 3,
  grain: 50,
  vignette: 30,
  colorVariation: 50,
  minSize: 30,
};

export default function VectorControls({ settings, onChange }) {
  const set = (key, val) => onChange({ ...settings, [key]: val });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '10px 0',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        fontSize: 10,
        color: C.dim,
        letterSpacing: '0.15em',
        fontFamily: 'monospace',
        marginBottom: 2,
      }}>
        VECTOR SETTINGS
      </div>

      <UnicodeSlider
        label="levels"
        value={settings.levels}
        onChange={v => set('levels', v)}
        min={2}
        max={20}
        step={1}
        tooltip="Number of color gradient bands. More = smoother gradient, fewer = bolder contrast."
      />

      <UnicodeSlider
        label="detail"
        value={settings.detail}
        onChange={v => set('detail', v)}
        min={1}
        max={5}
        step={1}
        tooltip="Grid sampling density. Higher = more accurate contours matching the pixel render, but larger SVG. 1=320px, 3=960px, 5=1600px wide grid."
      />

      <UnicodeSlider
        label="smoothing"
        value={settings.smoothing}
        onChange={v => set('smoothing', v)}
        min={1}
        max={6}
        step={1}
        tooltip="Contour curve smoothing radius. Higher = rounder curves but may merge nearby features. Lower = more faithful to the original pattern."
      />

      <UnicodeSlider
        label="grain"
        value={settings.grain}
        onChange={v => set('grain', v)}
        min={0}
        max={100}
        step={5}
        fmt={v => `${v}%`}
        tooltip="Surface grain texture intensity. Simulates micro-surface of polished steel."
      />

      <UnicodeSlider
        label="vignette"
        value={settings.vignette}
        onChange={v => set('vignette', v)}
        min={0}
        max={80}
        step={5}
        fmt={v => `${v}%`}
        tooltip="Edge darkening. Simulates light falloff from directional illumination."
      />

      <UnicodeSlider
        label="variation"
        value={settings.colorVariation}
        onChange={v => set('colorVariation', v)}
        min={0}
        max={100}
        step={5}
        fmt={v => `${v}%`}
        tooltip="Per-band color randomness. Adds organic imperfection to the color gradient."
      />

      <UnicodeSlider
        label="min size"
        value={settings.minSize}
        onChange={v => set('minSize', v)}
        min={0}
        max={200}
        step={5}
        tooltip="Minimum contour length in pixels. Removes small stray lines and fragments. 0 = keep all, higher = cleaner pattern."
      />
    </div>
  );
}

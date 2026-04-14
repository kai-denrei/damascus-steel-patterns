const C = {
  amber: '#c8a040',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

export default function StatusBar({ recipe, renderTime, busy }) {
  const physAmp = (recipe.warp.turbulence * Math.sqrt(Math.max(1, recipe.warp.passes)) * 0.28).toFixed(3);
  const drawRatio = (1 + (recipe.warp.passes - 1) * 0.13).toFixed(2);
  const deltaLayer = (256 / recipe.layers.count).toFixed(1);

  return (
    <div style={{
      display: 'flex',
      gap: 20,
      flexWrap: 'wrap',
      alignItems: 'center',
      fontSize: 10,
      color: C.dim,
      fontFamily: 'monospace',
      borderTop: `1px solid ${C.border}`,
      paddingTop: 6,
    }}>
      <span>{'\u03B5'}_amp <span style={{ color: C.muted }}>{physAmp}</span></span>
      <span>draw_ratio <span style={{ color: C.muted }}>{drawRatio}{'\u00D7'}</span></span>
      <span>{'\u0394'}layer <span style={{ color: C.muted }}>{deltaLayer}px</span></span>
      <span>t_render <span style={{ color: C.muted }}>{renderTime != null ? renderTime.toFixed(0) + 'ms' : '\u2014'}</span></span>
      <span style={{ marginLeft: 'auto', letterSpacing: '0.1em', color: busy ? C.amber : C.dim }}>
        {busy ? 'FORGING' : 'READY'}
      </span>
    </div>
  );
}

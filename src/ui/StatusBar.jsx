import { T } from './theme.js';

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
      color: T.textDim,
      fontFamily: 'monospace',
      borderTop: `1px solid ${T.border}`,
      paddingTop: 6,
    }}>
      <span>{'\u03B5'}_amp <span style={{ color: T.textDim }}>{physAmp}</span></span>
      <span>draw_ratio <span style={{ color: T.textDim }}>{drawRatio}{'\u00D7'}</span></span>
      <span>{'\u0394'}layer <span style={{ color: T.textDim }}>{deltaLayer}px</span></span>
      <span>t_render <span style={{ color: T.textDim }}>{renderTime != null ? renderTime.toFixed(0) + 'ms' : '\u2014'}</span></span>
      <span style={{ marginLeft: 'auto', letterSpacing: '0.1em', color: busy ? T.emberLow : T.textDim }}>
        {busy ? 'FORGING' : 'READY'}
      </span>
    </div>
  );
}

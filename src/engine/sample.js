import { fbm } from './noise.js';
import { applyDeformationStack } from './deformations.js';

export function sampleLayerField(perm, bx, by, bz, warp, layerCount, deformations) {
  // Apply deformation stack
  [bx, by, bz] = applyDeformationStack(bx, by, bz, deformations, perm, 0);

  // Domain warp (Quilez 2003)
  const physAmp = warp.turbulence * Math.sqrt(Math.max(1, warp.passes)) * 0.28;
  const dx = fbm(perm, bx * warp.scale, by * warp.scale, bz, warp.octaves) * physAmp;
  const dy = fbm(perm, bx * warp.scale + 5.2, by * warp.scale + 1.9, bz, warp.octaves) * physAmp;
  const wx = bx + dx;
  const wy = by + dy;

  // Layer field
  return (((wy + Math.sin(wx * 2.0) * 0.06) * layerCount % 1) + 2) % 1;
}

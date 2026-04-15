import { buildPerm } from './noise.js';
import { ALLOYS } from './alloys.js';
import { sampleLayerField } from './sample.js';
import { sig, shadePixel } from './shade.js';

export function renderDamascus(canvas, recipe) {
  const t0 = performance.now();
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const img = ctx.createImageData(W, H);
  const d = img.data;

  const perm = buildPerm(recipe.seed);
  const alloy = ALLOYS[recipe.layers.alloy];
  const eps = 2.0 / Math.min(W, H);
  const ssaa = recipe.supersample ? true : false;

  // Sub-pixel offsets for 2x2 SSAA (rotated grid for better coverage)
  const SS_OFFSETS = [[-0.25, -0.125], [0.25, -0.375], [-0.125, 0.375], [0.375, 0.125]];

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const bx = px / W;
      const by = py / H;
      const bz = recipe.crossSection.depth + bx * Math.tan(recipe.crossSection.angle) * 0.35;

      let mat, matx, maty;

      if (ssaa) {
        // 2x2 supersampling: sample layer field at 4 sub-pixel positions, average material
        let matSum = 0;
        for (let s = 0; s < 4; s++) {
          const sx = bx + SS_OFFSETS[s][0] / W;
          const sy = by + SS_OFFSETS[s][1] / H;
          const st = sampleLayerField(perm, sx, sy, bz, recipe.warp, recipe.layers.count, recipe.deformations);

          // Adaptive sigmoid AA: measure how fast t changes across this sub-pixel
          // and soften the threshold proportionally
          const stx = sampleLayerField(perm, sx + eps, sy, bz, recipe.warp, recipe.layers.count, recipe.deformations);
          const dtdx = Math.abs(stx - st) / eps;
          const pixelGrad = dtdx * (1.0 / W);
          const shAdapt = Math.min(alloy.sh, 1.4 / Math.max(pixelGrad, 0.001));

          matSum += sig(st, shAdapt);
        }
        mat = matSum / 4;

        // Bump-map: still use finite difference at pixel center for the normal
        const t = sampleLayerField(perm, bx, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
        const tx = sampleLayerField(perm, bx + eps, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
        const ty = sampleLayerField(perm, bx, by + eps, bz, recipe.warp, recipe.layers.count, recipe.deformations);

        const dtdxC = Math.abs(tx - t) / eps;
        const dtdyC = Math.abs(ty - t) / eps;
        const gradC = Math.max(dtdxC, dtdyC) * (1.0 / Math.min(W, H));
        const shC = Math.min(alloy.sh, 1.4 / Math.max(gradC, 0.001));

        matx = sig(tx, shC);
        maty = sig(ty, shC);
      } else {
        // Standard path with adaptive sigmoid AA
        const t = sampleLayerField(perm, bx, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
        const tx = sampleLayerField(perm, bx + eps, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
        const ty = sampleLayerField(perm, bx, by + eps, bz, recipe.warp, recipe.layers.count, recipe.deformations);

        // Adaptive sigmoid: screen-space gradient of t determines effective sharpness.
        // If t changes fast across a pixel, soften the sigmoid so the transition
        // spans at least 2-3 pixels — eliminates staircase aliasing at layer edges.
        const dtdx = Math.abs(tx - t) / eps;
        const dtdy = Math.abs(ty - t) / eps;
        const pixelGrad = Math.max(dtdx, dtdy) * (1.0 / Math.min(W, H));
        // shAdapt caps sharpness so transition width ≥ ~1.4 pixels
        const shAdapt = Math.min(alloy.sh, 1.4 / Math.max(pixelGrad, 0.001));

        mat = sig(t, shAdapt);
        matx = sig(tx, shAdapt);
        maty = sig(ty, shAdapt);
      }

      // Shade
      const [R, G, B] = shadePixel(mat, matx, maty, eps, alloy, px, py, perm, recipe.crossSection.depth);

      // Vignette
      const vx = (px / W - 0.5) * 2, vy = (py / H - 0.5) * 2;
      const vig = Math.max(0.72, 1 - 0.22 * (vx * vx + vy * vy));

      const i = (py * W + px) * 4;
      d[i]     = Math.min(255, Math.max(0, R * vig));
      d[i + 1] = Math.min(255, Math.max(0, G * vig));
      d[i + 2] = Math.min(255, Math.max(0, B * vig));
      d[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return performance.now() - t0;
}

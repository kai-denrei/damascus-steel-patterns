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

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const bx = px / W;
      const by = py / H;
      const bz = recipe.crossSection.depth + bx * Math.tan(recipe.crossSection.angle) * 0.35;

      // Layer field at center + finite-diff offsets
      const t = sampleLayerField(perm, bx, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      const tx = sampleLayerField(perm, bx + eps, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      const ty = sampleLayerField(perm, bx, by + eps, bz, recipe.warp, recipe.layers.count, recipe.deformations);

      // Material
      const mat = sig(t, alloy.sh);
      const matx = sig(tx, alloy.sh);
      const maty = sig(ty, alloy.sh);

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

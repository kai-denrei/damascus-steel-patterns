// Vector contour renderer — smooth anti-aliased fills via Canvas 2D Path2D
//
// Uses padded field so all contours close. Even-odd fill gives correct
// alternating dark/bright regions. Pixel shading composited via multiply.

import { buildPerm, n3 } from './noise.js';
import { ALLOYS } from './alloys.js';
import { sampleLayerField } from './sample.js';
import { sig } from './shade.js';
import { extractContours } from './contour.js';

export function renderDamascusVector(canvas, recipe) {
  const t0 = performance.now();
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const perm = buildPerm(recipe.seed);
  const alloy = ALLOYS[recipe.layers.alloy];

  // --- Sample material field ---
  const gW = Math.ceil(W * 0.5);
  const gH = Math.ceil(H * 0.5);
  const matField = new Float32Array(gW * gH);

  for (let gy = 0; gy < gH; gy++) {
    for (let gx = 0; gx < gW; gx++) {
      const bx = (gx + 0.5) / gW;
      const by = (gy + 0.5) / gH;
      const bz = recipe.crossSection.depth + bx * Math.tan(recipe.crossSection.angle) * 0.35;
      const t = sampleLayerField(perm, bx, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      matField[gy * gW + gx] = sig(t, alloy.sh);
    }
  }

  // --- Extract contours (padded → all closed) ---
  const contours = extractContours(matField, gH, gW, 0.5, W, H, {
    smoothIter: 4,
    rdpEpsilon: 0.5,
  });

  // --- Vector fill ---
  ctx.fillStyle = `rgb(${alloy.dark[0]},${alloy.dark[1]},${alloy.dark[2]})`;
  ctx.fillRect(0, 0, W, H);

  // Build compound bright path
  const brightPath = new Path2D();
  for (const pl of contours) {
    if (pl.length < 4) continue;
    brightPath.moveTo(pl[0][0], pl[0][1]);
    for (let i = 1; i < pl.length; i++) {
      brightPath.lineTo(pl[i][0], pl[i][1]);
    }
    brightPath.closePath();
  }

  ctx.fillStyle = `rgb(${alloy.bright[0]},${alloy.bright[1]},${alloy.bright[2]})`;
  ctx.fill(brightPath, 'evenodd');

  // --- Shading overlay via multiply ---
  const eps = 2.0 / Math.min(W, H);

  // Compute neutral shading (flat surface, no bump) for calibration
  const neutralShade = 0.30 + 0.54 * 0.73 + 0.10 * 0.80 * 0.88; // amb + key*nz + fill*nz

  const offscreen = new OffscreenCanvas(W, H);
  const octx = offscreen.getContext('2d');
  const oImg = octx.createImageData(W, H);
  const od = oImg.data;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const bx = px / W;
      const by = py / H;
      const bz = recipe.crossSection.depth + bx * Math.tan(recipe.crossSection.angle) * 0.35;

      const t = sampleLayerField(perm, bx, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      const tx = sampleLayerField(perm, bx + eps, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      const ty = sampleLayerField(perm, bx, by + eps, bz, recipe.warp, recipe.layers.count, recipe.deformations);

      const mat = sig(t, alloy.sh);
      const matx = sig(tx, alloy.sh);
      const maty = sig(ty, alloy.sh);

      // Bump-map normal
      const hsc = 0.14;
      const gmx = (matx - mat) / eps;
      const gmy = (maty - mat) / eps;
      const nnx = -gmx * hsc, nny = -gmy * hsc, nnz = 1.0;
      const nnl = Math.sqrt(nnx * nnx + nny * nny + nnz * nnz) || 1;
      const nx = nnx / nnl, ny = nny / nnl, nz = nnz / nnl;

      const kd = Math.max(0, nx * 0.42 + ny * -0.54 + nz * 0.73);
      const fd = Math.max(0, nx * -0.50 + ny * 0.30 + nz * 0.80);

      const shade = 0.30 + 0.54 * kd + 0.10 * fd * 0.88;
      const spec = Math.pow(kd, 14) * 0.42 * mat;
      const grain = n3(perm, px * 0.10, py * 0.10, recipe.crossSection.depth * 3 + 7) * 4.0;

      // Vignette
      const vx = (px / W - 0.5) * 2, vy = (py / H - 0.5) * 2;
      const vig = Math.max(0.72, 1 - 0.22 * (vx * vx + vy * vy));

      // Normalized shading: 255 = neutral (no bump effect), brighter/darker for lighting
      const lum = Math.min(255, Math.max(0,
        ((shade + spec * 1.5) / neutralShade) * vig * 255 + grain
      ));

      const i = (py * W + px) * 4;
      od[i] = od[i + 1] = od[i + 2] = lum;
      od[i + 3] = 255;
    }
  }

  octx.putImageData(oImg, 0, 0);

  // Multiply composite: preserves vector fill colors, adds shading variation
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(offscreen, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return performance.now() - t0;
}

// Vector contour renderer for damascus patterns
//
// Pipeline:
//   1. Sample layer field on grid → sigmoid → material field
//   2. Marching squares → contour segments at mat=0.5
//   3. Chain into polylines → Chaikin smooth (3 iterations)
//   4. Canvas 2D fills with even-odd rule (browser anti-aliased)
//   5. Pixel shading overlay via multiply composite (bump, specular, grain, vignette)

import { buildPerm, n3 } from './noise.js';
import { ALLOYS } from './alloys.js';
import { sampleLayerField } from './sample.js';
import { sig } from './shade.js';
import { marchingSquares, chainSegments, smoothChaikin } from './contour.js';

export function renderDamascusVector(canvas, recipe) {
  const t0 = performance.now();
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const perm = buildPerm(recipe.seed);
  const alloy = ALLOYS[recipe.layers.alloy];

  // --- 1. Sample material field on grid ---
  // Half-pixel density: enough for accurate contours, fast to compute
  const gW = Math.ceil(W * 0.5);
  const gH = Math.ceil(H * 0.5);
  const matField = new Float32Array(gW * gH);

  for (let gy = 0; gy < gH; gy++) {
    for (let gx = 0; gx < gW; gx++) {
      const bx = gx / gW;
      const by = gy / gH;
      const bz = recipe.crossSection.depth + bx * Math.tan(recipe.crossSection.angle) * 0.35;
      const t = sampleLayerField(perm, bx, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      matField[gy * gW + gx] = sig(t, alloy.sh);
    }
  }

  // --- 2-3. Extract contours, chain, smooth ---
  const segments = marchingSquares(matField, gH, gW, 0.5);
  const polylines = chainSegments(segments, 0.01);
  const smoothed = polylines.map(pl => smoothChaikin(pl, 3));

  const scaleX = W / gW;
  const scaleY = H / gH;

  // --- 4. Vector fill ---
  // Background: dark alloy
  ctx.fillStyle = `rgb(${alloy.dark[0]},${alloy.dark[1]},${alloy.dark[2]})`;
  ctx.fillRect(0, 0, W, H);

  // Bright regions: compound path with even-odd fill
  const brightPath = new Path2D();
  for (const pl of smoothed) {
    if (pl.length < 4) continue;
    // Only fill closed contours (open ones are boundary fragments)
    const dx = pl[0][0] - pl[pl.length - 1][0];
    const dy = pl[0][1] - pl[pl.length - 1][1];
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) continue;

    brightPath.moveTo(pl[0][0] * scaleX, pl[0][1] * scaleY);
    for (let i = 1; i < pl.length; i++) {
      brightPath.lineTo(pl[i][0] * scaleX, pl[i][1] * scaleY);
    }
    brightPath.closePath();
  }

  ctx.fillStyle = `rgb(${alloy.bright[0]},${alloy.bright[1]},${alloy.bright[2]})`;
  ctx.fill(brightPath, 'evenodd');

  // --- 5. Shading overlay ---
  // Render lighting-only (bump map, specular, grain, vignette) to offscreen canvas
  // then composite with 'multiply' to preserve smooth vector edges
  const offscreen = new OffscreenCanvas(W, H);
  const octx = offscreen.getContext('2d');
  const oImg = octx.createImageData(W, H);
  const od = oImg.data;
  const eps = 2.0 / Math.min(W, H);

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

      // Two-light diffuse
      const kd = Math.max(0, nx * 0.42 + ny * -0.54 + nz * 0.73);
      const fd = Math.max(0, nx * -0.50 + ny * 0.30 + nz * 0.80);

      const amb = 0.30;
      const shade = amb + 0.54 * kd + 0.10 * fd * 0.88;

      // Specular
      const spec = Math.pow(kd, 14) * 0.42 * mat;

      // Grain
      const grain = n3(perm, px * 0.10, py * 0.10, recipe.crossSection.depth * 3 + 7) * 4.0;

      // Vignette
      const vx = (px / W - 0.5) * 2, vy = (py / H - 0.5) * 2;
      const vig = Math.max(0.72, 1 - 0.22 * (vx * vx + vy * vy));

      // Encode as multiply-friendly luminance (128 = 1.0x multiplier)
      // multiply blend: result = (base * overlay) / 255
      // We want: result = base * shade * vig
      // So overlay = shade * vig * 255
      const lum = Math.min(255, Math.max(0, (shade + spec * 1.8) * vig * 255 + grain));

      const i = (py * W + px) * 4;
      od[i] = od[i + 1] = od[i + 2] = lum;
      od[i + 3] = 255;
    }
  }

  octx.putImageData(oImg, 0, 0);

  // Multiply composite: vector_fill × shading_luminance
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(offscreen, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return performance.now() - t0;
}

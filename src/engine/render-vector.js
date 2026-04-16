// Vector contour renderer — multi-level color gradient with smooth Bezier fills
//
// Uses the proven extractContours pipeline (padding + box filter + subsample)
// with widely-spaced threshold levels to avoid interference.

import { buildPerm, n3 } from './noise.js';
import { ALLOYS } from './alloys.js';
import { sampleLayerField } from './sample.js';
import { sig } from './shade.js';
import { extractContours } from './contour.js';

// Build a Bezier compound path from contours
function buildBezierPath(contours, W, H) {
  const path = new Path2D();
  for (const pl of contours) {
    if (pl.length < 4) continue;
    const n = pl.length;
    const closed = Math.abs(pl[0][0] - pl[n - 1][0]) < W * 0.01 &&
                   Math.abs(pl[0][1] - pl[n - 1][1]) < H * 0.01;

    path.moveTo(pl[0][0], pl[0][1]);
    const get = closed
      ? (i) => pl[((i % n) + n) % n]
      : (i) => pl[Math.max(0, Math.min(n - 1, i))];

    const T = 0.3;
    const count = closed ? n : n - 1;
    for (let i = 0; i < count; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      path.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) * T, p1[1] + (p2[1] - p0[1]) * T,
        p2[0] - (p3[0] - p1[0]) * T, p2[1] - (p3[1] - p1[1]) * T,
        p2[0], p2[1]
      );
    }
    path.closePath();
  }
  return path;
}

export function renderDamascusVector(canvas, recipe) {
  const t0 = performance.now();
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const perm = buildPerm(recipe.seed);
  const alloy = ALLOYS[recipe.layers.alloy];

  // Grid must resolve layer structure: ≥ 4 samples per layer cycle
  const minH = Math.max(128, recipe.layers.count * 4);
  const gH = Math.min(640, Math.max(minH, Math.ceil(H * 0.5)));
  const gW = Math.min(1600, Math.round(gH * 2.5));
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

  // 6 widely-spaced levels
  const NUM = 6;
  const dark = alloy.dark;
  const bright = alloy.bright;

  // Seeded variation
  let rng = (recipe.seed + 7919) >>> 0;
  const nextRng = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 0x100000000 - 0.5; };

  // Background
  ctx.fillStyle = `rgb(${dark[0]},${dark[1]},${dark[2]})`;
  ctx.fillRect(0, 0, W, H);

  // Stack levels
  for (let li = 0; li < NUM; li++) {
    const threshold = (li + 0.5) / NUM;
    const contours = extractContours(matField, gH, gW, threshold, W, H, 3, 20);
    if (contours.length === 0) continue;

    const v = nextRng() * 8;
    const r = Math.max(0, Math.min(255, Math.round(dark[0] + (bright[0] - dark[0]) * threshold + v)));
    const g = Math.max(0, Math.min(255, Math.round(dark[1] + (bright[1] - dark[1]) * threshold + v)));
    const b = Math.max(0, Math.min(255, Math.round(dark[2] + (bright[2] - dark[2]) * threshold + v)));

    const path = buildBezierPath(contours, W, H);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fill(path, 'evenodd');
  }

  // Shading overlay
  const eps = 2.0 / Math.min(W, H);
  const neutralShade = 0.30 + 0.54 * 0.73 + 0.10 * 0.80 * 0.88;

  const offscreen = new OffscreenCanvas(W, H);
  const octx = offscreen.getContext('2d');
  const oImg = octx.createImageData(W, H);
  const od = oImg.data;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const bx = px / W, by = py / H;
      const bz = recipe.crossSection.depth + bx * Math.tan(recipe.crossSection.angle) * 0.35;

      const t = sampleLayerField(perm, bx, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      const tx = sampleLayerField(perm, bx + eps, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      const ty = sampleLayerField(perm, bx, by + eps, bz, recipe.warp, recipe.layers.count, recipe.deformations);

      const mat = sig(t, alloy.sh), matx = sig(tx, alloy.sh), maty = sig(ty, alloy.sh);

      const hsc = 0.14;
      const gmx = (matx - mat) / eps, gmy = (maty - mat) / eps;
      const nnz = 1.0;
      const nnl = Math.sqrt(gmx * gmx * hsc * hsc + gmy * gmy * hsc * hsc + 1) || 1;
      const nx = -gmx * hsc / nnl, ny = -gmy * hsc / nnl, nz = nnz / nnl;

      const kd = Math.max(0, nx * 0.42 + ny * -0.54 + nz * 0.73);
      const fd = Math.max(0, nx * -0.50 + ny * 0.30 + nz * 0.80);

      const shade = 0.30 + 0.54 * kd + 0.10 * fd * 0.88;
      const spec = Math.pow(kd, 14) * 0.42 * mat;
      const grain = n3(perm, px * 0.10, py * 0.10, recipe.crossSection.depth * 3 + 7) * 4.0;

      const vx = (px / W - 0.5) * 2, vy = (py / H - 0.5) * 2;
      const vig = Math.max(0.72, 1 - 0.22 * (vx * vx + vy * vy));

      const lum = Math.min(255, Math.max(0,
        ((shade + spec * 1.5) / neutralShade) * vig * 255 + grain
      ));

      const i = (py * W + px) * 4;
      od[i] = od[i + 1] = od[i + 2] = lum;
      od[i + 3] = 255;
    }
  }

  octx.putImageData(oImg, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(offscreen, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return performance.now() - t0;
}

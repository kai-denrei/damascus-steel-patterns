// Seamless tile generation via cross-fade blending
//
// Renders at 2× tile dimensions, then blends overlapping halves
// with cosine weights. The result tiles perfectly in both axes.
//
// Math: for each output pixel (x, y), blend 4 samples from the
// 2× render at offsets (0,0), (W,0), (0,H), (W,H) using weights
// derived from cosine curves that smoothly transition at edges.

import { renderDamascus } from './render.js';

export function makeSeamlessTile(recipe, tileW, tileH) {
  // Render at 2× dimensions
  const bigW = tileW * 2;
  const bigH = tileH * 2;
  const bigCanvas = document.createElement('canvas');
  bigCanvas.width = bigW;
  bigCanvas.height = bigH;
  renderDamascus(bigCanvas, { ...recipe, resolution: 1 });

  const bigCtx = bigCanvas.getContext('2d');
  const bigData = bigCtx.getImageData(0, 0, bigW, bigH).data;

  // Create seamless tile
  const outCanvas = document.createElement('canvas');
  outCanvas.width = tileW;
  outCanvas.height = tileH;
  const outCtx = outCanvas.getContext('2d');
  const outImg = outCtx.createImageData(tileW, tileH);
  const out = outImg.data;

  const PI2 = Math.PI * 2;

  for (let y = 0; y < tileH; y++) {
    // Cosine weight: 0 at edges, 1 at center
    const wy = 0.5 - 0.5 * Math.cos(PI2 * y / tileH);

    for (let x = 0; x < tileW; x++) {
      const wx = 0.5 - 0.5 * Math.cos(PI2 * x / tileW);

      // 4 sample positions from the 2× render
      const i00 = (y * bigW + x) * 4;
      const i10 = (y * bigW + x + tileW) * 4;
      const i01 = ((y + tileH) * bigW + x) * 4;
      const i11 = ((y + tileH) * bigW + x + tileW) * 4;

      // Bilinear blend with cosine weights
      const w00 = (1 - wx) * (1 - wy);
      const w10 = wx * (1 - wy);
      const w01 = (1 - wx) * wy;
      const w11 = wx * wy;

      const oi = (y * tileW + x) * 4;
      out[oi]     = bigData[i00] * w00 + bigData[i10] * w10 + bigData[i01] * w01 + bigData[i11] * w11;
      out[oi + 1] = bigData[i00 + 1] * w00 + bigData[i10 + 1] * w10 + bigData[i01 + 1] * w01 + bigData[i11 + 1] * w11;
      out[oi + 2] = bigData[i00 + 2] * w00 + bigData[i10 + 2] * w10 + bigData[i01 + 2] * w01 + bigData[i11 + 2] * w11;
      out[oi + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

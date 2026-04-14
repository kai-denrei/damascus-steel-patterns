import { n3 } from './noise.js';

export const sig = (t, sh) => 1 / (1 + Math.exp(-sh * (t - 0.5)));

export function shadePixel(mat, matx, maty, eps, alloy, px, py, perm, depth) {
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

  // Per-channel shading
  const amb = 0.30;
  const sR = amb + 0.54 * kd + 0.10 * fd * 0.75;
  const sG = amb + 0.54 * kd + 0.10 * fd * 0.90;
  const sB = amb + 0.54 * kd + 0.10 * fd;

  // Base color
  const R = alloy.dark[0] + (alloy.bright[0] - alloy.dark[0]) * mat;
  const G = alloy.dark[1] + (alloy.bright[1] - alloy.dark[1]) * mat;
  const B = alloy.dark[2] + (alloy.bright[2] - alloy.dark[2]) * mat;

  // Specular
  const spec = Math.pow(kd, 14) * 0.42 * mat;

  // Grain
  const grain = n3(perm, px * 0.10, py * 0.10, depth * 3 + 7) * 4.0;

  return [
    Math.min(255, Math.max(0, R * sR + spec * 220 + grain)),
    Math.min(255, Math.max(0, G * sG + spec * 208 + grain)),
    Math.min(255, Math.max(0, B * sB + spec * 192 + grain)),
  ];
}

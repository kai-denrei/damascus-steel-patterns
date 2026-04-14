// Seeded Fisher-Yates shuffle → permutation table for Perlin noise
export function buildPerm(seed) {
  const arr = Array.from({ length: 256 }, (_, i) => i);
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = p[i + 256] = arr[i];
  return p;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lrp = (a, b, t) => a + (b - a) * t;

function grd(h, x, y, z) {
  const c = h & 15;
  const u = c < 8 ? x : y;
  const v = c < 4 ? y : c === 12 || c === 14 ? x : z;
  return ((c & 1) ? -u : u) + ((c & 2) ? -v : v);
}

// Ken Perlin improved gradient noise (2002)
export function n3(p, x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = p[X] + Y, B = p[X + 1] + Y;
  const AA = p[A] + Z, AB = p[A + 1] + Z, BA = p[B] + Z, BB = p[B + 1] + Z;
  return lrp(
    lrp(
      lrp(grd(p[AA], x, y, z), grd(p[BA], x - 1, y, z), u),
      lrp(grd(p[AB], x, y - 1, z), grd(p[BB], x - 1, y - 1, z), u),
      v
    ),
    lrp(
      lrp(grd(p[AA + 1], x, y, z - 1), grd(p[BA + 1], x - 1, y, z - 1), u),
      lrp(grd(p[AB + 1], x, y - 1, z - 1), grd(p[BB + 1], x - 1, y - 1, z - 1), u),
      v
    ),
    w
  );
}

// fBm — lacunarity 2.07 avoids integer-period artifacts
export function fbm(p, x, y, z, oct) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += n3(p, x * f, y * f, z + i * 4.13) * a;
    a *= 0.5;
    f *= 2.07;
  }
  return v;
}

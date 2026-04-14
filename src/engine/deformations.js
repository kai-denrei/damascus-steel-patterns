import { lcgPositions } from '../util/lcg.js';

// Hex grid layout for raindrop centers
function hexPositions(count) {
  const positions = [];
  const cols = Math.ceil(Math.sqrt(count * 1.15));
  const rows = Math.ceil(count / cols);
  for (let r = 0; r < rows && positions.length < count; r++) {
    for (let c = 0; c < cols && positions.length < count; c++) {
      const x = (c + (r % 2) * 0.5 + 0.5) / (cols + 0.5);
      const y = (r + 0.5) / rows;
      positions.push([x, y]);
    }
  }
  return positions;
}

// Grid layout for raindrop centers
function gridPositions(count) {
  const positions = [];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  for (let r = 0; r < rows && positions.length < count; r++) {
    for (let c = 0; c < cols && positions.length < count; c++) {
      positions.push([(c + 0.5) / cols, (r + 0.5) / rows]);
    }
  }
  return positions;
}

const DEFORM = {
  twist(bx, by, bz, params) {
    const cx = params.center[0];
    const cy = params.center[1];
    const angle = params.rate * bz;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = bx - cx;
    const dy = by - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos, bz];
  },

  ladder(bx, by, bz, params) {
    const t = bx * params.frequency * Math.PI * 2;
    let displacement;
    if (params.profile === 'step') {
      displacement = Math.sign(Math.sin(t));
    } else if (params.profile === 'rounded') {
      const s = Math.sin(t);
      if (s > 0.3) displacement = 1;
      else if (s < -0.3) displacement = -1;
      else displacement = s / 0.3;
    } else {
      displacement = Math.sin(t);
    }
    return [bx, by + params.amplitude * displacement, bz];
  },

  raindrop(bx, by, bz, params, perm, deformIndex) {
    let centers;
    if (params.layout === 'hex') {
      centers = hexPositions(params.count);
    } else if (params.layout === 'grid') {
      centers = gridPositions(params.count);
    } else {
      const seed = (perm ? perm[0] : 0) * 256 + (perm ? perm[1] : 0) + deformIndex * 9973;
      centers = lcgPositions(seed, params.count);
    }
    let dx = 0, dy = 0;
    const r2inv = 1 / (params.radius * params.radius);
    for (let i = 0; i < centers.length; i++) {
      const [cx, cy] = centers[i];
      const distSq = (bx - cx) * (bx - cx) + (by - cy) * (by - cy);
      const g = Math.exp(-distSq * r2inv);
      dx += (bx - cx) * g;
      dy += (by - cy) * g;
    }
    return [bx + dx * params.amplitude, by + dy * params.amplitude, bz];
  },

  feather(bx, by, bz, params) {
    const angle = params.angle || 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const proj = bx * cos + by * sin;
    const t = ((proj * params.frequency) % 1 + 1) % 1;
    const tri = Math.abs(t * 2 - 1);
    return [bx - sin * params.amplitude * tri, by + cos * params.amplitude * tri, bz];
  },
};

export function applyDeformation(bx, by, bz, deformation, perm, deformIndex) {
  const fn = DEFORM[deformation.type];
  if (!fn) return [bx, by, bz];
  return fn(bx, by, bz, deformation, perm, deformIndex);
}

export function applyDeformationStack(bx, by, bz, stack, perm, seed) {
  for (let i = 0; i < stack.length; i++) {
    [bx, by, bz] = applyDeformation(bx, by, bz, stack[i], perm, i);
  }
  return [bx, by, bz];
}

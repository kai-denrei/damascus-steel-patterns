// Marching squares contour extraction + curve smoothing + simplification
//
// Pipeline: field → pad → marching squares → chain → Chaikin smooth → RDP simplify

// Edge indices: 0=top, 1=right, 2=bottom, 3=left
// Bit layout: 8=TL, 4=TR, 2=BR, 1=BL (1 = above threshold)
const CASE_SEGMENTS = [
  [],                  // 0
  [[3, 2]],            // 1: BL
  [[2, 1]],            // 2: BR
  [[3, 1]],            // 3: BL+BR
  [[0, 1]],            // 4: TR
  [[0, 3], [2, 1]],    // 5: TR+BL (saddle)
  [[0, 2]],            // 6: TR+BR
  [[0, 3]],            // 7: TR+BR+BL
  [[0, 3]],            // 8: TL
  [[0, 2]],            // 9: TL+BL
  [[0, 1], [3, 2]],    // 10: TL+BR (saddle)
  [[0, 1]],            // 11: TL+BL+BR
  [[3, 1]],            // 12: TL+TR
  [[2, 1]],            // 13: TL+TR+BL
  [[3, 2]],            // 14: TL+TR+BR
  [],                  // 15
];

function lerp(a, b, va, vb, threshold) {
  const t = (threshold - va) / (vb - va);
  return a + t * (b - a);
}

export function marchingSquares(field, rows, cols, threshold) {
  const segments = [];
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const tl = field[y * cols + x];
      const tr = field[y * cols + x + 1];
      const br = field[(y + 1) * cols + x + 1];
      const bl = field[(y + 1) * cols + x];

      let ci = 0;
      if (tl >= threshold) ci |= 8;
      if (tr >= threshold) ci |= 4;
      if (br >= threshold) ci |= 2;
      if (bl >= threshold) ci |= 1;
      if (ci === 0 || ci === 15) continue;

      // Asymptotic decider for saddle points (cases 5 and 10).
      // Uses bilinear interpolation center value to resolve ambiguity.
      // Nielson & Hamann: Q = TL*BR - BL*TR determines correct diagonal.
      if (ci === 5 || ci === 10) {
        const center = (tl + tr + br + bl) * 0.25;
        if ((ci === 5 && center >= threshold) || (ci === 10 && center < threshold)) {
          ci = 15 - ci; // 5 ↔ 10: swap diagonal connection
        }
      }

      const ep = [
        [lerp(x, x + 1, tl, tr, threshold), y],
        [x + 1, lerp(y, y + 1, tr, br, threshold)],
        [lerp(x, x + 1, bl, br, threshold), y + 1],
        [x, lerp(y, y + 1, tl, bl, threshold)],
      ];
      for (const [e1, e2] of CASE_SEGMENTS[ci]) {
        segments.push([ep[e1], ep[e2]]);
      }
    }
  }
  return segments;
}

export function chainSegments(segments, tolerance = 0.01) {
  if (segments.length === 0) return [];

  const key = (p) => `${Math.round(p[0] / tolerance)},${Math.round(p[1] / tolerance)}`;
  const used = new Uint8Array(segments.length);
  const endpointMap = new Map();

  for (let i = 0; i < segments.length; i++) {
    for (const pt of segments[i]) {
      const k = key(pt);
      if (!endpointMap.has(k)) endpointMap.set(k, []);
      endpointMap.get(k).push(i);
    }
  }

  const polylines = [];
  for (let start = 0; start < segments.length; start++) {
    if (used[start]) continue;
    used[start] = 1;
    const chain = [segments[start][0], segments[start][1]];

    for (const dir of ['forward', 'backward']) {
      let extended = true;
      while (extended) {
        extended = false;
        const tip = dir === 'forward' ? chain[chain.length - 1] : chain[0];
        const k = key(tip);
        const candidates = endpointMap.get(k);
        if (!candidates) break;
        for (const idx of candidates) {
          if (used[idx]) continue;
          const seg = segments[idx];
          const d0 = Math.abs(seg[0][0] - tip[0]) + Math.abs(seg[0][1] - tip[1]);
          const d1 = Math.abs(seg[1][0] - tip[0]) + Math.abs(seg[1][1] - tip[1]);
          if (d0 < tolerance) {
            dir === 'forward' ? chain.push(seg[1]) : chain.unshift(seg[1]);
            used[idx] = 1; extended = true; break;
          } else if (d1 < tolerance) {
            dir === 'forward' ? chain.push(seg[0]) : chain.unshift(seg[0]);
            used[idx] = 1; extended = true; break;
          }
        }
      }
    }
    if (chain.length >= 3) polylines.push(chain);
  }
  return polylines;
}

// Chaikin corner-cutting
export function smoothChaikin(points, iterations = 3) {
  if (points.length < 3) return points;
  const closed = Math.abs(points[0][0] - points[points.length - 1][0]) < 0.5 &&
                 Math.abs(points[0][1] - points[points.length - 1][1]) < 0.5;

  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next = [];
    const n = closed ? pts.length : pts.length - 1;
    if (!closed) next.push(pts[0]);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % pts.length;
      const p0 = pts[i], p1 = pts[j];
      next.push([p0[0] * 0.75 + p1[0] * 0.25, p0[1] * 0.75 + p1[1] * 0.25]);
      next.push([p0[0] * 0.25 + p1[0] * 0.75, p0[1] * 0.25 + p1[1] * 0.75]);
    }
    if (!closed) next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

// Ramer-Douglas-Peucker polyline simplification
// Removes points within `epsilon` of the simplified line while preserving curve shape
export function simplifyRDP(points, epsilon) {
  if (points.length <= 2) return points;

  const [sx, sy] = points[0];
  const [ex, ey] = points[points.length - 1];
  const dx = ex - sx, dy = ey - sy;
  const lenSq = dx * dx + dy * dy;

  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    let dist;
    if (lenSq === 0) {
      dist = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
    } else {
      const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lenSq));
      const projX = sx + t * dx, projY = sy + t * dy;
      dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    }
    if (dist > maxDist) { maxDist = dist; maxIdx = i; }
  }

  if (maxDist > epsilon) {
    const left = simplifyRDP(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyRDP(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

// For closed polylines: apply RDP while preserving closure
function simplifyClosedRDP(points, epsilon) {
  if (points.length <= 4) return points;
  // Find the point farthest from the centroid to use as the split point
  let cx = 0, cy = 0;
  for (const [x, y] of points) { cx += x; cy += y; }
  cx /= points.length; cy /= points.length;

  let maxDist = 0, splitIdx = 0;
  for (let i = 0; i < points.length; i++) {
    const d = (points[i][0] - cx) ** 2 + (points[i][1] - cy) ** 2;
    if (d > maxDist) { maxDist = d; splitIdx = i; }
  }

  // Rotate so split point is at start/end, simplify as open, re-close
  const rotated = [...points.slice(splitIdx), ...points.slice(0, splitIdx + 1)];
  const simplified = simplifyRDP(rotated, epsilon);
  // Close: ensure last point matches first
  if (simplified.length > 2) {
    simplified[simplified.length - 1] = simplified[0];
  }
  return simplified;
}

// Pad field with zeros → forces all contours closed
export function padField(field, rows, cols) {
  const padW = cols + 2;
  const padH = rows + 2;
  const padded = new Float32Array(padW * padH);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      padded[(y + 1) * padW + (x + 1)] = field[y * cols + x];
    }
  }
  return { padded, padW, padH };
}

// Smooth polyline coordinates with iterated box filter (approximates Gaussian).
// Removes marching-squares staircase artifacts while preserving curve shape.
function smoothPolylineCoords(points, radius, iterations) {
  const n = points.length;
  if (n < 3) return points;

  const closed = Math.abs(points[0][0] - points[n - 1][0]) < 1 &&
                 Math.abs(points[0][1] - points[n - 1][1]) < 1;

  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next = [];
    for (let i = 0; i < n; i++) {
      let sx = 0, sy = 0, count = 0;
      for (let j = -radius; j <= radius; j++) {
        let idx;
        if (closed) {
          idx = ((i + j) % n + n) % n;
        } else {
          idx = Math.max(0, Math.min(n - 1, i + j));
        }
        sx += pts[idx][0];
        sy += pts[idx][1];
        count++;
      }
      next.push([sx / count, sy / count]);
    }
    pts = next;
  }
  return pts;
}

// Uniform subsample: keep every Kth point, plus always keep first and last
function subsample(points, step) {
  if (points.length <= step * 2) return points;
  const result = [points[0]];
  for (let i = step; i < points.length - 1; i += step) {
    result.push(points[i]);
  }
  result.push(points[points.length - 1]);
  return result;
}

// Full pipeline: field → pad → march → chain → scale → smooth → subsample
// The smoothing removes marching-squares staircase artifacts.
// The subsampling gives Bezier tangent computation proper long-range context.
// Compute arc length of a polyline
function polylineLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

export function extractContours(field, rows, cols, threshold, outW, outH, smoothRadius = 4, minLength = 0) {
  const { padded, padW, padH } = padField(field, rows, cols);
  const segments = marchingSquares(padded, padH, padW, threshold);
  const polylines = chainSegments(segments, 0.01);

  const sx = outW / cols;
  const sy = outH / rows;

  return polylines
    .filter(pl => pl.length >= 3)
    .map(pl => {
      // Shift from padded coords, scale to output
      const scaled = pl.map(([x, y]) => [(x - 1) * sx, (y - 1) * sy]);

      // Smooth: 3 iterations of box filter removes staircase
      const smoothed = smoothPolylineCoords(scaled, smoothRadius, 3);

      // Subsample: keep every 3rd point so Bezier tangents
      // see the actual curve direction, not local zigzag
      return subsample(smoothed, 3);
    })
    .filter(pl => pl.length >= 3)
    .filter(pl => minLength <= 0 || polylineLength(pl) >= minLength);
}

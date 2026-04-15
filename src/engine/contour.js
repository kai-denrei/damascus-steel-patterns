// Marching squares contour extraction + Chaikin curve smoothing
//
// Input: 2D scalar field + threshold
// Output: array of smoothed polylines (each is array of [x, y] in grid coords)

// Edge indices: 0=top, 1=right, 2=bottom, 3=left
// Case table: which edge pairs the contour crosses for each of 16 marching squares cases.
// Bit layout: 8=TL, 4=TR, 2=BR, 1=BL (1 = above threshold)
const CASE_SEGMENTS = [
  [],                  // 0: all below
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
  [],                  // 15: all above
];

function lerp(a, b, va, vb, threshold) {
  const t = (threshold - va) / (vb - va);
  return a + t * (b - a);
}

// Extract raw contour segments from a 2D scalar field
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

      // Interpolated edge crossing points
      const edgePoints = [
        [lerp(x, x + 1, tl, tr, threshold), y],             // 0: top
        [x + 1, lerp(y, y + 1, tr, br, threshold)],          // 1: right
        [lerp(x, x + 1, bl, br, threshold), y + 1],          // 2: bottom
        [x, lerp(y, y + 1, tl, bl, threshold)],              // 3: left
      ];

      for (const [e1, e2] of CASE_SEGMENTS[ci]) {
        segments.push([edgePoints[e1], edgePoints[e2]]);
      }
    }
  }

  return segments;
}

// Chain raw segments into polylines by matching endpoints
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

    // Extend forward
    let extended = true;
    while (extended) {
      extended = false;
      const tail = chain[chain.length - 1];
      const k = key(tail);
      const candidates = endpointMap.get(k);
      if (!candidates) break;
      for (const idx of candidates) {
        if (used[idx]) continue;
        const seg = segments[idx];
        const d0 = Math.abs(seg[0][0] - tail[0]) + Math.abs(seg[0][1] - tail[1]);
        const d1 = Math.abs(seg[1][0] - tail[0]) + Math.abs(seg[1][1] - tail[1]);
        if (d0 < tolerance) {
          chain.push(seg[1]);
          used[idx] = 1;
          extended = true;
          break;
        } else if (d1 < tolerance) {
          chain.push(seg[0]);
          used[idx] = 1;
          extended = true;
          break;
        }
      }
    }

    // Extend backward
    extended = true;
    while (extended) {
      extended = false;
      const head = chain[0];
      const k = key(head);
      const candidates = endpointMap.get(k);
      if (!candidates) break;
      for (const idx of candidates) {
        if (used[idx]) continue;
        const seg = segments[idx];
        const d0 = Math.abs(seg[0][0] - head[0]) + Math.abs(seg[0][1] - head[1]);
        const d1 = Math.abs(seg[1][0] - head[0]) + Math.abs(seg[1][1] - head[1]);
        if (d0 < tolerance) {
          chain.unshift(seg[1]);
          used[idx] = 1;
          extended = true;
          break;
        } else if (d1 < tolerance) {
          chain.unshift(seg[0]);
          used[idx] = 1;
          extended = true;
          break;
        }
      }
    }

    if (chain.length >= 3) {
      polylines.push(chain);
    }
  }

  return polylines;
}

// Chaikin's corner-cutting algorithm — converges to quadratic B-spline
export function smoothChaikin(points, iterations = 2) {
  if (points.length < 3) return points;

  // Check if closed (first ≈ last)
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
      next.push([
        p0[0] * 0.75 + p1[0] * 0.25,
        p0[1] * 0.75 + p1[1] * 0.25,
      ]);
      next.push([
        p0[0] * 0.25 + p1[0] * 0.75,
        p0[1] * 0.25 + p1[1] * 0.75,
      ]);
    }

    if (!closed) next.push(pts[pts.length - 1]);
    pts = next;
  }

  return pts;
}

// Pad a field with zeros so contours close instead of terminating at edges.
// Returns { padded, padW, padH } — contour coords are offset by +1 from original.
export function padField(field, rows, cols) {
  const padW = cols + 2;
  const padH = rows + 2;
  const padded = new Float32Array(padW * padH); // zeros = below threshold
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      padded[(y + 1) * padW + (x + 1)] = field[y * cols + x];
    }
  }
  return { padded, padW, padH };
}

// Full pipeline: sample field → pad → marching squares → chain → smooth → scale
// Returns array of smoothed polylines in output coordinates [0, outW] × [0, outH]
export function extractContours(field, rows, cols, threshold, outW, outH, smoothIter = 3) {
  const { padded, padW, padH } = padField(field, rows, cols);
  const segments = marchingSquares(padded, padH, padW, threshold);
  const polylines = chainSegments(segments, 0.01);

  // Shift by -1 (remove padding offset), then scale to output coords
  const sx = outW / cols;
  const sy = outH / rows;

  return polylines
    .filter(pl => pl.length >= 3)
    .map(pl => {
      const shifted = pl.map(([x, y]) => [(x - 1) * sx, (y - 1) * sy]);
      return smoothChaikin(shifted, smoothIter);
    });
}

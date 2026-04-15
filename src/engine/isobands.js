// Isoband extraction via ternary marching squares
//
// Instead of stacked isolines (which interfere when smoothed),
// isobands produce non-overlapping band polygons by construction.
// Each band covers the region where: threshold_low <= value < threshold_high
//
// Ternary classification per corner:
//   0 = below low threshold
//   1 = within band (low <= val < high)
//   2 = above high threshold
//
// 81 cases (3^4). Each produces 0-2 polygon fragments per cell.

// Edge crossing interpolation
function lerp(a, b, va, vb, threshold) {
  if (Math.abs(vb - va) < 1e-10) return (a + b) * 0.5;
  const t = (threshold - va) / (vb - va);
  return a + Math.max(0, Math.min(1, t)) * (b - a);
}

// For each cell, we have 4 corners with ternary states (0, 1, 2).
// The isoband polygon connects edge crossings. There are two possible
// crossings per edge: one at threshold_low, one at threshold_high.
//
// Rather than a full 81-entry lookup, we decompose into:
// 1. Find all edge crossings (low and high thresholds)
// 2. Trace the band polygon by connecting crossings in order around the cell

function classifyCorner(val, lo, hi) {
  if (val < lo) return 0;
  if (val >= hi) return 2;
  return 1;
}

// Extract isoband polygons for one band [lo, hi)
// Returns array of polygon rings (each is array of [x, y])
export function extractIsoband(field, rows, cols, lo, hi) {
  const segments = [];

  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const tl = field[y * cols + x];
      const tr = field[y * cols + x + 1];
      const br = field[(y + 1) * cols + x + 1];
      const bl = field[(y + 1) * cols + x];

      const cTL = classifyCorner(tl, lo, hi);
      const cTR = classifyCorner(tr, lo, hi);
      const cBR = classifyCorner(br, lo, hi);
      const cBL = classifyCorner(bl, lo, hi);

      // All same class → no band boundary in this cell
      if (cTL === cTR && cTR === cBR && cBR === cBL) continue;

      // Collect edge crossing points for the band boundary.
      // For each edge, check if the band boundary crosses it.
      // An edge has a crossing at `lo` if one corner is below lo and the other is >= lo (or vice versa).
      // An edge has a crossing at `hi` if one corner is below hi and the other is >= hi.

      // Edge points: top(TL→TR), right(TR→BR), bottom(BL→BR), left(TL→BL)
      // We walk around the cell boundary clockwise, collecting crossing points
      // that are ON the band boundary. A point is on the band boundary if it
      // transitions between "inside band" and "outside band" states.

      const crossings = [];

      // Helper: for an edge from corner A to corner B with values va, vb,
      // add crossing points at lo and/or hi thresholds that represent band boundaries
      const addEdgeCrossings = (ax, ay, bx, by, va, vb, ca, cb) => {
        // Crossing at lo threshold
        if ((ca === 0 && cb !== 0) || (ca !== 0 && cb === 0)) {
          crossings.push([
            lerp(ax, bx, va, vb, lo),
            lerp(ay, by, va, vb, lo),
          ]);
        }
        // Crossing at hi threshold
        if ((ca <= 1 && cb === 2) || (ca === 2 && cb <= 1)) {
          crossings.push([
            lerp(ax, bx, va, vb, hi),
            lerp(ay, by, va, vb, hi),
          ]);
        }
      };

      // Walk edges clockwise: top, right, bottom (reversed), left (reversed)
      addEdgeCrossings(x, y, x + 1, y, tl, tr, cTL, cTR);         // top
      addEdgeCrossings(x + 1, y, x + 1, y + 1, tr, br, cTR, cBR); // right
      addEdgeCrossings(x + 1, y + 1, x, y + 1, br, bl, cBR, cBL); // bottom (reversed)
      addEdgeCrossings(x, y + 1, x, y, bl, tl, cBL, cTL);         // left (reversed)

      // Also add corners that are within the band (class 1)
      if (cTL === 1) crossings.push([x, y]);
      if (cTR === 1) crossings.push([x + 1, y]);
      if (cBR === 1) crossings.push([x + 1, y + 1]);
      if (cBL === 1) crossings.push([x, y + 1]);

      if (crossings.length < 2) continue;

      // Sort crossings by angle from cell center for consistent polygon winding
      const cx = x + 0.5, cy = y + 0.5;
      crossings.sort((a, b) => {
        const aa = Math.atan2(a[1] - cy, a[0] - cx);
        const ba = Math.atan2(b[1] - cy, b[0] - cx);
        return aa - ba;
      });

      // Emit as pairs of consecutive points (segments of the band boundary)
      for (let i = 0; i < crossings.length; i++) {
        const j = (i + 1) % crossings.length;
        segments.push([crossings[i], crossings[j]]);
      }
    }
  }

  return segments;
}

// Chain isoband segments into closed polygons
export function chainIsobandSegments(segments, tolerance = 0.01) {
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

  const polygons = [];

  for (let start = 0; start < segments.length; start++) {
    if (used[start]) continue;
    used[start] = 1;
    const chain = [segments[start][0], segments[start][1]];

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
          used[idx] = 1; extended = true; break;
        } else if (d1 < tolerance) {
          chain.push(seg[0]);
          used[idx] = 1; extended = true; break;
        }
      }
    }

    if (chain.length >= 3) polygons.push(chain);
  }

  return polygons;
}

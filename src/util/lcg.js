// Linear congruential generator — same constants as buildPerm for consistency
// Returns [value in [0,1), next state]
export function lcgRand(state) {
  const next = (Math.imul(state >>> 0, 1664525) + 1013904223) >>> 0;
  return [next / 0x100000000, next];
}

// Generate N deterministic [x, y] positions in [0, 1)²
export function lcgPositions(seed, count) {
  const positions = [];
  let s = seed >>> 0;
  for (let i = 0; i < count; i++) {
    const [x, ns1] = lcgRand(s);
    const [y, ns2] = lcgRand(ns1);
    positions.push([x, y]);
    s = ns2;
  }
  return positions;
}

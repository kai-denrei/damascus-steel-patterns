// Blade shape definitions for the 刃 (Ha) experimental blade tab
//
// Based on blade-rendering-research.md:
// - Profiles use Bézier curves (not 81-point polylines)
// - Each profile defined by spine + belly curves
// - Grind type and fuller parameters per profile
//
// Types:
//   'procedural' — generated from bladeGeometry() function
//   'svg' — imported SVG path data

export const BLADE_SHAPES = {
  chef: {
    name: 'Chef Knife',
    type: 'procedural',
    desc: 'Drop point, rocker belly, flat grind',
    fuller: true,
  },
  clippoint: {
    name: 'Clip Point',
    type: 'procedural-clip',
    desc: 'Bowie style, concave spine at tip',
    fuller: true,
  },
  tanto: {
    name: 'Tantō',
    type: 'procedural-tanto',
    desc: 'Japanese, angular tip, no belly rocker',
    fuller: false,
  },
  spearpoint: {
    name: 'Spear Point',
    type: 'procedural-spear',
    desc: 'Symmetric, double-edge dagger',
    fuller: true,
  },
  katana: {
    name: 'Katana',
    type: 'svg',
    desc: 'DTRave, curved single-edge',
    viewBox: '0 0 280 330',
    // Blade body (spine + edge sweep)
    bladePath: 'm406.61 97.771c-7.7 75.439-131.43 201.69-150.75 220.21-19.32 18.53-50 45.16-51.35 46.24-0.46 0.78 10.19 6.15 10.19 6.15s12.3 16.53 10.78 19.43-4.98 1.06-6.06-0.34c-1.08-1.39-10.15-14.69-10.61-16.48-0.47-1.79 0.91-3.37 0.91-3.37s31.67-31.3 57.23-34.81c2.24-0.42-2.38-9.96-4.81-9.44-20.8 3.77-57.72 31.96-59.83 35.12 0 0-0.18-5.53 1.16-7.79 1.24-2.09 49.69-44.82 51.03-45.88 0.45-0.77-10.46-8.91-10.46-8.91s130.81-199.15 149.6-217.67c1.54-1.52 3.6-3.45 5.59-5.41',
    // Back of blade (creates the fill area with the main path)
    bladeBack: 'm406.83 100.05c-10.92 80.3-130.81 199.15-149.6 217.67-18.88 18.61-49.69 44.82-51.03 45.88-0.45 0.77 10.46 8.91 10.46 8.91',
    // Handle/tsuba
    guardPath: 'm205.84 366.68s-31.67 31.3-57.23 34.81c-2.24 0.42 2.38 9.96 4.81 9.44 20.8-3.77 57.72-31.96 59.83-35.12 0 0-0.18-5.53 1.16-7.79',
  },
  shashka: {
    name: 'Shashka',
    type: 'svg',
    desc: 'Cossack sabre, gentle curve',
    viewBox: '0 0 5000 1250',
    bladePath: 'M3980.9,693.7c-110.9,14.6-282.4,35.7-493.6,55.3-91.1,8.4-364.6,32-740.3,47.9-299,12.7-471.6,11.8-529.3,11.4-321.9-2.6-560.7-22.2-638.5-29-208.4-18.1-355.3-39.6-486.7-59,0,0-280.3-41.4-490.5-108.5-46-14.7-86.5-31.3-166.5-66.7-5.9-2.6-50.6-22.6-103.4-58.1-20.5-13.8-51.3-34.6-47.9-42.4,2.8-6.4,27.9-1.5,49.2,3.7,15.1,2.6,39.1,6.8,54.6,9.5,436.7,75.8,442.2,81.5,586.2,102.7,99.3,14.6,232.7,34.1,407.9,51.8,102,10.3,386.9,38.5,753.8,40.1,186.8.8,455.5-5.4,524-7,125.6-2.9,188.5-4.4,250.8-7.1,149.8-6.5,299.7-17.5,669.9-56.3,89.3-9.4,222.6-23.6,386.4-42.2',
    guardPath: 'M3996.8,692.3c19.9-2.7,102.5.2,119.7-37.7,7.4-13.8,6-28.9,39-31.8,109-15.9,199.4-38.8,292.3-42,4.9-.2,12.1.7,17.9,2.4,37.9,14.8,24.7,54,28.6,86.7,0,0,4.5,25.5,14.3,28.1,9.7,2.6,42.5,1.9,54.6.3,70.6-8.9,161-60.7,152.1-146.1-8.7-63.2-55-97.2-112-108.6-60.1-9.7-152.2,19.6-227.9,29.5-78.7,16.8-297.5,40.8-392.5,65.3,4.6,51.3,9.2,102.5,13.9,153.8Z',
  },
};

// Procedural blade geometry generators for non-SVG profiles
// Each returns { spine, belly, bevelLine } arrays of [x, y] points

export function generateClipPoint(W, H) {
  const numPts = 80;
  const spine = [], belly = [], bevelLine = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const x = -W * 0.15 + t * W * 1.05;
    const bladeWidth = H * 0.44 * (1 - t * t * 0.85);

    // Clip point: spine is straight until 65%, then dips concavely toward tip
    let spineY;
    if (t < 0.65) {
      spineY = H * 0.2 + t * H * 0.1;
    } else {
      const clipT = (t - 0.65) / 0.35;
      spineY = H * 0.2 + 0.65 * H * 0.1 + clipT * clipT * H * 0.22;
    }

    const bellyCurve = Math.sin(t * Math.PI * 0.5) * H * 0.08 * (1 - t);
    let bellyY = spineY + bladeWidth + bellyCurve;

    // Tip convergence
    if (t > 0.88) {
      const tipT = (t - 0.88) / 0.12;
      const pinch = tipT * tipT;
      const mid = (spineY + bellyY) / 2;
      spineY = spineY + (mid - spineY) * pinch;
      bellyY = bellyY - (bellyY - mid) * pinch;
    }

    spine.push([x, spineY]); belly.push([x, bellyY]);
    bevelLine.push([x, bellyY - (bellyY - spineY) * 0.28]);
  }
  return { spine, belly, bevelLine };
}

export function generateTanto(W, H) {
  const numPts = 80;
  const spine = [], belly = [], bevelLine = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const x = -W * 0.12 + t * W * 1.0;

    // Tanto: nearly flat spine, flat belly with angular rise at ~75%
    const spineY = H * 0.28 + t * H * 0.12;
    const bladeWidth = H * 0.35 * (1 - t * 0.7);
    let bellyY;
    if (t < 0.75) {
      bellyY = spineY + bladeWidth; // flat belly
    } else {
      // Angular rise to meet spine at tip
      const tantoT = (t - 0.75) / 0.25;
      const flatBelly = spineY + bladeWidth;
      const targetY = spineY + 2;
      bellyY = flatBelly + (targetY - flatBelly) * tantoT;
    }

    spine.push([x, spineY]); belly.push([x, bellyY]);
    bevelLine.push([x, bellyY - (bellyY - spineY) * 0.3]);
  }
  return { spine, belly, bevelLine };
}

export function generateSpearPoint(W, H) {
  const numPts = 80;
  const spine = [], belly = [], bevelLine = [];
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const x = -W * 0.15 + t * W * 1.05;
    const midY = H * 0.5 + t * H * 0.0;

    // Symmetric: spine mirrors belly around midline
    const halfWidth = H * 0.2 * (1 - t * t * 0.92);
    const curve = Math.sin(t * Math.PI * 0.55) * H * 0.04 * (1 - t);
    let spineY = midY - halfWidth - curve;
    let bellyY = midY + halfWidth + curve;

    // Rounded tip convergence
    if (t > 0.88) {
      const tipT = (t - 0.88) / 0.12;
      const pinch = tipT * tipT;
      spineY = spineY + (midY - spineY) * pinch;
      bellyY = bellyY - (bellyY - midY) * pinch;
    }

    spine.push([x, spineY]); belly.push([x, bellyY]);
    bevelLine.push([x, bellyY - (bellyY - spineY) * 0.25]);
  }
  return { spine, belly, bevelLine };
}

export const BLADE_NAMES = Object.keys(BLADE_SHAPES);

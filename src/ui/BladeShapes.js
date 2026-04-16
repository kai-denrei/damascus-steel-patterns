// Blade shape definitions for the 刃 (Ha) experimental blade tab
//
// Each shape has:
//   name, viewBox, bladePath (filled area), outlinePath (full silhouette),
//   bevelRatio (how far from belly the bevel sits, 0-1)

export const BLADE_SHAPES = {
  chef: {
    name: 'Chef Knife',
    type: 'procedural',
    desc: 'Western chef, rocker belly',
  },
  shashka: {
    name: 'Shashka',
    type: 'svg',
    desc: 'Cossack sabre, gentle curve',
    viewBox: '0 0 5000 1250',
    // The blade body (long curved path)
    bladePath: 'M3980.9,693.7c-110.9,14.6-282.4,35.7-493.6,55.3-91.1,8.4-364.6,32-740.3,47.9-299,12.7-471.6,11.8-529.3,11.4-321.9-2.6-560.7-22.2-638.5-29-208.4-18.1-355.3-39.6-486.7-59,0,0-280.3-41.4-490.5-108.5-46-14.7-86.5-31.3-166.5-66.7-5.9-2.6-50.6-22.6-103.4-58.1-20.5-13.8-51.3-34.6-47.9-42.4,2.8-6.4,27.9-1.5,49.2,3.7,15.1,2.6,39.1,6.8,54.6,9.5,436.7,75.8,442.2,81.5,586.2,102.7,99.3,14.6,232.7,34.1,407.9,51.8,102,10.3,386.9,38.5,753.8,40.1,186.8.8,455.5-5.4,524-7,125.6-2.9,188.5-4.4,250.8-7.1,149.8-6.5,299.7-17.5,669.9-56.3,89.3-9.4,222.6-23.6,386.4-42.2',
    // Handle/guard area
    guardPath: 'M3996.8,692.3c19.9-2.7,102.5.2,119.7-37.7,7.4-13.8,6-28.9,39-31.8,109-15.9,199.4-38.8,292.3-42,4.9-.2,12.1.7,17.9,2.4,37.9,14.8,24.7,54,28.6,86.7,0,0,4.5,25.5,14.3,28.1,9.7,2.6,42.5,1.9,54.6.3,70.6-8.9,161-60.7,152.1-146.1-8.7-63.2-55-97.2-112-108.6-60.1-9.7-152.2,19.6-227.9,29.5-78.7,16.8-297.5,40.8-392.5,65.3,4.6,51.3,9.2,102.5,13.9,153.8Z',
  },
  katana: {
    name: 'Katana',
    type: 'svg',
    desc: 'Japanese single-edge, curved',
    viewBox: '0 0 450 300',
    // Simplified blade outline traced from the Wikimedia katana diagram
    // Blade body: spine (top, slight curve) + belly (bottom, more curve) + tip
    bladePath: 'M 35 258 C 45 255, 65 248, 85 238 C 120 222, 160 202, 200 178 C 230 160, 255 142, 275 125 C 295 108, 310 92, 320 80 C 330 68, 338 58, 342 52 C 346 46, 348 42, 349 40 L 350 39 C 350 38, 349 37, 347 37 C 345 38, 340 42, 332 48 C 324 54, 314 63, 302 74 C 280 96, 252 124, 222 152 C 192 180, 160 206, 130 226 C 100 246, 72 260, 52 268 C 42 272, 36 274, 34 274 C 32 274, 32 272, 34 268 Z',
  },
  tanto: {
    name: 'Tantō',
    type: 'procedural-short',
    desc: 'Japanese short blade, minimal curve',
  },
  bowie: {
    name: 'Bowie',
    type: 'procedural-clip',
    desc: 'Clip point, American frontier',
  },
};

export const BLADE_NAMES = Object.keys(BLADE_SHAPES);

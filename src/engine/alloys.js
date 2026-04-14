// dark/bright: RGB for etched dark and polished bright layers
// sh: sigmoid sharpness — driven by carbide banding morphology
export const ALLOYS = {
  '1095 + 15N20':   { dark: [16, 10, 6],   bright: [224, 217, 204], sh: 30 },
  '1084 + 15N20':   { dark: [20, 13, 8],   bright: [218, 211, 198], sh: 24 },
  'Wootz (sim.)':   { dark: [52, 34, 16],  bright: [170, 152, 118], sh: 10 },
  '304L + 316L SS': { dark: [55, 60, 68],  bright: [192, 197, 206], sh: 18 },
};

export const ALLOY_NAMES = Object.keys(ALLOYS);

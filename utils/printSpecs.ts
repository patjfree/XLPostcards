/**
 * Single source of truth for postcard print dimensions and helpers.
 * 300 DPI export sizes (with minimal bleed baked in).
 */
export type PostcardSize = 'regular' | 'xl';

type SizeMap = Record<PostcardSize, { width: number; height: number }>;

/**
 * Base canvas pixels used for the exported print files.
 * Match these to the sizes you send to Stannp.
 *  - 4x6 (regular): 1872 x 1272
 *  - 6x9 (xl):      2772 x 1872
 */
const BASE_PRINT_PX: SizeMap = {
  regular: { width: 1872, height: 1272 },
  xl: { width: 2772, height: 1872 },
};

/**
 * Optional: small extra bleed for the FRONT full-bleed photo.
 * Adds a few pixels around to avoid hairline white edges after trim.
 * Default bleedAdd = 18 px (total +18 width, +18 height).
 */
export const getFrontBleedPixels = (size: PostcardSize, bleedAdd = 18) => {
  const { width, height } = BASE_PRINT_PX[size];
  return { width: width + bleedAdd, height: height + bleedAdd };
};

export const getPrintPixels = (size: PostcardSize) => BASE_PRINT_PX[size];

export const supportedPostcardSizes: PostcardSize[] = ['regular', 'xl'];

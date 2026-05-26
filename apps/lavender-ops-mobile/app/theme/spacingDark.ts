// Mirror of spacing.ts — keys must match exactly (enforced by types.ts Spacing union).
const SPACING_MULTIPLIER = 1.0

export const spacing = {
  xxxs: 2  * SPACING_MULTIPLIER,
  xxs:  4  * SPACING_MULTIPLIER,
  xs:   4  * SPACING_MULTIPLIER,
  sm:   8  * SPACING_MULTIPLIER,
  md:   12 * SPACING_MULTIPLIER,
  base: 16 * SPACING_MULTIPLIER,
  lg:   20 * SPACING_MULTIPLIER,
  xl:   24 * SPACING_MULTIPLIER,
  xxl:  32 * SPACING_MULTIPLIER,
  xxxl: 48 * SPACING_MULTIPLIER,
} as const

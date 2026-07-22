import { Platform } from "react-native"

import { spacing } from "@/theme/tokens"

import { useBottomSpace } from "./useBottomSpace"

/**
 * Bottom padding for a screen's pinned bottom action bar (e.g. *Simpan Rental* / *Batal*) —
 * PRD-4 BR-3/BR-4.
 *
 * Replaces `paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.base`, a branch that
 * was byte-identical across all four pinned-bar sites (`BottomActionBar`, `DetailSewaScreen`,
 * `PengembalianScreen`, `RentalDetailScreen`) and is the defect PRD-4 names directly: it never
 * reserved anything for Android's system nav bar — the one platform this app ships on.
 *
 * At zero device inset this returns exactly the old flat value on either platform (PRD-4
 * AC-5/BR-5 — no regression). Beyond that it grows by the device's actual reported inset via
 * `useBottomSpace()` — which is how *Simpan Rental* stops being physically covered by Mom's
 * 3-button nav bar.
 *
 * Deliberately resolved inside the hook body (render time), not as a module-level constant —
 * `Platform.select(...)` evaluated at module load is frozen before any caller (or test) can
 * influence `Platform.OS`.
 */
export function useBottomBarPadding(): number {
  const bottomSpace = useBottomSpace()
  const base = Platform.select({ ios: spacing.xl, default: spacing.base }) as number
  return base + bottomSpace
}

import { useContext } from "react"
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { TAB_BAR_BASE_HEIGHT } from "@/navigators/tabBarMetrics"

/**
 * Bottom space a screen must reserve so its pinned controls and scrollable content clear the
 * system navigation bar (PRD-4) — the single shared decision BR-4 requires. There is no shared
 * screen scaffolding to hang this off of: none of the 14 screens imports `Screen.tsx` (v1.0.4
 * discovery pass, finding F-2/C-2) — they all hand-roll their own `SafeAreaView`. This hook is
 * the shared vehicle instead.
 *
 * Resolves the tabbed-vs-non-tabbed split itself (PRD-4 discovery D-2/B7) so callers never need
 * to know which they are:
 *
 * - **Inside the bottom tab navigator** (Beranda / Rental / Hutang / User): `MainNavigator`
 *   already sizes the tab bar as `insets.bottom + TAB_BAR_BASE_HEIGHT` — the bar itself already
 *   reserves the system inset (PRD-4's own scoping note: the tab bar already renders
 *   correctly). What a screen's own scroll content still needs, on top of its existing
 *   zero-inset padding, is only the *device-driven* portion of that height — the fixed
 *   `TAB_BAR_BASE_HEIGHT` is already reflected in each screen's current padding and must not be
 *   added a second time (that would double-count it and add dead whitespace on devices that
 *   don't need it — G4). Subtracting the constant back out of `useBottomTabBarHeight()`'s total
 *   keeps this additive.
 * - **Outside the tab navigator** (detail/form screens, the Sewa Baru stack, local bottom
 *   bars): there is no tab bar already accounting for the inset, so this is just the raw
 *   device-reported `insets.bottom`.
 *
 * **Contract (locked, unit-tested): returns exactly `0` when the device reports no bottom
 * inset and there is no tab bar.** This is PRD-4 AC-5 / BR-5 — the guard against fixing Mom's
 * phone by degrading everyone else's.
 *
 * **Callers use this additively**: `paddingBottom: EXISTING_VALUE + useBottomSpace()`, never as
 * a standalone replacement for an existing screen's padding — see the v1.0.4 handoff note for
 * the reasoning and the one exception (a screen with no prior bottom accounting at all, where
 * `EXISTING_VALUE` is 0).
 */
export function useBottomSpace(): number {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useContext(BottomTabBarHeightContext)

  if (tabBarHeight !== undefined) {
    return Math.max(0, tabBarHeight - TAB_BAR_BASE_HEIGHT)
  }

  return insets.bottom
}

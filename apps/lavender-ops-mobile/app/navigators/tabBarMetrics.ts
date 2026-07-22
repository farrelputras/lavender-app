/**
 * The bottom tab bar's fixed base height (v1.0.4, PRD-4) — the part of `MainNavigator`'s
 * `tabBarStyle.height` that is *not* device-inset-driven. `MainNavigator` computes the bar's
 * total rendered height as `insets.bottom + TAB_BAR_BASE_HEIGHT`.
 *
 * `useBottomSpace()` (`@/utils/useBottomSpace`) subtracts this constant back out of
 * `useBottomTabBarHeight()`'s reported total, so a tabbed screen's own scroll padding grows
 * only by the device's contribution — never by the bar's fixed base again, which is already
 * reflected in each screen's existing zero-inset padding and would otherwise be double-counted.
 *
 * Lives in its own file, not inside `MainNavigator.tsx`, so `useBottomSpace.ts` (imported by
 * every screen, tabbed or not) never has to import the tab navigator module itself — that would
 * risk a circular import the moment a tabbed screen (e.g. `BerandaScreen`, which `MainNavigator`
 * imports) also imports `useBottomSpace`.
 *
 * Single source of truth: `MainNavigator.tsx` and `useBottomSpace.ts` both read this constant.
 * Nobody should re-derive "70" independently.
 */
export const TAB_BAR_BASE_HEIGHT = 70

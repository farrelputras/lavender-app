jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

import { ReactNode } from "react"
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs"
import { renderHook } from "@testing-library/react-native"

import { TAB_BAR_BASE_HEIGHT } from "@/navigators/tabBarMetrics"

import { useBottomSpace } from "./useBottomSpace"
import { mockInsets, THREE_BUTTON_NAV_INSETS, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

function tabBarWrapper(totalHeight: number) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <BottomTabBarHeightContext.Provider value={totalHeight}>
        {children}
      </BottomTabBarHeightContext.Provider>
    )
  }
}

describe("useBottomSpace", () => {
  describe("outside a tab navigator (detail/form screens, the Sewa Baru stack)", () => {
    it("returns 0 at zero inset — PRD-4 AC-5 / BR-5, the no-regression guard", () => {
      mockInsets(ZERO_INSETS)
      const { result } = renderHook(() => useBottomSpace())
      expect(result.current).toBe(0)
    })

    it("returns the raw device inset when it is non-zero", () => {
      mockInsets(THREE_BUTTON_NAV_INSETS)
      const { result } = renderHook(() => useBottomSpace())
      expect(result.current).toBe(48)
    })
  })

  describe("inside the bottom tab navigator (Beranda / Rental / Hutang / User)", () => {
    it("returns 0 at zero inset even under a tab bar — the bar's own fixed base must not leak in", () => {
      mockInsets(ZERO_INSETS)
      const { result } = renderHook(() => useBottomSpace(), {
        wrapper: tabBarWrapper(TAB_BAR_BASE_HEIGHT), // MainNavigator's height at zero inset
      })
      expect(result.current).toBe(0)
    })

    it("returns only the inset-driven portion of the tab bar's height, not the whole bar", () => {
      mockInsets(THREE_BUTTON_NAV_INSETS)
      const { result } = renderHook(() => useBottomSpace(), {
        // MainNavigator sizes the bar as `insets.bottom + TAB_BAR_BASE_HEIGHT`
        wrapper: tabBarWrapper(TAB_BAR_BASE_HEIGHT + 48),
      })
      expect(result.current).toBe(48)
    })

    it("never goes negative, even if a screen reports a tab-bar height under the base constant", () => {
      mockInsets(ZERO_INSETS)
      const { result } = renderHook(() => useBottomSpace(), {
        wrapper: tabBarWrapper(0),
      })
      expect(result.current).toBe(0)
    })
  })
})

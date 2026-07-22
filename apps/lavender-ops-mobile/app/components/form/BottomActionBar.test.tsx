jest.mock("@/utils/useBottomBarPadding", () => ({
  useBottomBarPadding: jest.fn(),
}))

import { StyleSheet, TouchableOpacity } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"
import { useBottomBarPadding } from "@/utils/useBottomBarPadding"

import { BottomActionBar } from "./BottomActionBar"

describe("BottomActionBar", () => {
  beforeEach(() => {
    // useBottomBarPadding() itself is unit-tested in app/utils/useBottomBarPadding.test.tsx
    // (the Platform + inset math). Here we only need to prove BottomActionBar is wired to it.
    ;(useBottomBarPadding as jest.Mock).mockReturnValue(16)
  })

  it("renders both labels", () => {
    const { getByText } = render(
      <ThemeProvider>
        <BottomActionBar primaryLabel="Simpan Rental" onPrimary={() => {}} onCancel={() => {}} />
      </ThemeProvider>,
    )
    expect(getByText("Batal")).toBeDefined()
    expect(getByText("Simpan Rental")).toBeDefined()
  })

  it("fires onPrimary and onCancel", () => {
    const onPrimary = jest.fn()
    const onCancel = jest.fn()
    const { getByText } = render(
      <ThemeProvider>
        <BottomActionBar primaryLabel="Simpan" onPrimary={onPrimary} onCancel={onCancel} />
      </ThemeProvider>,
    )
    fireEvent.press(getByText("Simpan"))
    fireEvent.press(getByText("Batal"))
    expect(onPrimary).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("disables primary button while loading", () => {
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <BottomActionBar primaryLabel="Simpan" onPrimary={() => {}} onCancel={() => {}} loading />
      </ThemeProvider>,
    )
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    // Second button is the primary action
    expect(buttons[1].props.disabled).toBe(true)
  })

  // v1.0.4 (PRD-4): the bar's bottom padding must come from the shared hook, not be
  // recomputed or hardcoded locally (BR-4 — one shared decision).
  it("applies useBottomBarPadding()'s value as the bar's bottom padding", () => {
    ;(useBottomBarPadding as jest.Mock).mockReturnValue(64)
    const { getByTestId } = render(
      <ThemeProvider>
        <BottomActionBar
          testID="bar"
          primaryLabel="Simpan Rental"
          onPrimary={() => {}}
          onCancel={() => {}}
        />
      </ThemeProvider>,
    )
    const style = StyleSheet.flatten(getByTestId("bar").props.style)
    expect(style.paddingBottom).toBe(64)
  })
})

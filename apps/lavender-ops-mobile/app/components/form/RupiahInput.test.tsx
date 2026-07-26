import { StyleSheet } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"
import { colors, borderRadius } from "@/theme/tokens"

import { RupiahInput } from "./RupiahInput"
import { findStyledAncestor } from "../../../test/findStyledAncestor"

describe("RupiahInput", () => {
  it("renders Rp prefix and placeholder", () => {
    const { getByText, getByPlaceholderText } = render(
      <ThemeProvider>
        <RupiahInput value="" onChangeText={() => {}} placeholder="50000" />
      </ThemeProvider>,
    )
    expect(getByText("Rp")).toBeDefined()
    expect(getByPlaceholderText("50000")).toBeDefined()
  })

  it("emits onChangeText when user types", () => {
    const onChangeText = jest.fn()
    const { getByPlaceholderText } = render(
      <ThemeProvider>
        <RupiahInput value="" onChangeText={onChangeText} placeholder="0" />
      </ThemeProvider>,
    )
    fireEvent.changeText(getByPlaceholderText("0"), "25000")
    expect(onChangeText).toHaveBeenCalledWith("25000")
  })

  // PRD-8 BR-3/BR-6/AC-6: RupiahInput must CONSUME the shared FieldBox, not declare its own
  // border/fill/radius/minHeight — and its border token must be the corrected `colors.outline`
  // (`outlineVariant` is retired from field borders; it measured 1.63:1 against this fill).
  it("renders inside the shared FieldBox — corrected border token, never a fixed height", () => {
    const { getByPlaceholderText } = render(
      <ThemeProvider>
        <RupiahInput value="50000" onChangeText={() => {}} placeholder="0" />
      </ThemeProvider>,
    )
    const box = findStyledAncestor(getByPlaceholderText("0"))
    expect(box).not.toBeNull()
    const flat = StyleSheet.flatten(box!.props.style)
    expect(flat.borderColor).toBe(colors.outline)
    expect(flat.backgroundColor).toBe(colors.surface)
    expect(flat.borderRadius).toBe(borderRadius.default)
    expect(flat.minHeight).toBe(52)
    expect(flat.height).toBeUndefined()
  })
})

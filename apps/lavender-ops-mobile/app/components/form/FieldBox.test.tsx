import { View, StyleSheet } from "react-native"
import { render } from "@testing-library/react-native"

import { Text } from "@/components/AppText"
import { ThemeProvider } from "@/theme/context"
import { colors, borderRadius } from "@/theme/tokens"

import { FieldBox } from "./FieldBox"
import { findStyledAncestor } from "../../../test/findStyledAncestor"

describe("FieldBox", () => {
  it("renders its children", () => {
    const { getByText } = render(
      <ThemeProvider>
        <FieldBox>
          <Text>inside</Text>
        </FieldBox>
      </ThemeProvider>,
    )
    expect(getByText("inside")).toBeDefined()
  })

  // BR-1/BR-3/BR-6/BR-8/D-1: the ONE declaration site for the box's border colour, fill,
  // radius and minHeight. `findStyledAncestor` (the project's existing helper) walks up from
  // the child until it finds the ancestor whose flattened style declares a height/minHeight —
  // that is FieldBox's own container, regardless of how many forwardRef hops (RN's own `View`
  // included) sit in between.
  it("boxes the field with token-based border, fill, radius and minHeight — never a fixed height", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <FieldBox>
          <View testID="content" />
        </FieldBox>
      </ThemeProvider>,
    )
    const box = findStyledAncestor(getByTestId("content"))
    expect(box).not.toBeNull()
    const flat = StyleSheet.flatten(box!.props.style)
    expect(flat.borderColor).toBe(colors.outline)
    expect(flat.backgroundColor).toBe(colors.surface)
    expect(flat.borderRadius).toBe(borderRadius.default)
    expect(flat.borderWidth).toBe(1)
    expect(flat.minHeight).toBe(52)
    expect(flat.height).toBeUndefined()
  })

  // Invariant 1: "a consumer that needs a variant composes via `style`; it does not
  // redeclare." A consumer (e.g. PembayaranSheet's amount-validation border) must be able to
  // override just the border colour without losing the rest of the box.
  it("lets a consumer override part of the box via `style`, without dropping the rest", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <FieldBox style={{ borderColor: colors.error, marginTop: 4 }}>
          <View testID="content" />
        </FieldBox>
      </ThemeProvider>,
    )
    const box = findStyledAncestor(getByTestId("content"))
    expect(box).not.toBeNull()
    const flat = StyleSheet.flatten(box!.props.style)
    expect(flat.borderColor).toBe(colors.error)
    expect(flat.marginTop).toBe(4)
    expect(flat.backgroundColor).toBe(colors.surface)
    expect(flat.minHeight).toBe(52)
  })
})

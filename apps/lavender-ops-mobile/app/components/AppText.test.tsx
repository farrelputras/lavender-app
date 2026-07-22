// PRD-5 BR-4/BR-8 — the one clamp point for the whole app. `Text`/`TextInput` here are an
// API-identical passthrough over RN's own components (Option 4, v1.0.4 re-gate): they add a
// default `maxFontSizeMultiplier` and change nothing else. Adopting them in a screen is an
// import-line redirect, not a JSX change — see the ~26-file sweep this release makes.
import { createRef } from "react"
// eslint-disable-next-line no-restricted-imports -- typing a ref against RN's real instance types is exactly the kill-criterion this test proves
import type { Text as RNTextInstance, TextInput as RNTextInputInstance } from "react-native"
import { render } from "@testing-library/react-native"

import { MAX_FONT_SCALE, Text, TextInput } from "./AppText"

describe("MAX_FONT_SCALE", () => {
  it("is 1.5 — Farrel's settled over-cap, deliberately above MIUI's XL slider", () => {
    expect(MAX_FONT_SCALE).toBe(1.5)
  })
})

describe("AppText Text", () => {
  it("defaults maxFontSizeMultiplier to MAX_FONT_SCALE", () => {
    const { getByText } = render(<Text>Hello</Text>)
    expect(getByText("Hello").props.maxFontSizeMultiplier).toBe(MAX_FONT_SCALE)
  })

  it("lets an explicit maxFontSizeMultiplier override the default (caller can go lower, never higher than the device asks)", () => {
    const { getByText } = render(<Text maxFontSizeMultiplier={1}>Hello</Text>)
    expect(getByText("Hello").props.maxFontSizeMultiplier).toBe(1)
  })

  it("forwards every other prop untouched", () => {
    const { getByText } = render(
      <Text numberOfLines={2} testID="greeting">
        Hello
      </Text>,
    )
    expect(getByText("Hello").props.numberOfLines).toBe(2)
    expect(getByText("Hello").props.testID).toBe("greeting")
  })

  it("forwards a ref to the underlying RN Text instance (BR-8 kill-criterion 2)", () => {
    const ref = createRef<RNTextInstance>()
    render(<Text ref={ref}>Hello</Text>)
    expect(ref.current).not.toBeNull()
  })

  it("preserves RN's nested-Text structure so a child Text still renders as a nested host node (BR-8 kill-criterion 3)", () => {
    const tree = render(
      <Text testID="outer">
        Prefix <Text testID="inner">Inner</Text>
      </Text>,
    ).toJSON()
    expect(tree).not.toBeNull()
    const node = Array.isArray(tree) ? tree[0] : tree
    expect(node?.type).toBe("Text")
    const children = node?.children ?? []
    const nestedTextNode = children.find((c: unknown) => typeof c !== "string")
    expect(nestedTextNode).toBeDefined()
    expect((nestedTextNode as { type: string }).type).toBe("Text")
  })
})

describe("AppText TextInput", () => {
  it("defaults maxFontSizeMultiplier to MAX_FONT_SCALE", () => {
    const { getByDisplayValue } = render(<TextInput value="hi" onChangeText={() => {}} />)
    expect(getByDisplayValue("hi").props.maxFontSizeMultiplier).toBe(MAX_FONT_SCALE)
  })

  it("lets an explicit maxFontSizeMultiplier override the default", () => {
    const { getByDisplayValue } = render(
      <TextInput value="hi" onChangeText={() => {}} maxFontSizeMultiplier={1} />,
    )
    expect(getByDisplayValue("hi").props.maxFontSizeMultiplier).toBe(1)
  })

  it("forwards a ref to the underlying RN TextInput instance (BR-8 kill-criterion 2 — the trap that actually bit)", () => {
    const ref = createRef<RNTextInputInstance>()
    render(<TextInput ref={ref} value="hi" onChangeText={() => {}} />)
    expect(ref.current).not.toBeNull()
  })
})

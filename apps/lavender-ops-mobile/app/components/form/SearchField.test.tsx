import { createRef } from "react"
import { TextInput } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { SearchField } from "./SearchField"

describe("SearchField", () => {
  it("forwards onFocus to the underlying TextInput", () => {
    const onFocus = jest.fn()
    const { UNSAFE_getByType } = render(
      <ThemeProvider>
        <SearchField
          value=""
          onChangeText={jest.fn()}
          placeholder="Cari nama..."
          onFocus={onFocus}
        />
      </ThemeProvider>,
    )

    // Assert the prop actually reaches the TextInput, rather than firing a "focus" event and
    // asserting the mock ran. RNTL's fireEvent walks UP the tree for a handler and would find
    // `onFocus` on the SearchField element itself — so that test passes even when SearchField
    // drops the prop on the floor. Verified by mutation: it did.
    expect(UNSAFE_getByType(TextInput).props.onFocus).toBe(onFocus)
  })

  it("forwards inputRef to the underlying TextInput so callers can blur it", () => {
    const ref = createRef<TextInput>()
    render(
      <ThemeProvider>
        <SearchField value="" onChangeText={jest.fn()} placeholder="Cari..." inputRef={ref} />
      </ThemeProvider>,
    )

    expect(ref.current).not.toBeNull()
    expect(typeof ref.current?.blur).toBe("function")
  })

  it("clears the value when the clear button is pressed", () => {
    const onChangeText = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <SearchField value="budi" onChangeText={onChangeText} />
      </ThemeProvider>,
    )

    // The clear button only renders when value is non-empty.
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])

    expect(onChangeText).toHaveBeenCalledWith("")
  })
})

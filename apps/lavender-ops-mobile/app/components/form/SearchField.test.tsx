import { createRef } from "react"
import { TextInput } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { SearchField } from "./SearchField"

describe("SearchField", () => {
  it("calls onFocus when the input is focused", () => {
    const onFocus = jest.fn()
    const { getByPlaceholderText } = render(
      <ThemeProvider>
        <SearchField
          value=""
          onChangeText={jest.fn()}
          placeholder="Cari nama..."
          onFocus={onFocus}
        />
      </ThemeProvider>,
    )

    fireEvent(getByPlaceholderText("Cari nama..."), "focus")

    expect(onFocus).toHaveBeenCalledTimes(1)
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

import { fireEvent, render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"

import { RupiahInput } from "./RupiahInput"

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
})

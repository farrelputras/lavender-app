import { TouchableOpacity } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { BottomActionBar } from "./BottomActionBar"

describe("BottomActionBar", () => {
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
})

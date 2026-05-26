import { TouchableOpacity } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"

import { Stepper } from "./Stepper"

describe("Stepper", () => {
  it("renders the label", () => {
    const { getByText } = render(
      <ThemeProvider>
        <Stepper value={3} label="3 kotak" onDecrement={() => {}} onIncrement={() => {}} />
      </ThemeProvider>,
    )
    expect(getByText("3 kotak")).toBeDefined()
  })

  it("calls onIncrement and onDecrement when not at bounds", () => {
    const onIncrement = jest.fn()
    const onDecrement = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <Stepper
          value={3}
          label="3"
          min={0}
          max={8}
          onDecrement={onDecrement}
          onIncrement={onIncrement}
        />
      </ThemeProvider>,
    )
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    fireEvent.press(buttons[0])
    fireEvent.press(buttons[1])
    expect(onDecrement).toHaveBeenCalledTimes(1)
    expect(onIncrement).toHaveBeenCalledTimes(1)
  })

  it("disables decrement button when at min", () => {
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <Stepper value={0} label="0" min={0} onDecrement={() => {}} onIncrement={() => {}} />
      </ThemeProvider>,
    )
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    expect(buttons[0].props.disabled).toBe(true)
  })

  it("disables increment button when at max", () => {
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <Stepper value={8} label="8" max={8} onDecrement={() => {}} onIncrement={() => {}} />
      </ThemeProvider>,
    )
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    expect(buttons[1].props.disabled).toBe(true)
  })

  it("has no upper bound when max is omitted", () => {
    const onIncrement = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <Stepper value={999} label="999" onDecrement={() => {}} onIncrement={onIncrement} />
      </ThemeProvider>,
    )
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    fireEvent.press(buttons[1])
    expect(onIncrement).toHaveBeenCalledTimes(1)
  })
})

import { TouchableOpacity } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { PhotoSlot } from "./PhotoSlot"

describe("PhotoSlot", () => {
  describe("empty state (photo = null)", () => {
    it("renders the label text", () => {
      const { getByText } = render(
        <ThemeProvider>
          <PhotoSlot label="Foto KTP" photo={null} onCapture={() => {}} onRemove={() => {}} />
        </ThemeProvider>,
      )
      expect(getByText("Foto KTP")).toBeDefined()
    })

    it("calls onCapture when the tile is pressed", () => {
      const onCapture = jest.fn()
      const { UNSAFE_getAllByType } = render(
        <ThemeProvider>
          <PhotoSlot label="Foto KTP" photo={null} onCapture={onCapture} onRemove={() => {}} />
        </ThemeProvider>,
      )
      const buttons = UNSAFE_getAllByType(TouchableOpacity)
      fireEvent.press(buttons[0])
      expect(onCapture).toHaveBeenCalledTimes(1)
    })
  })

  describe("filled state (photo provided)", () => {
    const photo = { id: "1", uri: "https://example.com/photo.jpg" }

    it("renders the label text", () => {
      const { getByText } = render(
        <ThemeProvider>
          <PhotoSlot label="Foto SIM" photo={photo} onCapture={() => {}} onRemove={() => {}} />
        </ThemeProvider>,
      )
      expect(getByText("Foto SIM")).toBeDefined()
    })

    it("calls onRemove when the close button is pressed", () => {
      const onRemove = jest.fn()
      const { UNSAFE_getAllByType } = render(
        <ThemeProvider>
          <PhotoSlot label="Foto SIM" photo={photo} onCapture={() => {}} onRemove={onRemove} />
        </ThemeProvider>,
      )
      // In filled state, the only TouchableOpacity is the close button inside PhotoThumb
      const buttons = UNSAFE_getAllByType(TouchableOpacity)
      fireEvent.press(buttons[0])
      expect(onRemove).toHaveBeenCalledTimes(1)
    })
  })
})

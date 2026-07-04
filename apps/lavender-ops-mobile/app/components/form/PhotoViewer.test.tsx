import { render, fireEvent } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { PhotoViewer } from "./PhotoViewer"

describe("PhotoViewer", () => {
  it("renders the image when visible with a uri", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <PhotoViewer visible uri="https://example.com/p.jpg" onClose={() => {}} />
      </ThemeProvider>,
    )
    expect(getByTestId("photo-viewer-image")).toBeDefined()
  })

  it("does not render the image when uri is null", () => {
    const { queryByTestId } = render(
      <ThemeProvider>
        <PhotoViewer visible uri={null} onClose={() => {}} />
      </ThemeProvider>,
    )
    expect(queryByTestId("photo-viewer-image")).toBeNull()
  })

  it("fires onClose when the close button is pressed", () => {
    const onClose = jest.fn()
    const { getByTestId } = render(
      <ThemeProvider>
        <PhotoViewer visible uri="https://example.com/p.jpg" onClose={onClose} />
      </ThemeProvider>,
    )
    fireEvent.press(getByTestId("photo-viewer-close"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

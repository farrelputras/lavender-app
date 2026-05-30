import { ActivityIndicator, TouchableOpacity } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { PhotoRow } from "./PhotoRow"

describe("PhotoRow", () => {
  it("renders the add tile label", () => {
    const { getByText } = render(
      <ThemeProvider>
        <PhotoRow photos={[]} onAdd={() => {}} onRemove={() => {}} />
      </ThemeProvider>,
    )
    expect(getByText("Tambah Foto")).toBeDefined()
  })

  it("renders a custom add label", () => {
    const { getByText } = render(
      <ThemeProvider>
        <PhotoRow photos={[]} onAdd={() => {}} onRemove={() => {}} addLabel="Foto KTP" />
      </ThemeProvider>,
    )
    expect(getByText("Foto KTP")).toBeDefined()
  })

  it("fires onAdd when add tile is pressed", () => {
    const onAdd = jest.fn()
    const { getByText } = render(
      <ThemeProvider>
        <PhotoRow photos={[]} onAdd={onAdd} onRemove={() => {}} />
      </ThemeProvider>,
    )
    fireEvent.press(getByText("Tambah Foto"))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it("renders Image component when photo has a non-null uri", () => {
    const photos = [{ id: "1", uri: "https://example.com/photo.jpg" }]
    const { getByTestId } = render(
      <ThemeProvider>
        <PhotoRow photos={photos} onAdd={() => {}} onRemove={() => {}} />
      </ThemeProvider>,
    )
    expect(getByTestId("photo-thumb-image")).toBeDefined()
  })

  it("shows ActivityIndicator when photo status is pending", () => {
    const photos = [{ id: "1", uri: "https://example.com/photo.jpg", status: "pending" as const }]
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <PhotoRow photos={photos} onAdd={() => {}} onRemove={() => {}} />
      </ThemeProvider>,
    )
    expect(UNSAFE_getAllByType(ActivityIndicator).length).toBe(1)
  })

  it("does NOT show ActivityIndicator when status is absent", () => {
    const photos = [{ id: "1", uri: "https://example.com/photo.jpg" }]
    const { UNSAFE_queryAllByType } = render(
      <ThemeProvider>
        <PhotoRow photos={photos} onAdd={() => {}} onRemove={() => {}} />
      </ThemeProvider>,
    )
    expect(UNSAFE_queryAllByType(ActivityIndicator).length).toBe(0)
  })

  it("calls onRemove with the photo id when close button is pressed", () => {
    const onRemove = jest.fn()
    const photos = [{ id: "abc123", uri: "https://example.com/photo.jpg" }]
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <PhotoRow photos={photos} onAdd={() => {}} onRemove={onRemove} />
      </ThemeProvider>,
    )
    // Index 0 = addTile, index 1 = close button inside PhotoThumb
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    fireEvent.press(buttons[1])
    expect(onRemove).toHaveBeenCalledWith("abc123")
  })
})

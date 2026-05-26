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
})

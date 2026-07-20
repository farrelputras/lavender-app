import { ActivityIndicator, TouchableOpacity } from "react-native"
import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { EditActionBar } from "./EditActionBar"

describe("EditActionBar", () => {
  it("renders default Simpan / Batal labels", () => {
    const { getByText } = render(
      <ThemeProvider>
        <EditActionBar saving={false} onSave={() => {}} onCancel={() => {}} />
      </ThemeProvider>,
    )
    expect(getByText("Simpan")).toBeDefined()
    expect(getByText("Batal")).toBeDefined()
  })

  it("renders custom labels", () => {
    const { getByText } = render(
      <ThemeProvider>
        <EditActionBar
          saving={false}
          onSave={() => {}}
          onCancel={() => {}}
          saveLabel="Simpan Catatan"
          cancelLabel="Buang Perubahan"
        />
      </ThemeProvider>,
    )
    expect(getByText("Simpan Catatan")).toBeDefined()
    expect(getByText("Buang Perubahan")).toBeDefined()
  })

  it("fires onSave when Save is pressed and not saving", () => {
    const onSave = jest.fn()
    const { getByText } = render(
      <ThemeProvider>
        <EditActionBar saving={false} onSave={onSave} onCancel={() => {}} />
      </ThemeProvider>,
    )
    fireEvent.press(getByText("Simpan"))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("fires onCancel when Cancel is pressed and not saving", () => {
    const onCancel = jest.fn()
    const { getByText } = render(
      <ThemeProvider>
        <EditActionBar saving={false} onSave={() => {}} onCancel={onCancel} />
      </ThemeProvider>,
    )
    fireEvent.press(getByText("Batal"))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("disables both Save and Cancel while saving (re-entrancy guard, debt #2)", () => {
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <EditActionBar saving onSave={() => {}} onCancel={() => {}} />
      </ThemeProvider>,
    )
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    expect(buttons).toHaveLength(2)
    buttons.forEach((b) => expect(b.props.disabled).toBe(true))
  })

  it("leaves both buttons enabled when not saving", () => {
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <EditActionBar saving={false} onSave={() => {}} onCancel={() => {}} />
      </ThemeProvider>,
    )
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    buttons.forEach((b) => expect(b.props.disabled).toBeFalsy())
  })

  it("shows a spinner instead of the Save label while saving", () => {
    const { queryByText, UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <EditActionBar saving onSave={() => {}} onCancel={() => {}} />
      </ThemeProvider>,
    )
    expect(queryByText("Simpan")).toBeNull()
    expect(UNSAFE_getAllByType(ActivityIndicator).length).toBe(1)
  })
})

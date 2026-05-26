import { render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { SectionLabel } from "./SectionLabel"

describe("SectionLabel", () => {
  it("renders the text content", () => {
    const { getByText } = render(
      <ThemeProvider>
        <SectionLabel>Jaminan</SectionLabel>
      </ThemeProvider>,
    )
    expect(getByText("Jaminan")).toBeDefined()
  })
})

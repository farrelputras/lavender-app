import { render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { VersionFooter } from "./VersionFooter"

jest.mock("expo-updates", () => ({
  updateId: null,
  createdAt: null,
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Updates = require("expo-updates")

describe("VersionFooter", () => {
  it("always shows the release constant", () => {
    const { getByText } = render(
      <ThemeProvider>
        <VersionFooter />
      </ThemeProvider>,
    )
    expect(getByText("Lavender Ops · v1.0.3")).toBeDefined()
  })

  it("shows 'bawaan' when running the bundle embedded in the APK", () => {
    Updates.updateId = null
    Updates.createdAt = null

    const { getByText } = render(
      <ThemeProvider>
        <VersionFooter />
      </ThemeProvider>,
    )
    expect(getByText("pembaruan bawaan")).toBeDefined()
  })

  it("shows the short update id and date when running an OTA update", () => {
    Updates.updateId = "a1b2c3d4-5e6f-7890-abcd-ef1234567890"
    Updates.createdAt = new Date(2026, 6, 12)

    const { getByText } = render(
      <ThemeProvider>
        <VersionFooter />
      </ThemeProvider>,
    )
    expect(getByText("pembaruan a1b2c3d · 12 Juli 2026")).toBeDefined()
  })
})

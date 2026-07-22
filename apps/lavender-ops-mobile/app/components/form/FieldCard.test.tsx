import { render } from "@testing-library/react-native"

import { Text } from "@/components/AppText"
import { ThemeProvider } from "@/theme/context"

import { FieldCard } from "./FieldCard"

describe("FieldCard", () => {
  it("renders children", () => {
    const { getByText } = render(
      <ThemeProvider>
        <FieldCard>
          <Text>inside</Text>
        </FieldCard>
      </ThemeProvider>,
    )
    expect(getByText("inside")).toBeDefined()
  })

  it("applies style overrides", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <FieldCard style={{ borderColor: "red" }}>
          <Text testID="content">x</Text>
        </FieldCard>
      </ThemeProvider>,
    )
    expect(getByTestId("content")).toBeDefined()
  })
})

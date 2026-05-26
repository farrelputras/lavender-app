import { render } from "@testing-library/react-native"
import { ThemeProvider } from "@/theme/context"

import { FuelGauge } from "./FuelGauge"

describe("FuelGauge", () => {
  it("renders the default 8 segments", () => {
    const { UNSAFE_root } = render(
      <ThemeProvider>
        <FuelGauge value={4} />
      </ThemeProvider>,
    )
    expect(UNSAFE_root).toBeDefined()
  })

  it("respects a custom max", () => {
    const { UNSAFE_root } = render(
      <ThemeProvider>
        <FuelGauge value={2} max={4} />
      </ThemeProvider>,
    )
    expect(UNSAFE_root).toBeDefined()
  })
})

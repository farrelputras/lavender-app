// eslint-disable-next-line react-native/split-platform-components -- see showToast.ts
import { Platform, ToastAndroid, Alert } from "react-native"

import { showToast } from "./showToast"

/**
 * `Platform.OS` is a plain property on the RN Platform object, but TypeScript types it as a
 * readonly literal union. Redefine it rather than assigning, so tsc stays happy.
 */
function setPlatform(os: "android" | "ios") {
  Object.defineProperty(Platform, "OS", { get: () => os, configurable: true })
}

describe("showToast", () => {
  const originalOS = Platform.OS

  afterEach(() => {
    setPlatform(originalOS as "android" | "ios")
    jest.restoreAllMocks()
  })

  it("uses a native Android toast on Android", () => {
    setPlatform("android")
    const spy = jest.spyOn(ToastAndroid, "show").mockImplementation(() => {})

    showToast("Rental tersimpan")

    expect(spy).toHaveBeenCalledWith("Rental tersimpan", ToastAndroid.SHORT)
  })

  it("falls back to a titleless alert off Android", () => {
    setPlatform("ios")
    const spy = jest.spyOn(Alert, "alert").mockImplementation(() => {})

    showToast("Rental tersimpan")

    expect(spy).toHaveBeenCalledWith("", "Rental tersimpan")
  })
})

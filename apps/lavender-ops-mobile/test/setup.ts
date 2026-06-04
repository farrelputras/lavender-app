// we always make sure 'react-native' gets included first
// eslint-disable-next-line no-restricted-imports
import * as ReactNative from "react-native"

import mockFile from "./mockFile"

// Polyfill Web Crypto so `uuid` works under jest. In the app, `react-native-get-random-values`
// provides global.crypto.getRandomValues; jest-expo's sandbox may not expose it, so fall back
// to node's webcrypto (node >= 20). Guarded — won't clobber an existing global.crypto.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { webcrypto } = require("node:crypto")

if (
  typeof globalThis.crypto === "undefined" ||
  typeof globalThis.crypto.getRandomValues === "undefined"
) {
  // @ts-expect-error assign node's webcrypto to the global that `uuid` reads
  globalThis.crypto = webcrypto
}

// libraries to mock
// Attach static method stubs directly onto the Image class so it remains a valid React component
// (spreading Image into a plain object loses its function/class nature and breaks <Image> rendering).
ReactNative.Image.resolveAssetSource = jest.fn((_source) => mockFile) // eslint-disable-line @typescript-eslint/no-unused-vars
// @ts-ignore — getSize is a static method not in the public type, but exists at runtime
ReactNative.Image.getSize = jest.fn(
  (
    uri: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    success: (width: number, height: number) => void,
    _failure?: (_error: any) => void, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) => success(100, 100),
)

jest.mock("i18next", () => ({
  currentLocale: "en",
  t: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
  translate: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
}))

jest.mock("expo-localization", () => ({
  ...jest.requireActual("expo-localization"),
  getLocales: () => [{ languageTag: "en-US", textDirection: "ltr" }],
}))

jest.mock("../app/i18n/index.ts", () => ({
  i18n: {
    isInitialized: true,
    language: "en",
    t: (key: string, params: Record<string, string>) => {
      return `${key} ${JSON.stringify(params)}`
    },
    numberToCurrency: jest.fn(),
  },
}))

declare const tron // eslint-disable-line @typescript-eslint/no-unused-vars

declare global {
  let __TEST__: boolean
}

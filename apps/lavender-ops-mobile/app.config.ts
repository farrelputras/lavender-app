import { ExpoConfig, ConfigContext } from "@expo/config"

/**
 * Use tsx/cjs here so we can use TypeScript for our Config Plugins
 * and not have to compile them to JavaScript.
 *
 * See https://docs.expo.dev/config-plugins/plugins/#add-typescript-support-and-convert-to-dynamic-app-config
 */
import "tsx/cjs"

// Build-variant identity: the dev build installs as "Lavender Ops Dev" with a
// distinct package id so it can coexist with mom's real "Lavender Ops" build.
// APP_VARIANT is set per build profile in eas.json (development profile only).
const IS_DEV = process.env.APP_VARIANT === "development"

/**
 * @param config ExpoConfig coming from the static config app.json if it exists
 *
 * You can read more about Expo's Configuration Resolution Rules here:
 * https://docs.expo.dev/workflow/configuration/#configuration-resolution-rules
 */
module.exports = ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const existingPlugins = config.plugins ?? []

  return {
    ...config,
    name: IS_DEV ? "Lavender Ops Dev" : "Lavender Ops",
    android: {
      ...config.android,
      package: IS_DEV ? "com.lavender.ops.dev" : "com.lavender.ops",
    },
    ios: {
      ...config.ios,
      bundleIdentifier: IS_DEV ? "com.lavender.ops.dev" : "com.lavender.ops",
      // This privacyManifests is to get you started.
      // See Expo's guide on apple privacy manifests here:
      // https://docs.expo.dev/guides/apple-privacy/
      // You may need to add more privacy manifests depending on your app's usage of APIs.
      // More details and a list of "required reason" APIs can be found in the Apple Developer Documentation.
      // https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"], // CA92.1 = "Access info from same app, per documentation"
          },
        ],
      },
    },
    plugins: [...existingPlugins],
  }
}

/**
 * The version string shown to mom in the Beranda footer.
 *
 * This is deliberately NOT `app.json`'s `version`, and NOT
 * `Application.nativeApplicationVersion`.
 *
 * `app.json` is pinned at "1.0.0" because `runtimeVersion.policy` is `appVersion` — OTA
 * updates are published against the runtime version, and mom's installed APK is runtime
 * "1.0.0". Bumping it would silently cut her off from every future update. So the native
 * version reports "1.0.0" forever and is useless as a release identifier.
 *
 * This constant ships *inside* the OTA bundle, so it is always the truth about the JS
 * mom is actually running — including the diagnostic case: if an update fails to apply,
 * her screen still shows the old number.
 *
 * ⚠️ Hand-maintained. Bump it before every `pnpm ota:publish`. Nothing enforces this.
 */
export const RELEASE = "1.0.4"

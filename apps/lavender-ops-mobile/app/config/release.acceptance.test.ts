// PRD-1 AC-9: "Ships OTA-only: app.json version unchanged, no native dep, no APK."
//
// The "no APK" half is a deployment fact, not something a unit test can observe. The "no native
// dep added" half is verified structurally (git diff shows package.json untouched on this
// branch — checked directly, not via a test, since jest has no meaningful way to assert "nobody
// added a dependency"). This file locks in the one piece that IS a durable, testable regression
// guard: `app.json`'s `version` staying pinned at "1.0.0", which is load-bearing per
// `app/services/supabase/client.ts`'s neighbor doc and CLAUDE.md — `runtimeVersion.policy` is
// `appVersion`, so bumping this without an APK ship would silently strand mom's OTA delivery.

import appJson from "../../app.json"

describe("AC-9: app.json version stays pinned for an OTA-only release", () => {
  it("version is still 1.0.0 (unbumped) — v1.0.3 ships OTA only, no APK", () => {
    expect((appJson as { version: string }).version).toBe("1.0.0")
  })
})

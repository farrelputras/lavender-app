// Tester-authored (v1.0.4) — acceptance layer ABOVE the developer's own AppText.test.tsx.
// AppText.test.tsx proves the wrapper's *behavior in isolation* (default, override, ref
// forwarding, nesting). This file proves the *durability* guarantees PRD-5 BR-8 actually asks
// for — "one shared decision... so a new screen inherits it" — by reading the real source tree
// rather than rendering a single component. These are static/structural checks: they read
// `.tsx`/`.ts` files as text and assert on patterns. They do NOT prove any screen visually
// renders correctly at 1.5x — see the visual-audit checklist for that. What they DO prove, with
// certainty a render-based test cannot: that the cap cannot silently regress to being defined (or
// bypassed) in a second place without a source-controlled diff showing it.
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { MAX_FONT_SCALE } from "./AppText"
import { listAppSourceFiles } from "../../test/listAppSourceFiles"

const APP_DIR = join(__dirname, "..") // app/

describe("MAX_FONT_SCALE — exactly one definition site app-wide (PRD-5 BR-8)", () => {
  it("is defined in AppText.tsx and nowhere else under app/", () => {
    const files = listAppSourceFiles(APP_DIR)
    const definitionSites: string[] = []
    for (const file of files) {
      const text = readFileSync(file, "utf8")
      // Matches `const MAX_FONT_SCALE =` / `export const MAX_FONT_SCALE =` — a re-declaration,
      // not a mere reference (`MAX_FONT_SCALE` used as a value is fine and expected everywhere
      // the clamp is consumed).
      if (/\bMAX_FONT_SCALE\s*=\s*[\d.]/.test(text)) {
        definitionSites.push(file)
      }
    }
    expect(definitionSites).toEqual([join(__dirname, "AppText.tsx")])
  })

  it("is 1.5 — the value the release report records as Farrel's settled call", () => {
    expect(MAX_FONT_SCALE).toBe(1.5)
  })
})

describe("no call site defeats the cap with an explicit higher override (PRD-5 AC-7 — 'no further growth beyond it')", () => {
  it("contains no maxFontSizeMultiplier={<number greater than MAX_FONT_SCALE>} literal anywhere under app/", () => {
    const files = listAppSourceFiles(APP_DIR)
    const offenders: { file: string; value: string }[] = []
    const pattern = /maxFontSizeMultiplier=\{?\s*([\d.]+)\s*\}?/g
    for (const file of files) {
      const text = readFileSync(file, "utf8")
      let match: RegExpExecArray | null
      while ((match = pattern.exec(text))) {
        const value = parseFloat(match[1])
        if (!Number.isNaN(value) && value > MAX_FONT_SCALE) {
          offenders.push({ file, value: match[1] })
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

describe("no raw react-native Text/TextInput import survives outside the wrapper (redundant insurance alongside no-restricted-imports)", () => {
  it("no production file (excluding AppText.tsx itself and *.test.* files) imports Text/TextInput as a value from 'react-native' without the same eslint-disable exemption the lint gate itself honors", () => {
    // Mirrors what `no-restricted-imports` (measured 37 → 0 by Lead, see the release report)
    // actually enforces: a line immediately preceded by
    // `// eslint-disable-next-line no-restricted-imports` is a *known, reviewed* exception —
    // `app/components/Text.tsx` and `app/components/TextField.tsx` (the pre-existing, dead
    // Ignite Text/TextField primitives, F-2) carry exactly this, predating v1.0.4, for the same
    // reason `AppText.tsx` itself must import the raw components to wrap them. A naive text
    // search that ignores the disable comment would flag those two files as false positives —
    // confirmed by running `npx eslint` on them directly: 0 `no-restricted-imports` errors.
    const files = listAppSourceFiles(APP_DIR).filter(
      (f) => !f.endsWith(`${require("node:path").sep}AppText.tsx`) && !/\.test\.[jt]sx?$/.test(f),
    )
    const offenders: string[] = []
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n")
      lines.forEach((line, i) => {
        if (!/^import\s+\{[^}]*\}\s+from\s+["']react-native["']/.test(line)) return
        if (!/\bText\b/.test(line) && !/\bTextInput\b/.test(line)) return
        const prevLine = i > 0 ? lines[i - 1] : ""
        const exempted = /eslint-disable-next-line\s+no-restricted-imports/.test(prevLine)
        if (!exempted) offenders.push(`${file}:${i + 1}`)
      })
    }
    expect(offenders).toEqual([])
  })
})

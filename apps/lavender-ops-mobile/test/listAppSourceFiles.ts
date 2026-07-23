// Test-only helper (v1.0.4, Tester) — recursively lists `.ts`/`.tsx` source files under a
// directory, skipping `node_modules`. Used by static/structural acceptance tests that need to
// scan the real source tree rather than render a single component (e.g. proving `MAX_FONT_SCALE`
// has exactly one definition site, PRD-5 BR-8).
import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"

export function listAppSourceFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...listAppSourceFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      results.push(full)
    }
  }
  return results
}

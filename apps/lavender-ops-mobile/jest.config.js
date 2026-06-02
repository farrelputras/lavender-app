/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/test/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/app/$1",
    // `uuid` v11 is ESM-first: its exports map only exposes a CJS build under the
    // `node`/`browser` conditions, but jest-expo's resolver activates neither (it
    // matches only `default` → ESM), so jest can't load it. Point jest straight at
    // the CJS build. Test-only — Metro/RN still resolve uuid's real exports.
    "^uuid$": "<rootDir>/node_modules/uuid/dist/cjs/index.js",
  },
}

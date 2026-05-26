# Ignite Migration Plan: apps/mobile → apps/lavender-ops-mobile

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Lavender rental app from `apps/mobile` (Expo Router) into the Ignite boilerplate at `apps/lavender-ops-mobile` (React Navigation), preserving the connector contract, rental math, and all screen logic.

**Architecture:** All connectors and utilities move verbatim (no logic changes). The routing layer is rewritten as programmatic React Navigation stacks. Ignite's ThemeProvider replaces the direct token import pattern.

**Tech Stack:** Expo SDK 55, React Navigation 7, React Native 0.83, TypeScript strict, Ignite boilerplate, in-memory connectors (demo phase)

---

## Label Legend

- 🟦 **DIY** — mechanical, no transformation needed; do it yourself in your editor
- 🔴 **AI** — requires code transformation, context-aware wiring, or cross-file consistency

---

## Phase 0: Clean Up Ignite Demo Content

> Remove everything demo-specific so the boilerplate is a blank slate.

### Task 1 — Delete Demo Screens 🟦 DIY

**Files to delete** (in `apps/lavender-ops-mobile/`):
```
app/screens/DemoShowroomScreen/   ← entire folder
app/screens/DemoCommunityScreen.tsx
app/screens/DemoDebugScreen.tsx
app/screens/DemoPodcastListScreen.tsx
app/screens/LoginScreen.tsx
app/screens/WelcomeScreen.tsx
app/context/EpisodeContext.tsx
app/i18n/demo-en.ts
app/i18n/demo-ar.ts
app/i18n/demo-es.ts
app/i18n/demo-fr.ts
app/i18n/demo-hi.ts
app/i18n/demo-ja.ts
app/i18n/demo-ko.ts
```

- [ ] Delete all files listed above using your file explorer or terminal
- [ ] Verify: `apps/lavender-ops-mobile/app/screens/` should contain only `ErrorScreen/`

---

### Task 2 — Stub AuthContext 🟦 DIY

**File:** `apps/lavender-ops-mobile/app/context/AuthContext.tsx`

Replace the entire file with this stub (demo phase has no login):

```tsx
import { createContext, FC, PropsWithChildren, useContext } from "react"

type AuthContextType = { isAuthenticated: boolean }

const AuthContext = createContext<AuthContextType>({ isAuthenticated: true })

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => (
  <AuthContext.Provider value={{ isAuthenticated: true }}>
    {children}
  </AuthContext.Provider>
)

export const useAuth = () => useContext(AuthContext)
```

- [ ] Replace `app/context/AuthContext.tsx` with the stub above
- [ ] Commit: `git commit -m "chore: stub AuthContext for demo phase"`

---

## Phase 1: Copy Data Layer (Zero Logic Changes)

> These files move verbatim. Don't edit business logic — just copy.

### Task 3 — Copy Connectors 🟦 DIY

Create `apps/lavender-ops-mobile/app/services/rentals/` and copy three files from `apps/mobile/src/connectors/`:

| Source | Destination |
|--------|-------------|
| `apps/mobile/src/connectors/types.ts` | `apps/lavender-ops-mobile/app/services/rentals/types.ts` |
| `apps/mobile/src/connectors/seed.ts` | `apps/lavender-ops-mobile/app/services/rentals/seed.ts` |
| `apps/mobile/src/connectors/index.ts` | `apps/lavender-ops-mobile/app/services/rentals/index.ts` |

- [ ] Create folder `app/services/rentals/`
- [ ] Copy the three files verbatim
- [ ] **Do not change any logic.** Only update relative imports if they break (e.g., if `seed.ts` imports from `../something`, adjust the path)
- [ ] Commit: `git commit -m "chore: copy connectors to services/rentals"`

---

### Task 4 — Copy Utilities 🟦 DIY

Copy from `apps/mobile/src/lib/` to `apps/lavender-ops-mobile/app/utils/`:

| Source | Destination |
|--------|-------------|
| `apps/mobile/src/lib/rentalMath.ts` | `apps/lavender-ops-mobile/app/utils/rentalMath.ts` |
| `apps/mobile/src/lib/format.ts` | `apps/lavender-ops-mobile/app/utils/format.ts` |

> ⚠️ Do NOT copy `supabase.ts` — the Ignite boilerplate doesn't have Supabase wired yet.

- [ ] Copy the two files verbatim
- [ ] Commit: `git commit -m "chore: copy rentalMath and format utils"`

---

## Phase 2: Foundation — Theme, Config, Boot

### Task 5 — Update App Config 🟦 DIY

**File:** `apps/lavender-ops-mobile/app.json`

Update these fields to match the Lavender Ops app identity:

```json
{
  "expo": {
    "name": "Lavender Ops",
    "slug": "lavender-ops-mobile",
    "scheme": "lavenderops",
    "ios": { "bundleIdentifier": "com.lavender.ops" },
    "android": { "package": "com.lavender.ops" }
  }
}
```

- [ ] Update `name`, `slug`, `scheme`, `ios.bundleIdentifier`, `android.package` in `app.json`

**File:** `apps/lavender-ops-mobile/package.json`

Add Public Sans font, keep Space Grotesk until typography is updated:
```
pnpm add @expo-google-fonts/public-sans
```
- [ ] Run the command above from inside `apps/lavender-ops-mobile/`
- [ ] Commit: `git commit -m "chore: update app identity and add Public Sans font"`

---

### Task 6 — Theme Tokens 🔴 AI

> Map the existing M3 tokens from `apps/mobile/src/theme/index.ts` into Ignite's split-file format.
> **Hand this to Claude.** Provide both files and ask to map tokens.

**Files Claude will modify:**
- `apps/lavender-ops-mobile/app/theme/colors.ts` — remap to Lavender's M3 palette (primary `#62528d`, background `#f6faff`, surfaces, error, success, warning)
- `apps/lavender-ops-mobile/app/theme/colorsDark.ts` — dark variants (extend from light for now)
- `apps/lavender-ops-mobile/app/theme/spacing.ts` — map `xs/sm/md/lg/xl/xxl/xxxl` tokens
- `apps/lavender-ops-mobile/app/theme/typography.ts` — map Public Sans 4 weights + 8 text styles

**What to tell Claude:** "Map `apps/mobile/src/theme/index.ts` tokens into the 4 Ignite theme files. Keep `themed()` and `useAppTheme()` working."

---

### Task 7 — Metro Config Monorepo Merge 🔴 AI

> `apps/lavender-ops-mobile/metro.config.js` needs the monorepo watchFolders + dual node_modules from `apps/mobile/metro.config.js` merged in.

**Files Claude will modify:**
- `apps/lavender-ops-mobile/metro.config.js`

**What to tell Claude:** "Merge the monorepo config from `apps/mobile/metro.config.js` (watchFolders for root, dual node_modules, disableHierarchicalLookup) into `apps/lavender-ops-mobile/metro.config.js` without breaking Ignite's inline requires or axios compat."

---

### Task 8 — Simplify app.tsx Boot 🔴 AI

> Remove i18n dependency from boot sequence (app is Indonesian-only; no need for `initI18n` blocking render). Keep ThemeProvider, AuthProvider, KeyboardProvider, SafeAreaProvider.

**File Claude will modify:** `apps/lavender-ops-mobile/app/app.tsx`

**What to tell Claude:** "Remove the i18n and navigation persistence from `app.tsx`. The app should boot with: SafeAreaProvider → KeyboardProvider → AuthProvider → ThemeProvider → AppNavigator. Keep font loading and splash screen management."

---

## Phase 3: Navigation Wiring

> This is the highest-effort phase. All four tasks are AI — the routing rewrite is the core of the migration.

### Task 9 — Define All Route Types 🔴 AI

**File Claude will write:** `apps/lavender-ops-mobile/app/navigators/navigationTypes.ts`

Replace the demo types with Lavender's screen params. Claude needs to define:

```
AppStackParamList:
  MainTabs (nested)
  PenyewaanDetail: { rentalId: string }
  Pengembalian: { rentalId: string }
  SewaBaru (nested stack)

MainTabParamList:
  Beranda: undefined
  Penyewaan: undefined
  Hutang: undefined
  UserTab: undefined

SewaBaruParamList:
  PilihUser: undefined
  PilihKendaraan: { userId: string }
  DetailSewa: { userId: string; vehicleId: string }
```

**What to tell Claude:** "Write `navigationTypes.ts` for Lavender using the Ignite pattern. Screens are: main tabs (Beranda, Penyewaan, Hutang, UserTab), detail stacks (PenyewaanDetail, Pengembalian), and SewaBaru flow (PilihUser → PilihKendaraan → DetailSewa)."

---

### Task 10 — MainNavigator (Bottom Tabs) 🔴 AI

**File Claude will write:** `apps/lavender-ops-mobile/app/navigators/MainNavigator.tsx`

Replaces `DemoNavigator.tsx`. Should match the tab structure from `apps/mobile/app/(tabs)/_layout.tsx`:
- Beranda (home icon, Ionicons)
- Penyewaan (car icon)
- Hutang (wallet icon)
- User (person icon)

Uses `createBottomTabNavigator<MainTabParamList>()` with Ignite's `themed()` + `useAppTheme()` pattern. Screen components will be stub `<View>` placeholders initially.

**What to tell Claude:** "Write `MainNavigator.tsx` using Ignite's DemoNavigator as the pattern but with Lavender's 4 tabs (Beranda, Penyewaan, Hutang, UserTab). Use Ionicons. Screen components are stubs for now."

---

### Task 11 — AppNavigator Rewrite 🔴 AI

**File Claude will modify:** `apps/lavender-ops-mobile/app/navigators/AppNavigator.tsx`

Replace Login/Welcome/Demo routes with:
- `MainTabs` → `MainNavigator`
- `PenyewaanDetail` → `PenyewaanDetailScreen`
- `Pengembalian` → `PengembalianScreen`
- `SewaBaru` → `SewaBaruNavigator` (nested stack)

Remove auth-gated logic (`isAuthenticated` check) — all routes always accessible in demo.

**What to tell Claude:** "Rewrite `AppNavigator.tsx` for Lavender. Remove auth branching. Register: MainTabs (using MainNavigator), PenyewaanDetail, Pengembalian, SewaBaru (nested stack). Screen components are stubs for now."

---

### Task 12 — SewaBaruNavigator 🔴 AI

**File Claude will write:** `apps/lavender-ops-mobile/app/navigators/SewaBaruNavigator.tsx`

A `createNativeStackNavigator<SewaBaruParamList>()` with 3 screens (PilihUser → PilihKendaraan → DetailSewa), headers hidden, stub screen components.

**What to tell Claude:** "Write `SewaBaruNavigator.tsx` — a native stack with 3 screens: PilihUser, PilihKendaraan, DetailSewa. Stubs for now. Follow Ignite conventions."

---

## Phase 4: Screen Migrations

> Each screen is a copy-and-adapt from `apps/mobile/app/`. The core logic stays identical; only the navigation API and theme access changes.

**The two patterns that change in every screen:**

| Old (Expo Router) | New (Ignite) |
|-------------------|--------------|
| `import { router } from 'expo-router'` | `import { useNavigation } from '@react-navigation/native'` |
| `router.push('/penyewaan/123')` | `navigation.navigate('PenyewaanDetail', { rentalId: '123' })` |
| `import { colors } from '@/theme'` | `const { theme: { colors } } = useAppTheme()` |
| `useLocalSearchParams()` | `route.params.rentalId` via `AppStackScreenProps<'PenyewaanDetail'>` |
| File path = route | Explicit `Stack.Screen name=...` in navigator |

---

### Task 13 — Beranda Screen 🔴 AI

**Source:** `apps/mobile/app/(tabs)/index.tsx`
**Destination:** `apps/lavender-ops-mobile/app/screens/BerandaScreen.tsx`

Changes: theme access → `useAppTheme()`, navigation to SewaBaru → `navigation.navigate('SewaBaru')`, connector imports → `../../services/rentals`.

---

### Task 14 — Penyewaan Screen (list) 🔴 AI

**Source:** `apps/mobile/app/(tabs)/penyewaan.tsx`
**Destination:** `apps/lavender-ops-mobile/app/screens/PenyewaanScreen.tsx`

Changes: navigation to detail → `navigation.navigate('PenyewaanDetail', { rentalId: id })`.

---

### Task 15 — Hutang Screen 🔴 AI

**Source:** `apps/mobile/app/(tabs)/hutang.tsx`
**Destination:** `apps/lavender-ops-mobile/app/screens/HutangScreen.tsx`

---

### Task 16 — User Screen 🔴 AI

**Source:** `apps/mobile/app/(tabs)/user.tsx`
**Destination:** `apps/lavender-ops-mobile/app/screens/UserScreen.tsx`

---

### Task 17 — PenyewaanDetail Screen 🔴 AI

**Source:** `apps/mobile/app/penyewaan/[id].tsx`
**Destination:** `apps/lavender-ops-mobile/app/screens/PenyewaanDetailScreen.tsx`

Changes: `useLocalSearchParams()` → `route.params.rentalId` (typed via `AppStackScreenProps<'PenyewaanDetail'>`), navigation to Pengembalian → `navigation.navigate('Pengembalian', { rentalId })`.

---

### Task 18 — Pengembalian Screen 🔴 AI

**Source:** `apps/mobile/app/penyewaan/pengembalian/[id].tsx`
**Destination:** `apps/lavender-ops-mobile/app/screens/PengembalianScreen.tsx`

Changes: params from route, connector imports, theme access.

---

### Task 19 — PilihUser Screen 🔴 AI

**Source:** `apps/mobile/app/sewa-baru/pilih-user.tsx`
**Destination:** `apps/lavender-ops-mobile/app/screens/PilihUserScreen.tsx`

Changes: navigation forward → `navigation.navigate('PilihKendaraan', { userId })`.

---

### Task 20 — PilihKendaraan Screen 🔴 AI

**Source:** `apps/mobile/app/sewa-baru/pilih-kendaraan.tsx`
**Destination:** `apps/lavender-ops-mobile/app/screens/PilihKendaraanScreen.tsx`

---

### Task 21 — DetailSewa Screen 🔴 AI

**Source:** `apps/mobile/app/sewa-baru/detail-sewa.tsx`
**Destination:** `apps/lavender-ops-mobile/app/screens/DetailSewaScreen.tsx`

---

### Task 22 — PembayaranSheet Component 🔴 AI

**Source:** `apps/mobile/src/components/PembayaranSheet.tsx`
**Destination:** `apps/lavender-ops-mobile/app/components/PembayaranSheet.tsx`

Changes: theme access only (`useAppTheme()` instead of direct import).

---

## Phase 5: Cleanup

### Task 23 — Remove Unused Boilerplate 🟦 DIY

After all screens compile:
- [ ] Delete `app/navigators/DemoNavigator.tsx`
- [ ] Delete `app/screens/ErrorScreen/` (or keep — it's useful for production)
- [ ] Remove Space Grotesk from `package.json` if replaced by Public Sans
- [ ] Run `npx tsc --noEmit` and fix any remaining type errors

### Task 24 — TypeScript Clean Pass 🔴 AI

Run `npx tsc --noEmit` in `apps/lavender-ops-mobile/`. Hand the output to Claude for a final fix pass.

---

## Verification

After all tasks complete:

```powershell
cd apps/lavender-ops-mobile
npx tsc --noEmit          # Must pass with 0 errors
npx expo start            # App must boot to Beranda tab
```

Manual test path:
1. Beranda loads dashboard data (getDashboardSummary, getRentalsDueToday)
2. Tap "Sewa Baru" → PilihUser → PilihKendaraan → DetailSewa → create rental
3. Penyewaan tab shows rental → tap → PenyewaanDetail → Tambah Pembayaran
4. PenyewaanDetail → Proses Pengembalian → submit → rental marked complete

---

## Summary: DIY vs AI

| Phase | Task | Label |
|-------|------|-------|
| 0 | Delete demo screens/context | 🟦 DIY |
| 0 | Stub AuthContext | 🟦 DIY |
| 1 | Copy connectors (3 files) | 🟦 DIY |
| 1 | Copy utils (2 files) | 🟦 DIY |
| 2 | Update app.json + add font dep | 🟦 DIY |
| 2 | Theme tokens (colors, spacing, typography) | 🔴 AI |
| 2 | metro.config.js monorepo merge | 🔴 AI |
| 2 | app.tsx simplification | 🔴 AI |
| 3 | navigationTypes.ts | 🔴 AI |
| 3 | MainNavigator (tabs) | 🔴 AI |
| 3 | AppNavigator rewrite | 🔴 AI |
| 3 | SewaBaruNavigator | 🔴 AI |
| 4 | 9 screens + PembayaranSheet | 🔴 AI |
| 5 | Delete dead boilerplate | 🟦 DIY |
| 5 | TS clean pass | 🔴 AI |

**DIY tasks: 6** (mostly file copies and deletions — safe to do any time)
**AI tasks: 11** (routing, theme, screens — do these in order, Phase 2 → 3 → 4)

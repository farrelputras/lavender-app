# Phase 5 — Auth + Frontend Features (User / Hutang / Rental tabs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the day-to-day-usable frontend on top of the Phase 4 Supabase connector — login + session, User tab (list / detail / create / edit / delete), Hutang tab (list AKTIF / detail / record payment / create manual), and Rental tab (basic list). Beranda's `User Baru` button gets wired to the new flow. Connector-contract preserved: all DB access goes through `app/services/rentals/*` async functions whose signatures are locked.

**Architecture:**
1. **Auth-gated routing** — `AppNavigator` switches between `AuthStack` (LoginScreen) and `AppStack` based on a Supabase session listener. Session itself is persisted by `expo-secure-store` (already wired in `app/services/supabase/client.ts`).
2. **One new migration `0008_user_photos.sql`** adds two JSONB columns to `users` (`ktp_photo`, `ktm_photo`) so the User form can render KTP/KTM photo slots from day 1. Upload itself defers to Phase 6 — Phase 5 stores `null`.
3. **Connector additions only** — every new screen calls a *new* async function in `app/services/rentals/index.ts`. Existing function signatures stay frozen.
4. **Screens compose form primitives** from `app/components/form/` (Phase 0). No new inline `Stepper`/`FuelGauge`/`SectionLabel` declarations.
5. **List screens follow the `PilihUserScreen` pattern** — `SafeAreaView` + searchbar + `SectionList`/`FlatList` + chip rows + `useFocusEffect` data load.

**Tech Stack:** Expo SDK 55 dev-client, React Native 0.83, Ignite (React Navigation v7), TypeScript strict, `@supabase/supabase-js` v2, `expo-secure-store`, Jest (existing 43 tests must remain green).

---

## Context

Phase 4 is code-complete: the connector layer is fully migrated to Supabase, SQL migrations `0001–0007` are written, and the in-memory `seed.ts` is deleted. Pending Phase 4 items are user-run (apply migrations, create the two auth users, create the `rental-photos` storage bucket, set `.env`).

Once those manual steps are done, the app shell still has placeholder screens for `RentalScreen` / `HutangScreen` / `UserScreen` / `KendaraanScreen`. Mom can already see Beranda and walk the full Sewa Baru → Detail → Pengembalian flow (Phase 4 deliverable), but cannot register users, browse the user list, manage debt, or even sign in — every Beranda load talks to Supabase unauthenticated, which RLS will reject the moment migrations land.

Phase 5 turns the app into the **day-to-day operations tool** described in `docs/superpowers/specs/2026-05-26-v1-roadmap-design.md` §3. Auth must land first (5a) because RLS gates every screen; the three feature tabs (5b/5c/5d) then plug into the gated shell. Phase 5e ("Beranda bottom-nav label adjustment") is already done by commit `276a6c6` (tab renamed Penyewaan → Rental) — kept as a one-step verification task only.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `apps/lavender-ops-mobile/supabase/migrations/0008_user_photos.sql` | Add `ktp_photo JSONB` + `ktm_photo JSONB` to `users`; same `{id, path}` shape as `KondisiSnapshot.photos[]` |
| `app/screens/LoginScreen.tsx` | Email + password fields, sign-in button, error banner, loading state |
| `app/screens/UserDetailScreen.tsx` | View one user: identity, verification, KTP/KTM photo slots, active rentals count, debt total, action row (Edit / Hapus) |
| `app/screens/UserFormScreen.tsx` | Single component handles both create + edit (param-driven) — name, nickname, phone, is_mahasiswa toggle, alamat, kontak_darurat, notes, KTP/KTM `PhotoRow` slots, save button |
| `app/screens/HutangDetailScreen.tsx` | View one hutang: user, jumlah_awal, sisa, status badge, linked rental (if any), payment list, "Tambah Pembayaran" button |
| `app/screens/HutangFormScreen.tsx` | Manual hutang creation only — user picker reusing `UserSummary` row, jumlah_awal `RupiahInput`, notes |
| `app/navigators/AuthNavigator.tsx` | Stack with `Login` route only |
| `app/services/auth/useSession.ts` | Hook wrapping `supabase.auth.getSession()` + `onAuthStateChange`; returns `{ session, loading, signIn, signOut }` |
| `app/services/rentals/translators.test.ts` | Unit tests for new translator additions (`rowToUser`, `rowToHutangFull`, `rowToRentalListItem`) |

### Files modified (Phase 5 scope)

| Path | Change |
|---|---|
| `app/navigators/AppNavigator.tsx` | Auth-gated switch: render `AuthNavigator` when no session, `AppStack` when session present. Add new stack screens `UserDetail`, `UserForm`, `HutangDetail`, `HutangForm` |
| `app/navigators/navigationTypes.ts` | Add the new route params to `AppStackParamList`; add `AuthStackParamList` |
| `app/screens/BerandaScreen.tsx` | `User Baru` button → `navigation.navigate("UserForm", { mode: "create" })`. Header avatar → sign-out (Alert confirm) |
| `app/screens/UserScreen.tsx` | Replace placeholder with full list (search, A-Z sections, debt badge), FAB → `UserForm({mode:"create"})` |
| `app/screens/HutangScreen.tsx` | Replace placeholder with AKTIF hutang list, FAB → `HutangForm` |
| `app/screens/RentalScreen.tsx` | Replace placeholder with all-rentals list (sorted DESC by `startAt`), card → `PenyewaanDetail` |
| `app/services/rentals/types.ts` | Widen `User` with `isMahasiswa`, `verificationStatus`, `alamat`, `kontakDarurat`, `notes`, `ktpPhoto`, `ktmPhoto`; add `HutangFull`, `RentalListItem`, `CreateUserInput`, `UpdateUserInput` |
| `app/services/rentals/translators.ts` | Add `rowToUser`, `rowToHutangFull`, `rowToRentalListItem` |
| `app/services/rentals/index.ts` | Add `getUser`, `createUser`, `updateUser`, `getHutangs`, `getHutangFull`, `addHutangPayment`, `getRentals` |

### Files modified (incidental, per `docs/02` connector-contract preservation)

None — connector signatures and existing screens (`DetailSewa`, `PengembalianScreen`, `PenyewaanDetail`) are not touched.

---

## Task list

> Style guide: each task block is one "session-of-work" (2-5 minutes per checkbox step). Commit at the end of each task. `pnpm run compile` must stay clean between tasks; `pnpm test` must stay at 43+/43+ passing. Do not skip steps.

---

### Task 0: Preflight — Phase 4 manual steps confirmed

The plan assumes the four manual Phase 4 actions are complete. If not, do them first.

**Files:** none (operational checklist)

- [ ] **Step 0.1: Confirm Supabase project state**

```powershell
cd apps/lavender-ops-mobile
Get-Content .env | Select-String "EXPO_PUBLIC_SUPABASE"
```

Expected: `EXPO_PUBLIC_SUPABASE_URL=...` and `EXPO_PUBLIC_SUPABASE_ANON_KEY=...` both populated.

- [ ] **Step 0.2: Confirm both auth users exist**

Visit Supabase dashboard → Auth → Users. Both `mom@lavender.local` and `farrel@lavender.local` should be listed with confirmed status.

- [ ] **Step 0.3: Confirm `app_config` rows**

In Supabase SQL editor: `SELECT * FROM app_config;`. Expected: two rows (`mom`, `farrel`) with UUIDs matching the Auth users from 0.2.

- [ ] **Step 0.4: Confirm `rental-photos` bucket exists**

Supabase dashboard → Storage. Bucket `rental-photos` should be listed with "Private" visibility.

If any step fails, complete the Phase 4 pending checklist before proceeding.

---

## Sub-phase 5a — Auth (login + session)

### Task 1: Migration 0008 — user photo columns

**Files:**
- Create: `apps/lavender-ops-mobile/supabase/migrations/0008_user_photos.sql`

- [ ] **Step 1.1: Write the migration**

```sql
-- 0008_user_photos.sql
-- Adds KTP and KTM photo columns to users for Phase 5b user CRUD.
-- Same {id, path} shape used in rentals.kondisi_keluar.photos[].
-- Phase 6 will populate `path` with real storage object paths; Phase 5b
-- leaves them NULL.

ALTER TABLE users
  ADD COLUMN ktp_photo JSONB,
  ADD COLUMN ktm_photo JSONB;

-- Rebuild v_user_summaries so the column additions are visible.
-- Phase 4 view body unchanged otherwise — only the SELECT list is widened.
DROP VIEW IF EXISTS v_user_summaries;
CREATE VIEW v_user_summaries AS
SELECT
  u.id,
  u.name,
  u.nickname,
  u.phone,
  u.is_mahasiswa,
  u.verification_status,
  u.verified_at,
  u.nama_pddikti,
  u.tahun_masuk,
  u.universitas,
  u.prodi,
  u.alamat,
  u.kontak_darurat,
  u.notes,
  u.ktp_photo,
  u.ktm_photo,
  COALESCE(ar.cnt, 0)::int  AS active_rentals_count,
  COALESCE(d.sisa, 0)::int  AS debt_amount,
  u.deleted_at
FROM users u
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS cnt
  FROM rentals r
  WHERE r.user_id = u.id AND r.status = 'ACTIVE'
) ar ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(h.jumlah_awal), 0)
       - COALESCE((
           SELECT SUM(p.amount)
           FROM payments p
           WHERE p.hutang_id IN (
             SELECT id FROM hutang h2
             WHERE h2.user_id = u.id AND h2.status = 'AKTIF'
           )
         ), 0) AS sisa
  FROM hutang h
  WHERE h.user_id = u.id AND h.status = 'AKTIF'
) d ON true
WHERE u.deleted_at IS NULL;
```

- [ ] **Step 1.2: Apply migration to Supabase**

Paste the SQL into the Supabase dashboard's SQL editor and run. Expected: `ALTER TABLE` then `CREATE VIEW` succeed, both with `Success. No rows returned.`

- [ ] **Step 1.3: Verify columns and view**

In SQL editor:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('ktp_photo','ktm_photo');
-- Expected: 2 rows

SELECT column_name FROM information_schema.columns
WHERE table_name = 'v_user_summaries' AND column_name IN ('ktp_photo','ktm_photo');
-- Expected: 2 rows
```

- [ ] **Step 1.4: Commit**

```bash
git add apps/lavender-ops-mobile/supabase/migrations/0008_user_photos.sql
git commit -m "feat(phase-5a): add user KTP/KTM photo columns + rebuild v_user_summaries"
```

---

### Task 2: Session hook (`useSession`)

**Files:**
- Create: `apps/lavender-ops-mobile/app/services/auth/useSession.ts`

- [ ] **Step 2.1: Implement the hook**

```ts
// app/services/auth/useSession.ts
import { useEffect, useState, useCallback } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "../supabase/client"

interface UseSessionResult {
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return { session, loading, signIn, signOut }
}
```

- [ ] **Step 2.2: Verify compile**

Run: `pnpm run compile`
Expected: `0 errors`.

- [ ] **Step 2.3: Commit**

```bash
git add apps/lavender-ops-mobile/app/services/auth/useSession.ts
git commit -m "feat(phase-5a): add useSession hook for Supabase auth state"
```

---

### Task 3: LoginScreen

**Files:**
- Create: `apps/lavender-ops-mobile/app/screens/LoginScreen.tsx`

- [ ] **Step 3.1: Implement LoginScreen**

```tsx
// app/screens/LoginScreen.tsx
import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useSession } from "@/services/auth/useSession"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"

export function LoginScreen() {
  const { signIn } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      // useSession will flip the AppNavigator switch automatically
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login gagal")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Text style={[textStyles.displayMd, { color: colors.onSurface }]}>Lavender Ops</Text>
          <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, marginBottom: 24 }]}>
            Masuk untuk mulai kelola rental
          </Text>

          <Text style={[textStyles.labelLg, styles.label]}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            editable={!submitting}
            placeholder="mom@lavender.local"
            placeholderTextColor={colors.onSurfaceVariant}
          />

          <Text style={[textStyles.labelLg, styles.label]}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!submitting}
            placeholder="••••••••"
            placeholderTextColor={colors.onSurfaceVariant}
          />

          {error && (
            <View style={styles.errorBanner}>
              <Text style={[textStyles.bodyMd, { color: colors.onErrorContainer }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            disabled={!canSubmit}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Masuk</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: "center" },
  label: { color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    height: 48,
    borderRadius: borderRadius.input,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
    color: colors.onSurface,
  },
  errorBanner: {
    marginTop: spacing.md,
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.card,
    padding: spacing.md,
  },
  submitBtn: {
    height: 52,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { opacity: 0.5 },
})
```

- [ ] **Step 3.2: Run compile**

Run: `pnpm run compile`
Expected: clean.

- [ ] **Step 3.3: Commit**

```bash
git add apps/lavender-ops-mobile/app/screens/LoginScreen.tsx
git commit -m "feat(phase-5a): LoginScreen with email/password sign-in"
```

---

### Task 4: AuthNavigator + AppNavigator gate

**Files:**
- Create: `apps/lavender-ops-mobile/app/navigators/AuthNavigator.tsx`
- Modify: `apps/lavender-ops-mobile/app/navigators/AppNavigator.tsx`
- Modify: `apps/lavender-ops-mobile/app/navigators/navigationTypes.ts`

- [ ] **Step 4.1: Add `AuthStackParamList` to navigationTypes**

Edit `app/navigators/navigationTypes.ts`. Add directly above `AppStackParamList`:

```ts
export type AuthStackParamList = {
  Login: undefined
}
```

- [ ] **Step 4.2: Create AuthNavigator**

```tsx
// app/navigators/AuthNavigator.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { LoginScreen } from "@/screens/LoginScreen"

import type { AuthStackParamList } from "./navigationTypes"

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  )
}
```

- [ ] **Step 4.3: Wire the auth gate in AppNavigator**

Modify `app/navigators/AppNavigator.tsx`. Replace the body of `AppNavigator` with the gated version:

```tsx
import { ActivityIndicator, View } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import Config from "@/config"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { PengembalianScreen } from "@/screens/PengembalianScreen"
import { PenyewaanDetailScreen } from "@/screens/PenyewaanDetailScreen"
import { useSession } from "@/services/auth/useSession"
import { useAppTheme } from "@/theme/context"
import { colors } from "@/theme/tokens"

import { AuthNavigator } from "./AuthNavigator"
import { MainNavigator } from "./MainNavigator"
import type { AppStackParamList, NavigationProps } from "./navigationTypes"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { SewaBaruNavigator } from "./SewaBaruNavigator"

const exitRoutes = Config.exitRoutes
const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = () => {
  const { theme: { colors: themeColors } } = useAppTheme()
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: themeColors.background,
        contentStyle: { backgroundColor: themeColors.background },
      }}
      initialRouteName="MainTabs"
    >
      <Stack.Screen name="MainTabs" component={MainNavigator} />
      <Stack.Screen name="PenyewaanDetail" component={PenyewaanDetailScreen} />
      <Stack.Screen name="Pengembalian" component={PengembalianScreen} />
      <Stack.Screen name="SewaBaru" component={SewaBaruNavigator} />
      {/* Phase 5b / 5c — stack screens added in their own tasks */}
    </Stack.Navigator>
  )
}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()
  const { session, loading } = useSession()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        {session ? <AppStack /> : <AuthNavigator />}
      </ErrorBoundary>
    </NavigationContainer>
  )
}
```

- [ ] **Step 4.4: Verify compile**

Run: `pnpm run compile`
Expected: clean.

- [ ] **Step 4.5: Smoke-test login on device**

Run `pnpm run start`. With the dev-client APK on Mom's spare phone:
1. App opens at Login.
2. Enter `mom@lavender.local` + the dashboard-set password → Beranda loads with real data.
3. Force-close the app, reopen → Beranda loads directly (session persisted).

- [ ] **Step 4.6: Commit**

```bash
git add apps/lavender-ops-mobile/app/navigators/AuthNavigator.tsx apps/lavender-ops-mobile/app/navigators/AppNavigator.tsx apps/lavender-ops-mobile/app/navigators/navigationTypes.ts
git commit -m "feat(phase-5a): auth-gated AppNavigator + AuthNavigator with LoginScreen"
```

---

### Task 5: Sign-out affordance on Beranda

**Files:**
- Modify: `apps/lavender-ops-mobile/app/screens/BerandaScreen.tsx`

- [ ] **Step 5.1: Wrap the header avatar in a sign-out TouchableOpacity**

In `BerandaScreen.tsx`, add the import:

```ts
import { Alert } from "react-native"
import { useSession } from "@/services/auth/useSession"
```

Inside `BerandaScreen()` add:

```ts
const { signOut } = useSession()

const handleSignOut = () => {
  Alert.alert("Keluar?", "Anda akan diminta login lagi.", [
    { text: "Batal", style: "cancel" },
    {
      text: "Keluar",
      style: "destructive",
      onPress: () => {
        signOut()
      },
    },
  ])
}
```

Replace the `<View style={styles.avatar}>...</View>` block in the header JSX with:

```tsx
<TouchableOpacity
  style={styles.avatar}
  onPress={handleSignOut}
  activeOpacity={0.7}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <MaterialIcons name="person" size={24} color={colors.onPrimary} />
</TouchableOpacity>
```

- [ ] **Step 5.2: Verify compile**

Run: `pnpm run compile`. Expected: clean.

- [ ] **Step 5.3: Smoke-test sign-out flow**

In running app: tap header avatar → confirm dialog → tap "Keluar" → LoginScreen appears. Sign in again → Beranda restored.

- [ ] **Step 5.4: Commit**

```bash
git add apps/lavender-ops-mobile/app/screens/BerandaScreen.tsx
git commit -m "feat(phase-5a): tap header avatar to sign out"
```

---

## Sub-phase 5b — User CRUD

### Task 6: Widen `User` type + add CreateUserInput / UpdateUserInput

**Files:**
- Modify: `apps/lavender-ops-mobile/app/services/rentals/types.ts`

- [ ] **Step 6.1: Update the `User` interface**

Replace the existing `User` interface with:

```ts
export interface User {
  id: string
  name: string
  nickname: string | null
  phone: string
  isMahasiswa: boolean
  verifiedAt: Date | null
  verificationStatus: VerificationStatus
  namaPddikti: string | null
  tahunMasuk: number | null
  universitas: string | null
  prodi: string | null
  alamat: string | null
  kontakDarurat: string | null
  notes: string | null
  ktpPhoto: { id: string; uri: string | null } | null
  ktmPhoto: { id: string; uri: string | null } | null
}
```

Add directly below:

```ts
export interface CreateUserInput {
  name: string
  nickname: string | null
  phone: string
  isMahasiswa: boolean
  alamat: string | null
  kontakDarurat: string | null
  notes: string | null
}

export type UpdateUserInput = CreateUserInput
```

- [ ] **Step 6.2: Verify compile**

Run: `pnpm run compile`. Expected: clean (only `User` consumers exist in this phase — translator + connector are written next).

- [ ] **Step 6.3: Commit**

```bash
git add apps/lavender-ops-mobile/app/services/rentals/types.ts
git commit -m "feat(phase-5b): widen User type with all DB-backed fields; add CreateUserInput"
```

---

### Task 7: `rowToUser` translator + test

**Files:**
- Create test: `apps/lavender-ops-mobile/app/services/rentals/translators.test.ts`
- Modify: `apps/lavender-ops-mobile/app/services/rentals/translators.ts`

- [ ] **Step 7.1: Write failing test**

Create `translators.test.ts`:

```ts
import { rowToUser } from "./translators"

describe("rowToUser", () => {
  it("maps full user row to camelCase UI shape", () => {
    const row = {
      id: "u1",
      name: "Siti",
      nickname: "Sis",
      phone: "0811",
      is_mahasiswa: true,
      verification_status: "BELUM_DIVERIFIKASI",
      verified_at: null,
      nama_pddikti: null,
      tahun_masuk: null,
      universitas: null,
      prodi: null,
      alamat: "Jl. Mawar",
      kontak_darurat: "Bapak Joko 0822",
      notes: null,
      ktp_photo: null,
      ktm_photo: null,
    }
    const user = rowToUser(row)
    expect(user).toEqual({
      id: "u1",
      name: "Siti",
      nickname: "Sis",
      phone: "0811",
      isMahasiswa: true,
      verifiedAt: null,
      verificationStatus: "BELUM_DIVERIFIKASI",
      namaPddikti: null,
      tahunMasuk: null,
      universitas: null,
      prodi: null,
      alamat: "Jl. Mawar",
      kontakDarurat: "Bapak Joko 0822",
      notes: null,
      ktpPhoto: null,
      ktmPhoto: null,
    })
  })

  it("preserves ktp_photo {id,path} as {id, uri:null} (Phase 5 leaves uri null)", () => {
    const row = {
      id: "u1", name: "X", nickname: null, phone: "0",
      is_mahasiswa: false, verification_status: "BELUM_DIVERIFIKASI",
      verified_at: null, nama_pddikti: null, tahun_masuk: null,
      universitas: null, prodi: null, alamat: null, kontak_darurat: null, notes: null,
      ktp_photo: { id: "p1", path: "users/u1/ktp/p1.jpg" },
      ktm_photo: null,
    }
    const user = rowToUser(row)
    expect(user.ktpPhoto).toEqual({ id: "p1", uri: null })
  })
})
```

- [ ] **Step 7.2: Run — should FAIL**

```powershell
pnpm test -- translators.test.ts
```

Expected: `rowToUser is not a function`.

- [ ] **Step 7.3: Implement `rowToUser`**

Append to `translators.ts`:

```ts
import type { User, VerificationStatus } from "./types"

export function rowToUser(row: Record<string, unknown>): User {
  const ktp = row.ktp_photo as { id: string; path: string } | null
  const ktm = row.ktm_photo as { id: string; path: string } | null
  return {
    id: row.id as string,
    name: row.name as string,
    nickname: (row.nickname as string | null) ?? null,
    phone: row.phone as string,
    isMahasiswa: (row.is_mahasiswa as boolean) ?? false,
    verifiedAt: row.verified_at ? new Date(row.verified_at as string) : null,
    verificationStatus: (row.verification_status as VerificationStatus) ?? "BELUM_DIVERIFIKASI",
    namaPddikti: (row.nama_pddikti as string | null) ?? null,
    tahunMasuk: (row.tahun_masuk as number | null) ?? null,
    universitas: (row.universitas as string | null) ?? null,
    prodi: (row.prodi as string | null) ?? null,
    alamat: (row.alamat as string | null) ?? null,
    kontakDarurat: (row.kontak_darurat as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    ktpPhoto: ktp ? { id: ktp.id, uri: null } : null,
    ktmPhoto: ktm ? { id: ktm.id, uri: null } : null,
  }
}
```

- [ ] **Step 7.4: Test passes**

```powershell
pnpm test -- translators.test.ts
```

Expected: both cases pass.

- [ ] **Step 7.5: Commit**

```bash
git add apps/lavender-ops-mobile/app/services/rentals/translators.ts apps/lavender-ops-mobile/app/services/rentals/translators.test.ts
git commit -m "feat(phase-5b): rowToUser translator with KTP/KTM photo mapping"
```

---

### Task 8: User connectors — `getUser`, `createUser`, `updateUser`

**Files:**
- Modify: `apps/lavender-ops-mobile/app/services/rentals/index.ts`

- [ ] **Step 8.1: Add `getUser`**

Add after the existing `getUserSummary`:

```ts
import { rowToUser } from "./translators"
import { User, CreateUserInput, UpdateUserInput } from "./types"

export async function getUser(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) throw error
  return data ? rowToUser(data as Record<string, unknown>) : null
}
```

- [ ] **Step 8.2: Add `createUser` and `updateUser`**

```ts
export async function createUser(input: CreateUserInput): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .insert({
      name: input.name,
      nickname: input.nickname,
      phone: input.phone,
      is_mahasiswa: input.isMahasiswa,
      alamat: input.alamat,
      kontak_darurat: input.kontakDarurat,
      notes: input.notes,
      verification_status: "BELUM_DIVERIFIKASI",
    })
    .select("*")
    .single()
  if (error) throw error
  return rowToUser(data as Record<string, unknown>)
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .update({
      name: input.name,
      nickname: input.nickname,
      phone: input.phone,
      is_mahasiswa: input.isMahasiswa,
      alamat: input.alamat,
      kontak_darurat: input.kontakDarurat,
      notes: input.notes,
    })
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw error
  return rowToUser(data as Record<string, unknown>)
}
```

- [ ] **Step 8.3: Verify compile**

Run: `pnpm run compile`. Expected: clean.

- [ ] **Step 8.4: Commit**

```bash
git add apps/lavender-ops-mobile/app/services/rentals/index.ts
git commit -m "feat(phase-5b): add getUser/createUser/updateUser connectors"
```

---

### Task 9: User tab — list screen (`UserScreen`)

**Files:**
- Modify: `apps/lavender-ops-mobile/app/screens/UserScreen.tsx`
- Modify: `apps/lavender-ops-mobile/app/navigators/navigationTypes.ts`

- [ ] **Step 9.1: Add `UserDetail` and `UserForm` to `AppStackParamList`**

```ts
export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined
  PenyewaanDetail: { rentalId: string; justCreated?: boolean; justClosed?: boolean }
  Pengembalian: { rentalId: string }
  SewaBaru: NavigatorScreenParams<SewaBaruParamList> | undefined
  UserDetail: { userId: string }
  UserForm: { mode: "create" } | { mode: "edit"; userId: string }
}
```

- [ ] **Step 9.2: Replace UserScreen placeholder with full list**

Reuse the visual pattern from `PilihUserScreen` (already validated for UX). Build search + A-Z section list + FAB:

```tsx
// app/screens/UserScreen.tsx
import { useState, useCallback, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SectionList,
  ActivityIndicator,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppStackParamList } from "@/navigators/navigationTypes"
import { getUserSummaries } from "@/services/rentals"
import type { UserSummary } from "@/services/rentals/types"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { formatRupiah, initialsFromName } from "@/utils/format"

type Nav = NativeStackNavigationProp<AppStackParamList>

function groupByFirstLetter(rows: UserSummary[]) {
  const m = new Map<string, UserSummary[]>()
  for (const u of rows) {
    const l = u.name[0].toUpperCase()
    const b = m.get(l) ?? []
    b.push(u)
    m.set(l, b)
  }
  return Array.from(m.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, data]) => ({ title, data }))
}

function UserRow({ u, onPress }: { u: UserSummary; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.avatar}>
        <Text style={[textStyles.labelLg, { color: colors.onPrimaryContainer }]}>
          {initialsFromName(u.name)}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={[textStyles.bodyLg, { color: colors.onSurface }]} numberOfLines={1}>
          {u.nickname ? `${u.name} (${u.nickname})` : u.name}
        </Text>
        <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
          {u.phone}
        </Text>
        <View style={styles.chipRow}>
          {u.debtAmount > 0 && (
            <View style={[styles.chip, styles.chipDebt]}>
              <Text style={[textStyles.labelMd, { color: colors.onErrorContainer }]}>
                Hutang {formatRupiah(u.debtAmount)}
              </Text>
            </View>
          )}
          {u.activeRentalsCount > 0 && (
            <View style={[styles.chip, styles.chipActive]}>
              <Text style={[textStyles.labelMd, { color: colors.onWarningContainer }]}>
                Sewa Aktif ({u.activeRentalsCount})
              </Text>
            </View>
          )}
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  )
}

export function UserScreen() {
  const navigation = useNavigation<Nav>()
  const [rows, setRows] = useState<UserSummary[]>([])
  const [query, setQuery] = useState("")
  const [searchMode, setSearchMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const searchRef = useRef<TextInput>(null)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getUserSummaries().then((data) => {
        setRows(data)
        setLoading(false)
      })
    }, []),
  )

  const q = query.toLowerCase()
  const filtered = rows.filter(
    (u) => u.name.toLowerCase().includes(q) || (u.nickname?.toLowerCase().includes(q) ?? false),
  )
  const sections = groupByFirstLetter(rows)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>User</Text>
        <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
          {rows.length} total
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} style={{ marginRight: 8 }} />
          <TextInput
            ref={searchRef}
            style={[textStyles.bodyMd, styles.searchInput]}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchMode(true)}
            placeholder="Cari nama atau panggilan..."
            placeholderTextColor={colors.onSurfaceVariant}
          />
          {searchMode && query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
        {searchMode && (
          <TouchableOpacity
            onPress={() => {
              setQuery("")
              setSearchMode(false)
              searchRef.current?.blur()
            }}
          >
            <Text style={[textStyles.labelLg, { color: colors.primary }]}>Batal</Text>
          </TouchableOpacity>
        )}
      </View>

      {searchMode ? (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <UserRow u={item} onPress={() => navigation.navigate("UserDetail", { userId: item.id })} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
                Tidak ada user ditemukan
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <UserRow u={item} onPress={() => navigation.navigate("UserDetail", { userId: item.id })} />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={[textStyles.labelLg, { color: colors.onSurface }]}>{section.title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("UserForm", { mode: "create" })}
      >
        <MaterialIcons name="person-add" size={24} color={colors.onPrimary} />
        <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>User Baru</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xs,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, color: colors.onSurface, padding: 0 },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  listContent: { paddingBottom: 120, paddingTop: spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.card,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  rowBody: { flex: 1, gap: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chipDebt: { backgroundColor: colors.errorContainer },
  chipActive: { backgroundColor: colors.warningContainer },
  emptyState: { alignItems: "center", padding: 24 },
  fab: {
    position: "absolute",
    right: spacing.base,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    elevation: 6,
  },
})
```

- [ ] **Step 9.3: Verify compile**

`pnpm run compile` — expected clean (UserDetail/UserForm screens are next tasks; nav typing already declares them).

- [ ] **Step 9.4: Commit**

```bash
git add apps/lavender-ops-mobile/app/screens/UserScreen.tsx apps/lavender-ops-mobile/app/navigators/navigationTypes.ts
git commit -m "feat(phase-5b): UserScreen full list (search, A-Z sections, debt chip, FAB)"
```

---

### Task 10: User form screen (create + edit)

**Files:**
- Create: `apps/lavender-ops-mobile/app/screens/UserFormScreen.tsx`
- Modify: `apps/lavender-ops-mobile/app/navigators/AppNavigator.tsx` (register stack route)

- [ ] **Step 10.1: Implement UserFormScreen**

```tsx
// app/screens/UserFormScreen.tsx
import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

import { SectionLabel } from "@/components/form/SectionLabel"
import { FieldCard } from "@/components/form/FieldCard"
import { PhotoRow } from "@/components/form/PhotoRow"
import { BottomActionBar } from "@/components/form/BottomActionBar"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { createUser, getUser, updateUser } from "@/services/rentals"
import { colors, textStyles, spacing } from "@/theme/tokens"

export function UserFormScreen({ route, navigation }: AppStackScreenProps<"UserForm">) {
  const mode = route.params.mode
  const userId = mode === "edit" ? route.params.userId : null

  const [loading, setLoading] = useState(mode === "edit")
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [nickname, setNickname] = useState("")
  const [phone, setPhone] = useState("")
  const [isMahasiswa, setIsMahasiswa] = useState(true)
  const [alamat, setAlamat] = useState("")
  const [kontakDarurat, setKontakDarurat] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (mode !== "edit" || !userId) return
    getUser(userId).then((u) => {
      if (u) {
        setName(u.name)
        setNickname(u.nickname ?? "")
        setPhone(u.phone)
        setIsMahasiswa(u.isMahasiswa)
        setAlamat(u.alamat ?? "")
        setKontakDarurat(u.kontakDarurat ?? "")
        setNotes(u.notes ?? "")
      }
      setLoading(false)
    })
  }, [mode, userId])

  const canSave = name.trim().length > 0 && phone.trim().length > 0 && !saving

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        nickname: nickname.trim() || null,
        phone: phone.trim(),
        isMahasiswa,
        alamat: alamat.trim() || null,
        kontakDarurat: kontakDarurat.trim() || null,
        notes: notes.trim() || null,
      }
      if (mode === "create") {
        const user = await createUser(payload)
        navigation.replace("UserDetail", { userId: user.id })
      } else if (userId) {
        await updateUser(userId, payload)
        navigation.goBack()
      }
    } catch (e) {
      Alert.alert("Gagal menyimpan", e instanceof Error ? e.message : "Coba lagi")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface, flex: 1, marginLeft: spacing.sm }]}>
          {mode === "create" ? "User Baru" : "Edit User"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionLabel>Identitas</SectionLabel>
        <FieldCard>
          <Text style={styles.fieldLabel}>Nama Lengkap *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nama" />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Panggilan</Text>
          <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="(opsional)" />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>No. HP *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="0812..."
            keyboardType="phone-pad"
          />
        </FieldCard>

        <SectionLabel>Status</SectionLabel>
        <FieldCard>
          <View style={styles.toggleRow}>
            <Text style={[textStyles.bodyLg, { color: colors.onSurface, flex: 1 }]}>Mahasiswa</Text>
            <Switch
              value={isMahasiswa}
              onValueChange={setIsMahasiswa}
              trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
            />
          </View>
        </FieldCard>

        <SectionLabel>Kontak & Catatan</SectionLabel>
        <FieldCard>
          <Text style={styles.fieldLabel}>Alamat</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={alamat}
            onChangeText={setAlamat}
            placeholder="(opsional)"
            multiline
          />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Kontak Darurat</Text>
          <TextInput
            style={styles.input}
            value={kontakDarurat}
            onChangeText={setKontakDarurat}
            placeholder="(opsional)"
          />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Catatan</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="(opsional)"
            multiline
          />
        </FieldCard>

        <SectionLabel>Foto KTP / KTM</SectionLabel>
        <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginHorizontal: spacing.base, marginBottom: spacing.sm }]}>
          Upload foto akan diaktifkan setelah Phase 6 (sementara: placeholder).
        </Text>
        <View style={{ paddingHorizontal: spacing.base }}>
          <PhotoRow
            photos={[]}
            onAdd={() => Alert.alert("Belum aktif", "Foto user akan tersedia di Phase 6")}
            onRemove={() => {}}
          />
        </View>
      </ScrollView>

      <BottomActionBar
        primaryLabel={saving ? "Menyimpan…" : "Simpan"}
        onPrimary={() => {
          if (!canSave) return
          handleSave()
        }}
        onCancel={() => navigation.goBack()}
        loading={saving}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  scroll: { paddingBottom: 160 },
  fieldLabel: { color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 4 },
  divider: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing.sm },
  input: {
    color: colors.onSurface,
    fontSize: 16,
    padding: 0,
  },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
})
```

> **Verified component APIs** (read from source on 2026-05-29):
> - `FieldCard` is a wrapper-only — no `label`/`required` props. Labels are rendered inline above each input (see `styles.fieldLabel`); multiple fields per card are separated by a thin `styles.divider`. This matches the pattern in `PengembalianScreen.tsx`.
> - `PhotoRow` requires both `onAdd` and `onRemove`; there is no `disabled` prop. Phase 5 passes an Alert for `onAdd` and a no-op for `onRemove`.
> - `BottomActionBar` uses `onCancel` + `loading` + `cancelLabel` (default "Batal"). There is no `disabled` prop on the primary button — gate inside `onPrimary` via `if (!canSave) return`.

- [ ] **Step 10.2: Register stack route**

In `app/navigators/AppNavigator.tsx`, add import and `<Stack.Screen>`:

```tsx
import { UserFormScreen } from "@/screens/UserFormScreen"
// ... inside <Stack.Navigator>:
<Stack.Screen name="UserForm" component={UserFormScreen} />
```

- [ ] **Step 10.3: Verify compile**

`pnpm run compile` — expected clean.

- [ ] **Step 10.4: Commit**

```bash
git add apps/lavender-ops-mobile/app/screens/UserFormScreen.tsx apps/lavender-ops-mobile/app/navigators/AppNavigator.tsx
git commit -m "feat(phase-5b): UserFormScreen (create + edit) with photo placeholders"
```

---

### Task 11: User Detail screen

**Files:**
- Create: `apps/lavender-ops-mobile/app/screens/UserDetailScreen.tsx`
- Modify: `apps/lavender-ops-mobile/app/navigators/AppNavigator.tsx`

- [ ] **Step 11.1: Implement UserDetailScreen**

```tsx
// app/screens/UserDetailScreen.tsx
import { useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

import { SectionLabel } from "@/components/form/SectionLabel"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { getUser, getUserSummary, softDeleteUser } from "@/services/rentals"
import type { User, UserSummary } from "@/services/rentals/types"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { formatRupiah } from "@/utils/format"

export function UserDetailScreen({ route, navigation }: AppStackScreenProps<"UserDetail">) {
  const { userId } = route.params
  const [user, setUser] = useState<User | null>(null)
  const [summary, setSummary] = useState<UserSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      Promise.all([getUser(userId), getUserSummary(userId)]).then(([u, s]) => {
        setUser(u)
        setSummary(s)
        setLoading(false)
      })
    }, [userId]),
  )

  const handleDelete = () => {
    Alert.alert(
      "Hapus User?",
      "User akan disembunyikan dari daftar. Riwayat rental & hutang tetap tersimpan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            await softDeleteUser(userId)
            navigation.goBack()
          },
        },
      ],
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }
  if (!user || !summary) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={[textStyles.bodyLg, { color: colors.onSurfaceVariant, padding: spacing.lg }]}>
          User tidak ditemukan.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface, flex: 1, marginLeft: spacing.sm }]}>
          Detail User
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("UserForm", { mode: "edit", userId: user.id })}>
          <MaterialIcons name="edit" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.identityBlock}>
          <Text style={[textStyles.displaySm, { color: colors.onSurface }]}>
            {user.nickname ? `${user.name} (${user.nickname})` : user.name}
          </Text>
          <Text style={[textStyles.bodyLg, { color: colors.onSurfaceVariant }]}>{user.phone}</Text>
          {user.isMahasiswa && (
            <View style={[styles.chip, { backgroundColor: colors.surfaceVariant, marginTop: spacing.xs }]}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                {user.verificationStatus === "TERVERIFIKASI_PDDIKTI"
                  ? "Terverifikasi PDDikti"
                  : "Belum Diverifikasi PDDikti"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[textStyles.labelMd, { color: colors.secondary }]}>Sewa Aktif</Text>
            <Text style={[textStyles.headlineMd, { color: colors.onSurface }]}>
              {summary.activeRentalsCount}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[textStyles.labelMd, { color: colors.secondary }]}>Hutang</Text>
            <Text style={[textStyles.headlineMd, { color: colors.onSurface }]}>
              {formatRupiah(summary.debtAmount)}
            </Text>
          </View>
        </View>

        <SectionLabel>Kontak & Catatan</SectionLabel>
        <View style={styles.field}>
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Alamat</Text>
          <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>{user.alamat ?? "—"}</Text>
        </View>
        <View style={styles.field}>
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Kontak Darurat</Text>
          <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>{user.kontakDarurat ?? "—"}</Text>
        </View>
        <View style={styles.field}>
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Catatan</Text>
          <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>{user.notes ?? "—"}</Text>
        </View>

        {user.isMahasiswa && (user.namaPddikti || user.universitas) && (
          <>
            <SectionLabel>PDDikti</SectionLabel>
            <View style={styles.field}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Nama Resmi</Text>
              <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>
                {user.namaPddikti ?? "—"}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Universitas</Text>
              <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>
                {user.universitas ?? "—"} {user.prodi ? `· ${user.prodi}` : ""}
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
          <MaterialIcons name="delete" size={20} color={colors.error} />
          <Text style={[textStyles.labelLg, { color: colors.error }]}>Hapus User</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  scroll: { paddingBottom: spacing.xxl },
  identityBlock: { paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.xxs },
  chip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statsRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.base, marginTop: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.base,
    borderRadius: borderRadius.card,
    elevation: 2,
  },
  field: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: 2 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.error,
  },
})
```

- [ ] **Step 11.2: Register stack route**

Add to `AppNavigator.tsx`:

```tsx
import { UserDetailScreen } from "@/screens/UserDetailScreen"
// inside the Stack.Navigator:
<Stack.Screen name="UserDetail" component={UserDetailScreen} />
```

- [ ] **Step 11.3: Compile + smoke**

`pnpm run compile`. Smoke: log in → User tab → tap a seeded user (or one created via the form) → see details → tap edit pencil → save → returns to detail with updated values.

- [ ] **Step 11.4: Wire BerandaScreen "User Baru"**

In `BerandaScreen.tsx` replace the `User Baru` button's `onPress`:

```tsx
onPress={() => navigation.navigate("UserForm", { mode: "create" })}
```

- [ ] **Step 11.5: Commit**

```bash
git add apps/lavender-ops-mobile/app/screens/UserDetailScreen.tsx apps/lavender-ops-mobile/app/navigators/AppNavigator.tsx apps/lavender-ops-mobile/app/screens/BerandaScreen.tsx
git commit -m "feat(phase-5b): UserDetailScreen + wire Beranda User Baru button"
```

---

## Sub-phase 5c — Hutang tab

### Task 12: Hutang connector additions + types

**Files:**
- Modify: `apps/lavender-ops-mobile/app/services/rentals/types.ts`
- Modify: `apps/lavender-ops-mobile/app/services/rentals/translators.ts`
- Modify: `apps/lavender-ops-mobile/app/services/rentals/index.ts`

- [ ] **Step 12.1: Add `HutangFull` type**

```ts
// types.ts — append
export type HutangStatus = "AKTIF" | "LUNAS"

export interface HutangFull {
  id: string
  userId: string
  userName: string
  rentalId: string | null
  jumlahAwal: number
  sisa: number
  status: HutangStatus
  notes: string | null
  createdAt: Date
  payments: Payment[]
}
```

- [ ] **Step 12.2: Add `rowToHutangFull` translator**

```ts
// translators.ts — append
import type { HutangFull, Payment } from "./types"

export function rowToHutangFull(row: Record<string, unknown>): HutangFull {
  const payments = ((row.payments as Record<string, unknown>[] | null) ?? []).map((p): Payment => ({
    id: p.id as string,
    amount: p.amount as number,
    method: p.method as Payment["method"],
    methodDescription: (p.method_description as string | undefined) ?? undefined,
    paidAt: new Date(p.paid_at as string),
    notes: (p.notes as string | undefined) ?? undefined,
  }))
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const jumlahAwal = row.jumlah_awal as number
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: (row.user_name as string | null) ?? "",
    rentalId: (row.rental_id as string | null) ?? null,
    jumlahAwal,
    sisa: Math.max(0, jumlahAwal - totalPaid),
    status: row.status as HutangFull["status"],
    notes: (row.notes as string | null) ?? null,
    createdAt: new Date(row.created_at as string),
    payments,
  }
}
```

- [ ] **Step 12.3: Add SQL view for hutang aggregates**

Append to a new migration `0009_hutang_views.sql`:

```sql
-- v_hutang: hutang rows + user name + payments JSONB
DROP VIEW IF EXISTS v_hutang;
CREATE VIEW v_hutang AS
SELECT
  h.id,
  h.user_id,
  u.name        AS user_name,
  h.rental_id,
  h.jumlah_awal,
  h.status,
  h.notes,
  h.created_at,
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'id', p.id,
         'amount', p.amount,
         'method', p.method,
         'method_description', p.method_description,
         'paid_at', p.paid_at,
         'notes', p.notes
       ) ORDER BY p.paid_at
     )
     FROM payments p
     WHERE p.hutang_id = h.id),
    '[]'::jsonb
  ) AS payments
FROM hutang h
JOIN users u ON u.id = h.user_id;
```

Apply via Supabase SQL editor; verify with `SELECT id, user_name, jsonb_array_length(payments) FROM v_hutang;`.

- [ ] **Step 12.4: Add connector functions**

```ts
// index.ts — append
import { rowToHutangFull } from "./translators"
import { HutangFull, Payment } from "./types"

export async function getHutangs(activeOnly: boolean = true): Promise<HutangFull[]> {
  let q = supabase.from("v_hutang").select("*").order("created_at", { ascending: false })
  if (activeOnly) q = q.eq("status", "AKTIF")
  const { data, error } = await q
  if (error) throw error
  return (data as Record<string, unknown>[]).map(rowToHutangFull)
}

export async function getHutangFull(id: string): Promise<HutangFull | null> {
  const { data, error } = await supabase.from("v_hutang").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? rowToHutangFull(data as Record<string, unknown>) : null
}

export async function addHutangPayment(
  hutangId: string,
  input: Omit<Payment, "id">,
): Promise<HutangFull> {
  const { error } = await supabase.from("payments").insert({
    hutang_id: hutangId,
    rental_id: null,
    amount: input.amount,
    method: input.method,
    method_description: input.methodDescription,
    paid_at: input.paidAt.toISOString(),
    notes: input.notes,
  })
  if (error) throw error
  const h = await getHutangFull(hutangId)
  if (!h) throw new Error(`Hutang ${hutangId} not found after addHutangPayment`)
  return h
}
```

- [ ] **Step 12.5: Compile + commit**

```powershell
pnpm run compile
```

```bash
git add apps/lavender-ops-mobile/app/services/rentals/types.ts apps/lavender-ops-mobile/app/services/rentals/translators.ts apps/lavender-ops-mobile/app/services/rentals/index.ts apps/lavender-ops-mobile/supabase/migrations/0009_hutang_views.sql
git commit -m "feat(phase-5c): Hutang connector (getHutangs/getHutangFull/addHutangPayment) + v_hutang view"
```

---

### Task 13: HutangScreen — AKTIF list

**Files:**
- Modify: `apps/lavender-ops-mobile/app/screens/HutangScreen.tsx`
- Modify: `apps/lavender-ops-mobile/app/navigators/navigationTypes.ts`

- [ ] **Step 13.1: Extend stack param list**

```ts
// navigationTypes.ts
// add to AppStackParamList:
HutangDetail: { hutangId: string }
HutangForm: undefined
```

- [ ] **Step 13.2: Replace HutangScreen with the AKTIF list**

```tsx
// app/screens/HutangScreen.tsx
import { useState, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppStackParamList } from "@/navigators/navigationTypes"
import { getHutangs } from "@/services/rentals"
import type { HutangFull } from "@/services/rentals/types"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { formatRupiah } from "@/utils/format"

type Nav = NativeStackNavigationProp<AppStackParamList>

function HutangCard({ h, onPress }: { h: HutangFull; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <Text style={[textStyles.bodyLg, { color: colors.onSurface, flex: 1 }]} numberOfLines={1}>
          {h.userName}
        </Text>
        <Text style={[textStyles.headlineSm, { color: colors.error }]}>{formatRupiah(h.sisa)}</Text>
      </View>
      <View style={[styles.row, { marginTop: 4 }]}>
        <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
          Awal {formatRupiah(h.jumlahAwal)}
        </Text>
        {h.rentalId ? (
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
            Dari rental
          </Text>
        ) : (
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>Manual</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export function HutangScreen() {
  const nav = useNavigation<Nav>()
  const [items, setItems] = useState<HutangFull[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getHutangs(true).then((r) => {
        setItems(r)
        setLoading(false)
      })
    }, []),
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const totalSisa = items.reduce((s, h) => s + h.sisa, 0)

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Hutang Aktif</Text>
        <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
          {items.length} pelanggan · total {formatRupiah(totalSisa)}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <HutangCard h={item} onPress={() => nav.navigate("HutangDetail", { hutangId: item.id })} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
              Tidak ada hutang aktif.
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate("HutangForm")} activeOpacity={0.85}>
        <MaterialIcons name="add" size={24} color={colors.onPrimary} />
        <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Hutang Baru</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.base, paddingVertical: spacing.base, gap: 4 },
  list: { paddingBottom: 120 },
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.card,
    borderLeftColor: colors.error,
    borderLeftWidth: 4,
    elevation: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  empty: { alignItems: "center", padding: 24 },
  fab: {
    position: "absolute",
    right: spacing.base,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    elevation: 6,
  },
})
```

- [ ] **Step 13.3: Compile + commit**

```bash
git add apps/lavender-ops-mobile/app/screens/HutangScreen.tsx apps/lavender-ops-mobile/app/navigators/navigationTypes.ts
git commit -m "feat(phase-5c): HutangScreen AKTIF list with sisa + FAB to manual create"
```

---

### Task 14: HutangDetailScreen + Add Payment sheet

**Files:**
- Create: `apps/lavender-ops-mobile/app/screens/HutangDetailScreen.tsx`
- Modify: `apps/lavender-ops-mobile/app/navigators/AppNavigator.tsx`

- [ ] **Step 14.1: Implement HutangDetailScreen**

Reuse the existing `PembayaranSheet` component (already in `app/components/PembayaranSheet.tsx`). **Verified API**: default export, props `{ visible, onClose, onSubmit, defaultAmount }`. It is NOT coupled to rentals — it's a pure payment-entry sheet. Pass `defaultAmount={h.sisa}` to pre-fill.

```tsx
// app/screens/HutangDetailScreen.tsx
import { useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

import { SectionLabel } from "@/components/form/SectionLabel"
import PembayaranSheet from "@/components/PembayaranSheet"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { addHutangPayment, getHutangFull } from "@/services/rentals"
import type { HutangFull, Payment } from "@/services/rentals/types"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { formatRupiah, formatHeaderDate, formatTime } from "@/utils/format"

export function HutangDetailScreen({ route, navigation }: AppStackScreenProps<"HutangDetail">) {
  const { hutangId } = route.params
  const [h, setH] = useState<HutangFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)

  const reload = useCallback(() => {
    return getHutangFull(hutangId).then((res) => setH(res))
  }, [hutangId])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      reload().finally(() => setLoading(false))
    }, [reload]),
  )

  const handleAddPayment = async (p: Omit<Payment, "id">) => {
    try {
      const next = await addHutangPayment(hutangId, p)
      setH(next)
      setSheetOpen(false)
    } catch (e) {
      Alert.alert("Gagal menyimpan pembayaran", e instanceof Error ? e.message : "Coba lagi")
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }
  if (!h) return null

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface, flex: 1, marginLeft: spacing.sm }]}>
          Detail Hutang
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.summary}>
          <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Pelanggan</Text>
          <Text style={[textStyles.headlineMd, { color: colors.onSurface }]}>{h.userName}</Text>

          <View style={{ height: spacing.md }} />
          <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Sisa</Text>
          <Text style={[textStyles.displayMd, { color: h.sisa > 0 ? colors.error : colors.primary }]}>
            {formatRupiah(h.sisa)}
          </Text>
          <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
            dari {formatRupiah(h.jumlahAwal)}
          </Text>

          <View style={[styles.statusChip, { backgroundColor: h.status === "AKTIF" ? colors.errorContainer : colors.successContainer, marginTop: spacing.md }]}>
            <Text style={[textStyles.labelMd, { color: h.status === "AKTIF" ? colors.onErrorContainer : colors.onSuccessContainer }]}>
              {h.status}
            </Text>
          </View>
        </View>

        {h.rentalId && (
          <TouchableOpacity
            style={styles.linkBlock}
            onPress={() => navigation.navigate("PenyewaanDetail", { rentalId: h.rentalId! })}
          >
            <Text style={[textStyles.bodyLg, { color: colors.primary }]}>Lihat rental sumber</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}

        <SectionLabel>Pembayaran</SectionLabel>
        {h.payments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>
              Belum ada pembayaran.
            </Text>
          </View>
        ) : (
          h.payments.map((p) => (
            <View key={p.id} style={styles.payRow}>
              <View style={{ flex: 1 }}>
                <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>{p.method}</Text>
                <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
                  {formatHeaderDate(p.paidAt)} · {formatTime(p.paidAt)}
                </Text>
              </View>
              <Text style={[textStyles.bodyLg, { color: colors.onSurface }]}>{formatRupiah(p.amount)}</Text>
            </View>
          ))
        )}

        {h.status === "AKTIF" && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setSheetOpen(true)} activeOpacity={0.85}>
            <MaterialIcons name="add" size={20} color={colors.onPrimary} />
            <Text style={[textStyles.labelLg, { color: colors.onPrimary }]}>Tambah Pembayaran</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <PembayaranSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleAddPayment}
        defaultAmount={h.sisa}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  appBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  scroll: { paddingBottom: spacing.xxl },
  summary: { paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  statusChip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  linkBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.card,
  },
  empty: { alignItems: "center", padding: 24 },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.card,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary,
  },
})
```

> **Note on PembayaranSheet reuse:** verified — default export, `{visible, onClose, onSubmit, defaultAmount}`. The sheet handles its own amount/method/paidAt state and emits a complete `Omit<Payment, "id">` on submit. No coupling to rentals.

- [ ] **Step 14.2: Register stack route + compile**

```tsx
import { HutangDetailScreen } from "@/screens/HutangDetailScreen"
<Stack.Screen name="HutangDetail" component={HutangDetailScreen} />
```

`pnpm run compile` clean.

- [ ] **Step 14.3: Commit**

```bash
git add apps/lavender-ops-mobile/app/screens/HutangDetailScreen.tsx apps/lavender-ops-mobile/app/navigators/AppNavigator.tsx
git commit -m "feat(phase-5c): HutangDetailScreen with payment history + add-payment via PembayaranSheet"
```

---

### Task 15: HutangFormScreen — manual hutang creation

**Files:**
- Create: `apps/lavender-ops-mobile/app/screens/HutangFormScreen.tsx`
- Modify: `apps/lavender-ops-mobile/app/navigators/AppNavigator.tsx`

- [ ] **Step 15.1: Implement HutangFormScreen**

```tsx
// app/screens/HutangFormScreen.tsx
import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

import { SectionLabel } from "@/components/form/SectionLabel"
import { FieldCard } from "@/components/form/FieldCard"
import { RupiahInput } from "@/components/form/RupiahInput"
import { BottomActionBar } from "@/components/form/BottomActionBar"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { createManualHutang, getUserSummaries } from "@/services/rentals"
import type { UserSummary } from "@/services/rentals/types"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { parseRupiahInput } from "@/utils/format"

export function HutangFormScreen({ navigation }: AppStackScreenProps<"HutangForm">) {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [jumlahRaw, setJumlahRaw] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getUserSummaries().then((u) => {
      setUsers(u)
      setUsersLoading(false)
    })
  }, [])

  const filtered = users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
  const jumlah = parseRupiahInput(jumlahRaw)
  const canSave = selectedUserId !== null && jumlah > 0 && !saving

  const handleSave = async () => {
    if (!selectedUserId || jumlah <= 0) return
    setSaving(true)
    try {
      const h = await createManualHutang({
        userId: selectedUserId,
        jumlahAwal: jumlah,
        notes: notes.trim() || undefined,
      })
      navigation.replace("HutangDetail", { hutangId: h.id })
    } catch (e) {
      Alert.alert("Gagal menyimpan", e instanceof Error ? e.message : "Coba lagi")
      setSaving(false)
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface, flex: 1, marginLeft: spacing.sm }]}>
          Hutang Baru
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SectionLabel>Pelanggan</SectionLabel>
        <FieldCard>
          <Text style={styles.fieldLabel}>Cari user</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Nama atau panggilan"
            placeholderTextColor={colors.onSurfaceVariant}
          />
        </FieldCard>

        {usersLoading ? (
          <ActivityIndicator color={colors.primary} style={{ margin: spacing.lg }} />
        ) : (
          filtered.slice(0, 20).map((u) => {
            const selected = u.id === selectedUserId
            return (
              <TouchableOpacity
                key={u.id}
                style={[styles.userOption, selected && styles.userOptionSelected]}
                onPress={() => setSelectedUserId(u.id)}
              >
                <Text style={[textStyles.bodyLg, { color: colors.onSurface, flex: 1 }]} numberOfLines={1}>
                  {u.nickname ? `${u.name} (${u.nickname})` : u.name}
                </Text>
                {selected && <MaterialIcons name="check" size={20} color={colors.primary} />}
              </TouchableOpacity>
            )
          })
        )}

        <SectionLabel>Jumlah</SectionLabel>
        <FieldCard>
          <Text style={styles.fieldLabel}>Jumlah Awal *</Text>
          <RupiahInput value={jumlahRaw} onChangeText={setJumlahRaw} placeholder="0" />
        </FieldCard>

        <SectionLabel>Catatan</SectionLabel>
        <FieldCard>
          <Text style={styles.fieldLabel}>Catatan</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="(opsional)"
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
          />
        </FieldCard>
      </ScrollView>

      <BottomActionBar
        primaryLabel={saving ? "Menyimpan…" : "Simpan"}
        onPrimary={() => {
          if (!canSave) return
          handleSave()
        }}
        onCancel={() => navigation.goBack()}
        loading={saving}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  appBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  scroll: { paddingBottom: 160 },
  fieldLabel: { color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 4 },
  input: { color: colors.onSurface, fontSize: 16, padding: 0 },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  userOption: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.base,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.card,
    backgroundColor: colors.surfaceContainerLowest,
  },
  userOptionSelected: { borderColor: colors.primary, borderWidth: 2 },
})
```

> **Verified component APIs**: `RupiahInput` takes `value: string` + `onChangeText: (s: string) => void` + optional `placeholder`. Convert to a number for the connector via `parseRupiahInput(jumlahRaw)`. `BottomActionBar` uses `onCancel`/`loading`/`cancelLabel` (no `disabled` prop — gate inside `onPrimary` with `if (!canSave) return`).

- [ ] **Step 15.2: Register stack route + compile**

```tsx
import { HutangFormScreen } from "@/screens/HutangFormScreen"
<Stack.Screen name="HutangForm" component={HutangFormScreen} />
```

`pnpm run compile`.

- [ ] **Step 15.3: Smoke-test (with Supabase up)**

Hutang tab → tap "Hutang Baru" → pick a user → enter Rp50.000 → Save → lands on HutangDetail with sisa = 50.000. Add a payment of 30.000 → sisa = 20.000. Add 20.000 more → sisa = 0, status flips LUNAS, then card disappears from the AKTIF list on back-nav.

- [ ] **Step 15.4: Commit**

```bash
git add apps/lavender-ops-mobile/app/screens/HutangFormScreen.tsx apps/lavender-ops-mobile/app/navigators/AppNavigator.tsx
git commit -m "feat(phase-5c): HutangFormScreen manual hutang creation"
```

---

## Sub-phase 5d — Rental tab (basic list)

### Task 16: `getRentals` connector + `RentalListItem` type

**Files:**
- Modify: `apps/lavender-ops-mobile/app/services/rentals/types.ts`
- Modify: `apps/lavender-ops-mobile/app/services/rentals/translators.ts`
- Modify: `apps/lavender-ops-mobile/app/services/rentals/index.ts`

- [ ] **Step 16.1: Add `RentalListItem` type**

```ts
// types.ts — append
export interface RentalListItem {
  id: string
  userName: string
  vehicleName: string
  vehiclePlate: string
  startAt: Date
  dueAt: Date
  returnedAt: Date | null
  status: RentalStatus
  totalBill: number
  totalPaid: number
}
```

- [ ] **Step 16.2: Add view + translator**

In a new migration `0010_rental_list_view.sql`:

```sql
DROP VIEW IF EXISTS v_rental_list;
CREATE VIEW v_rental_list AS
SELECT
  r.id,
  u.name        AS user_name,
  v.name        AS vehicle_name,
  v.plate       AS vehicle_plate,
  r.start_at,
  r.due_at,
  r.returned_at,
  r.status,
  vr.total_bill,
  vr.total_paid
FROM rentals r
JOIN users u ON u.id = r.user_id
JOIN vehicles v ON v.id = r.vehicle_id
JOIN v_rentals vr ON vr.id = r.id;
```

In `translators.ts`:

```ts
import type { RentalListItem, RentalStatus } from "./types"

export function rowToRentalListItem(row: Record<string, unknown>): RentalListItem {
  return {
    id: row.id as string,
    userName: (row.user_name as string) ?? "",
    vehicleName: (row.vehicle_name as string) ?? "",
    vehiclePlate: (row.vehicle_plate as string) ?? "",
    startAt: new Date(row.start_at as string),
    dueAt: new Date(row.due_at as string),
    returnedAt: row.returned_at ? new Date(row.returned_at as string) : null,
    status: row.status as RentalStatus,
    totalBill: (row.total_bill as number) ?? 0,
    totalPaid: (row.total_paid as number) ?? 0,
  }
}
```

In `index.ts`:

```ts
import { rowToRentalListItem } from "./translators"
import { RentalListItem } from "./types"

export async function getRentals(): Promise<RentalListItem[]> {
  const { data, error } = await supabase
    .from("v_rental_list")
    .select("*")
    .order("start_at", { ascending: false })
    .limit(200)
  if (error) throw error
  return (data as Record<string, unknown>[]).map(rowToRentalListItem)
}
```

- [ ] **Step 16.3: Add `formatDateShort` helper**

`format.ts` is missing a compact date format for list rows. Append to `app/utils/format.ts`:

```ts
/**
 * Format date as "16 Mei" (compact, no year) — used in list row "start → due" tags.
 */
export function formatDateShort(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}
```

`MONTHS` is the existing constant at the top of the file.

- [ ] **Step 16.4: Apply migration, compile, commit**

Apply `0010_rental_list_view.sql` in the Supabase SQL editor. Verify `SELECT id FROM v_rental_list LIMIT 5` returns rows.

```bash
git add apps/lavender-ops-mobile/app/services/rentals/types.ts apps/lavender-ops-mobile/app/services/rentals/translators.ts apps/lavender-ops-mobile/app/services/rentals/index.ts apps/lavender-ops-mobile/app/utils/format.ts apps/lavender-ops-mobile/supabase/migrations/0010_rental_list_view.sql
git commit -m "feat(phase-5d): getRentals + v_rental_list view + RentalListItem type + formatDateShort"
```

---

### Task 17: RentalScreen — all-rentals list

**Files:**
- Modify: `apps/lavender-ops-mobile/app/screens/RentalScreen.tsx`

- [ ] **Step 17.1: Replace placeholder**

```tsx
// app/screens/RentalScreen.tsx
import { useState, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { SafeAreaView } from "react-native-safe-area-context"

import type { AppStackParamList } from "@/navigators/navigationTypes"
import { getRentals } from "@/services/rentals"
import type { RentalListItem } from "@/services/rentals/types"
import { colors, textStyles, spacing, borderRadius } from "@/theme/tokens"
import { formatDateShort, formatRupiah } from "@/utils/format"

type Nav = NativeStackNavigationProp<AppStackParamList>

function statusColor(s: RentalListItem["status"]) {
  if (s === "ACTIVE") return colors.warning
  if (s === "CANCELLED") return colors.outline
  return colors.primary
}

function statusLabel(s: RentalListItem["status"]) {
  if (s === "ACTIVE") return "Aktif"
  if (s === "CANCELLED") return "Batal"
  return "Selesai"
}

function RentalCard({ r, onPress }: { r: RentalListItem; onPress: () => void }) {
  const sisa = Math.max(0, r.totalBill - r.totalPaid)
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <Text style={[textStyles.bodyLg, { color: colors.onSurface, flex: 1 }]} numberOfLines={1}>
          {r.userName}
        </Text>
        <View style={[styles.statusChip, { backgroundColor: statusColor(r.status) }]}>
          <Text style={[textStyles.labelMd, { color: colors.onPrimary }]}>{statusLabel(r.status)}</Text>
        </View>
      </View>
      <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant, marginTop: 4 }]} numberOfLines={1}>
        {r.vehicleName} · {r.vehiclePlate}
      </Text>
      <View style={[styles.row, { marginTop: 6 }]}>
        <Text style={[textStyles.labelMd, { color: colors.onSurfaceVariant }]}>
          {formatDateShort(r.startAt)} → {formatDateShort(r.dueAt)}
        </Text>
        {sisa > 0 ? (
          <Text style={[textStyles.labelMd, { color: colors.error }]}>Sisa {formatRupiah(sisa)}</Text>
        ) : (
          <Text style={[textStyles.labelMd, { color: colors.primary }]}>Lunas</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export function RentalScreen() {
  const nav = useNavigation<Nav>()
  const [items, setItems] = useState<RentalListItem[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getRentals().then((r) => {
        setItems(r)
        setLoading(false)
      })
    }, []),
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={[textStyles.headlineSm, { color: colors.onSurface }]}>Rental</Text>
        <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>{items.length} record</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <RentalCard r={item} onPress={() => nav.navigate("PenyewaanDetail", { rentalId: item.id })} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[textStyles.bodyMd, { color: colors.onSurfaceVariant }]}>Belum ada rental.</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.base, paddingVertical: spacing.base, gap: 4 },
  list: { paddingBottom: 80 },
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.card,
    elevation: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  empty: { alignItems: "center", padding: 24 },
})
```

> `formatDateShort` was added in Task 16 step 16.3.

- [ ] **Step 17.2: Compile + smoke**

`pnpm run compile`. Smoke: Rental tab shows all rentals (recent first); tap one → opens existing PenyewaanDetail.

- [ ] **Step 17.3: Commit**

```bash
git add apps/lavender-ops-mobile/app/screens/RentalScreen.tsx
git commit -m "feat(phase-5d): RentalScreen all-rentals list with status chips and sisa indicator"
```

---

## Sub-phase 5e — Verify

### Task 18: Confirm Beranda-tab terminology

The spec asked for "Sewa Aktif → Penyewaan". Commit `276a6c6` already renamed the tab to **Rental**, which we are keeping (per user decision). Verify nothing else still says the old label.

- [ ] **Step 18.1: Grep for stale labels**

Run:

```powershell
# Both should return zero matches
Get-ChildItem -Path apps/lavender-ops-mobile/app -Recurse -Include *.tsx,*.ts | Select-String -Pattern "Sewa Aktif"
Get-ChildItem -Path apps/lavender-ops-mobile/app -Recurse -Include *.tsx,*.ts | Select-String -Pattern '"Penyewaan"' | Where-Object { $_.Line -notmatch "PenyewaanDetail" }
```

If any non-trivial hit (i.e., a user-facing label, not a route name like `PenyewaanDetail`), update to match the agreed term (`Rental` for the tab; `Penyewaan Aktif` for the Beranda stat card is OK to keep).

- [ ] **Step 18.2: Mark 5e complete in the roadmap**

In `CLAUDE.md`, update the phase table row:

```
| 5a–5e | Auth, User CRUD, Hutang, Penyewaan tabs | ✅ Done |
```

Only after tasks 1–17 are all complete.

- [ ] **Step 18.3: Commit if files changed**

If only `CLAUDE.md` changed:

```bash
git add CLAUDE.md
git commit -m "docs(phase-5): mark Phase 5 complete in roadmap table"
```

---

## End-to-end Verification

After all tasks above are committed, run this checklist before declaring Phase 5 done.

### Static checks

- [ ] `pnpm run compile` — 0 errors
- [ ] `pnpm test` — all existing 43+ tests still green; new translator tests pass

### Manual smoke (golden path)

Use the Mom-spare-phone with dev-client APK (existing from Phase 4 EAS smoke build).

1. **Fresh boot → Login appears** (clear app data first).
2. Sign in as `mom@lavender.local` → Beranda loads with non-zero stats.
3. **User flow**: User tab → tap FAB "User Baru" → fill (name, phone, mahasiswa toggle ON) → Save → lands on UserDetail with empty stats. Edit pencil → change phone → Save → returns to detail with new phone.
4. **Sewa Baru flow regression check**: From Beranda tap "Sewa Baru" → pick the just-created user → pick a vehicle → fill form → Save. PenyewaanDetail loads.
5. **Rental tab**: shows the just-created rental at top, status "Aktif".
6. Close that rental (Pengembalian flow); confirm it now appears with status "Selesai" and (if any unpaid amount) a hutang record auto-created.
7. **Hutang tab**: AKTIF list shows the auto-created hutang. Tap → HutangDetail. Add payment to clear it → status flips LUNAS, disappears from AKTIF list.
8. **Manual hutang flow**: Hutang tab → FAB → pick user, jumlah 100.000 → Save → HutangDetail. Add 100.000 payment → LUNAS.
9. **User deletion**: open a freshly-created test user → "Hapus User" → confirm → user disappears from User tab list. (DB check: row still exists with `deleted_at` set.)
10. **Sign-out**: tap header avatar on Beranda → "Keluar" → Login appears. Force-close and reopen → Login still appears (session cleared).

### DB sanity (after the smoke)

In Supabase SQL editor:

```sql
SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL;       -- ≥1 (the smoke-deleted user)
SELECT COUNT(*) FROM hutang WHERE status = 'LUNAS';            -- ≥2 (one auto, one manual)
SELECT COUNT(*) FROM payments WHERE hutang_id IS NOT NULL;     -- ≥2
SELECT COUNT(*) FROM rentals WHERE status = 'COMPLETED';       -- ≥1
SELECT created_by, updated_by FROM users ORDER BY created_at DESC LIMIT 5;
-- All non-null and = mom's auth UID for the smoke-created rows
```

If audit columns are unexpectedly NULL, the `set_audit_fields` trigger isn't firing — check Phase 4 migration `0004_triggers.sql` was applied for the `users` table.

### Cleanup before Phase 6

- [ ] Delete the test user (hard delete via SQL editor) and any smoke-created rentals/hutang you don't want in the v1.0 dataset.

---

## Notes for the executor

- **Connector contract:** never change an existing function's signature, even if a callsite would be more convenient. Add a new function instead.
- **Translators are pure:** keep them in `translators.ts`, test them in `translators.test.ts`. Easy wins.
- **Screens compose `app/components/form/` primitives** — `SectionLabel`, `FieldCard`, `RupiahInput`, `PhotoRow`, `BottomActionBar`. If a prop name doesn't match what's in the example code here, fix the call site to match the actual component — the example is a sketch, not a contract.
- **`useFocusEffect`, not `useEffect`,** for screen-level data loads. The user comes back to these screens after edits and expects fresh data.
- **Phase 6 hooks:**
  - `UserFormScreen`'s `PhotoRow` is rendered disabled — Phase 6 wires the upload and `updateUser` will be extended to write `ktp_photo` / `ktm_photo` columns. Schema is ready (Task 1).
  - The `rowToUser` translator already returns `{id, uri: null}` for photos; Phase 6 will generate signed URLs there.
- **Rollback strategy per task:** every task commits separately. If a task breaks the build, `git revert <task-hash>` is the recovery; no cross-task state.

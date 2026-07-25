// v1.0.5 (PRD-8, RG-2/BR-12) — CHARACTERISATION SUITE, written BEFORE PengembalianScreen is
// migrated onto the new `FieldBox` primitive. Its job is to pin what the screen's fuel
// adjustment, return-total, `Sisa`, and close-payload behaviour ACTUALLY DO today, so a later
// migration dispatch can prove the swap changed no math. Do not "correct" any of these assertions
// toward docs/02 §6 — two deliberate divergences (debt #12) are pinned exactly as they behave:
//   1. `applyFuelSuggestion()` appends an extra-fee line instead of adjusting Subtotal.
//   2. The fuel-suggestion row renders amber (`colors.warningContainer`) unconditionally,
//      regardless of whether the suggestion adds to or subtracts from the bill.
//
// Absorbs and replaces test/spike.pengembalian.discovery.test.tsx (deleted in this commit) — the
// mount recipe and the first closeRental-payload assertion below trace back to that spike.
//
// Modelled on RentalDetailScreen.test.tsx's mocking pattern (same screen shape: takes
// {navigation, route} as props per AppStackScreenProps, no NavigationContainer needed).

jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

// See app/utils/useBottomBarPadding.test.tsx / debt #11 — jest-expo's default preset resolves
// Platform.select to iOS always. PengembalianScreen reads useBottomBarPadding() /
// useBottomSpace(), both of which branch on Platform.select.
jest.mock("react-native/Libraries/Utilities/Platform.ios", () => ({
  __esModule: true,
  default: {
    OS: "android",
    select: (spec: Record<string, unknown>) => spec.android ?? spec.default,
  },
}))

import { fireEvent, render, waitFor, type RenderResult } from "@testing-library/react-native"

import type { Rental, UserSummary, Vehicle } from "@/services/rentals/types"
import { colors, spacing } from "@/theme/tokens"
import { hoursLate } from "@/utils/rentalMath"

// Relative path (not the "@/screens/..." alias) deliberately — this test file sits beside
// PengembalianScreen.tsx, and the alias would land it in the same import/order group as the
// "@/services/rentals/types" import above, forcing an alphabetical interleave;
// RentalDetailScreen.test.tsx uses the same relative-path convention for the same reason. Jest's
// babel-plugin-jest-hoist hoists every `jest.mock(...)` call above all imports regardless of
// their physical position, so this being grouped here (rather than physically after the
// `@/services/rentals` mock below) does not change what the mocks see.
import { PengembalianScreen } from "./PengembalianScreen"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

const mockGetRental = jest.fn()
const mockGetUserSummary = jest.fn()
const mockGetVehicle = jest.fn()
const mockCloseRental = jest.fn()
const mockUpdatePayment = jest.fn()
const mockDeletePayment = jest.fn()

jest.mock("@/services/rentals", () => ({
  getRental: (...args: unknown[]) => mockGetRental(...args),
  getUserSummary: (...args: unknown[]) => mockGetUserSummary(...args),
  getVehicle: (...args: unknown[]) => mockGetVehicle(...args),
  closeRental: (...args: unknown[]) => mockCloseRental(...args),
  updatePayment: (...args: unknown[]) => mockUpdatePayment(...args),
  deletePayment: (...args: unknown[]) => mockDeletePayment(...args),
}))

const mockChoosePhotoSource = jest.fn()
jest.mock("@/services/photos/capture", () => ({
  choosePhotoSource: (...args: unknown[]) => mockChoosePhotoSource(...args),
}))

const mockShowToast = jest.fn()
jest.mock("@/utils/showToast", () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

// ─── Fixtures ───────────────────────────────────────────────────────────────

// ③'s Tier-1 finding #2: `bensinKotak: 4`, `tujuan: ""`, `notes: ""` here COLLIDE with
// PengembalianScreen's own `useState` defaults (`:181,202,205` — `4`, `""`, `""`), which means a
// migration that silently dropped the `:221-224` hydration effect would render byte-identical to
// today and every existing assertion would still pass. `totalBill`/`rate24h` (below, in
// `makeVehicle`) also collided with `tarif` (all `40000`), which mattered less for "did hydration
// run at all" but meant a hydration WIRED TO THE WRONG FIELD (e.g. `rawSubtotal` rebound to
// `totalBill`) was equally invisible. `tarif` itself stays `40000` — changing it would ripple into
// nearly every rupiah assertion in this file; PengembalianScreen never reads `totalBill` or any
// `vehicle.rate*` field (verified: `grep -n "totalBill\|rate24h\|rate6h\|rate12h" PengembalianScreen.tsx`
// matches nothing), so moving only those two off `40000` closes the ambiguity with zero cascade.
function makeRental(overrides: Partial<Rental> = {}): Rental {
  return {
    id: "r1",
    userId: "u1",
    vehicleId: "v1",
    startAt: new Date("2026-07-01T00:00:00Z"),
    dueAt: new Date("2026-07-02T00:00:00Z"),
    returnedAt: null,
    status: "ACTIVE",
    tarif: 40000,
    addOn: { description: "", amount: 0 },
    discount: 0,
    totalBill: 999999, // deliberately NOT 40000 — see the collision note above
    totalPaid: 0,
    payments: [],
    jaminan: { items: ["KTP"] },
    kondisiKeluar: { bensinKotak: 6, km: 1000, photos: [] }, // NOT 4 — see the collision note above
    kondisiKembali: null,
    notes: "catatan awal", // NOT "" — see the collision note above
    tujuan: "Kos Barat", // NOT "" — see the collision note above
    paketHari: 1,
    paketJam: 0,
    ...overrides,
  } as Rental
}

function makeUserSummary(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    id: "u1",
    name: "Budi",
    nickname: null,
    phone: "081234567890",
    isMahasiswa: false,
    isVerified: false,
    verificationStatus: "BELUM_DIVERIFIKASI",
    namaPddikti: null,
    tahunMasuk: null,
    universitas: null,
    prodi: null,
    activeRentalsCount: 1,
    debtAmount: 0,
    profilPhoto: null,
    ...overrides,
  }
}

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "v1",
    name: "Vario",
    plate: "L 1234 AB",
    category: "MOTOR",
    rate6h: 20000,
    rate12h: 30000,
    rate24h: 45000, // deliberately NOT 40000 (== tarif) — see makeRental's collision note
    available: false,
    gps: null,
    imei: null,
    ...overrides,
  }
}

const navigation = { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() } as any

beforeEach(() => {
  mockInsets(ZERO_INSETS)
  mockGetRental.mockReset().mockResolvedValue(makeRental())
  mockGetUserSummary.mockReset().mockResolvedValue(makeUserSummary())
  mockGetVehicle.mockReset().mockResolvedValue(makeVehicle())
  mockCloseRental.mockReset().mockResolvedValue(makeRental({ status: "COMPLETED" }))
  mockUpdatePayment.mockReset()
  mockDeletePayment.mockReset()
  mockChoosePhotoSource.mockReset()
  mockShowToast.mockReset()
  // ③ Tier-2 #7: `navigation` is a module-scope object (below) so its call log otherwise
  // accumulates across all tests in this file — any future `toHaveBeenCalledTimes` assertion on
  // it would get a silently wrong answer with no clue why.
  navigation.navigate.mockReset()
  navigation.goBack.mockReset()
  navigation.replace.mockReset()
})

// ─── Mount + drive helpers ──────────────────────────────────────────────────

async function renderScreen(rental: Rental): Promise<RenderResult> {
  mockGetRental.mockResolvedValue(rental)
  const utils = render(
    <PengembalianScreen
      navigation={navigation}
      route={{ params: { rentalId: rental.id } } as any}
    />,
  )
  await waitFor(() => expect(utils.getByText("Proses Pengembalian")).toBeDefined())
  return utils
}

/** Every TextInput host node currently in the tree, in JSX document order. No testID exists
 * anywhere on this screen (RG-3) — `require("react-native").TextInput` matches the spike's
 * proven recipe; a static top-level `import { TextInput } from "react-native"` would trip
 * `no-restricted-imports` (the app-wide rule pointing callers at `@/components/AppText`). */
function allTextInputs(utils: RenderResult) {
  return utils.UNSAFE_getAllByType(require("react-native").TextInput)
}

/**
 * Returns the "Subtotal Sewa" TextInput. INDEX FALLBACK: fixed index 3, valid ONLY on a fresh
 * render with no other rows added yet — tree order is Tujuan(0), Harga bensin/kotak(1), KM
 * Kembali(2), Subtotal Sewa(3), ...Catatan(last) (this is the spike's original finding, carried
 * forward). Callers that add extra-fee/discount/payment rows first must not rely on this index.
 */
function getSubtotalInput(utils: RenderResult) {
  return allTextInputs(utils)[3]
}

/**
 * Opens "Tambah Pembayaran" and fills the sheet's amount field, then presses "Simpan".
 *
 * INDEX FALLBACK: the sheet's "Jumlah" field is located as the FIRST NEW TextInput to appear
 * after opening the sheet — i.e. by the *delta* between the TextInput count before and after
 * opening, not an absolute index. PembayaranSheet's body renders Jumlah -> Metode chips (not a
 * TextInput) -> Tanggal (not a TextInput) -> Catatan, so the first newcomer is always Jumlah,
 * regardless of how many extra-fee/discount rows exist on the main screen at the time. Safe
 * across the coming FieldBox migration per RG-3 (wrapping a tag in FieldBox does not reorder the
 * render tree).
 */
function addPayment(utils: RenderResult, amount: number) {
  const before = allTextInputs(utils).length
  fireEvent.press(utils.getByText("Tambah Pembayaran"))
  const jumlahInput = allTextInputs(utils)[before]
  fireEvent.changeText(jumlahInput, String(amount))
  fireEvent.press(utils.getByText("Simpan"))
}

/**
 * Walks `.parent` upward from `start` and returns the first ancestor whose flattened style
 * satisfies `predicate` — same idiom as `test/findStyledAncestor.ts` (that file's two exports
 * don't cover the predicates this suite needs, so these are local variants of the same pattern).
 * `.parent` in RNTL walks the *fiber* tree one node at a time (composite AND host, not just
 * host — verified empirically: a `<Text>` from `@/components/AppText` is a `forwardRef`
 * composite, so `label.parent` alone lands on that wrapper, not the host `<View>` around it), so
 * a predicate-driven walk is used instead of a hardcoded hop count.
 */
function findAncestorWhere(start: any, predicate: (flat: Record<string, any>) => boolean): any {
  const { StyleSheet } = require("react-native")
  let node = start.parent
  while (node) {
    const flat = StyleSheet.flatten(node.props?.style) ?? {}
    if (predicate(flat)) return node
    node = node.parent
  }
  return null
}

/**
 * Every extra-fee row container currently in the tree, in JSX/array order (oldest first).
 * STRUCTURAL FALLBACK: same `styles.extraFeeRow` signature `getExtraFeeRowByDescription` uses,
 * applied tree-wide via `UNSAFE_getAllByType(View)` rather than an ancestor walk from one known
 * starting node — there is no description text to anchor to for a row that was just added and is
 * still blank. Because this is a whole-tree scan (not scoped to one node's ancestors), it CAN
 * encounter styles that are IDENTICAL to `extraFeeRow`'s, not just similar: the Jaminan-banner
 * icon row's inline style (`{flexDirection:"row",alignItems:"center",gap:spacing.sm}` at :919) is
 * a byte-for-byte match, and — being lower in the tree, in the "Status Jaminan" section which
 * renders after Rincian Biaya — was winning the "take the last match" search outright (found
 * empirically: the resulting node had zero TextInput descendants). A style filter alone cannot
 * distinguish two identically-styled containers; a CONTENT filter (exactly 2 TextInput
 * descendants — description + amount) can, and is what actually makes a row an extraFeeRow.
 */
function allExtraFeeRows(utils: RenderResult): any[] {
  const { View, StyleSheet, TextInput } = require("react-native")
  const { within } = require("@testing-library/react-native")
  return utils.UNSAFE_getAllByType(View).filter((v: any) => {
    const flat = StyleSheet.flatten(v.props.style) ?? {}
    if (
      flat.flexDirection !== "row" ||
      flat.alignItems !== "center" ||
      flat.gap === undefined ||
      flat.justifyContent !== undefined ||
      flat.backgroundColor !== undefined
    ) {
      return false
    }
    try {
      return within(v).UNSAFE_getAllByType(TextInput).length === 2
    } catch {
      return false // UNSAFE_getAllByType throws when it finds zero, e.g. the Jaminan icon row
    }
  })
}

/**
 * Presses "Tambah Biaya" and returns the two new TextInputs (description, amount) for the row it
 * added.
 *
 * ③ Tier-1 #3 fix — NOT located by a fixed/delta TextInput index. Verified empirically: JSX order
 * inside Rincian Biaya (PengembalianScreen.tsx) is Subtotal (:643) -> fuel suggestion (:663) ->
 * `extraFees.map` (:695) -> Diskon (:728), with Catatan last. So when a Diskon row ALREADY
 * exists, a newly-added extra-fee row inserts BEFORE the Diskon row, not immediately before
 * Catatan — the previous fixed-offset-from-the-end formula (`[before-1, before]`) silently
 * returned `[Amount, Diskon]` instead of `[Desc, Amount]` in that case (confirmed by dumping the
 * TextInput placeholder list before/after pressing "Tambah Biaya" with a Diskon row already
 * present — the new pair landed at indices [before-2, before-1], not [before-1, before]).
 *
 * Fix: find every extraFeeRow-shaped container and take the LAST one. New fees are always
 * appended to the END of the `extraFees` array (`setExtraFees(prev => [...prev, ...])`), so the
 * newest row is always the last `extraFeeRow` in the tree, regardless of whether a Diskon row (or
 * anything else) exists elsewhere on screen — this holds however many rows already exist, in
 * whatever order they were added.
 */
function addExtraFeeRow(utils: RenderResult): [any, any] {
  fireEvent.press(utils.getByText("Tambah Biaya"))
  const rows = allExtraFeeRows(utils)
  const newest = rows[rows.length - 1]
  const { within } = require("@testing-library/react-native")
  const [desc, amount] = within(newest).UNSAFE_getAllByType(require("react-native").TextInput)
  return [desc, amount]
}

/**
 * Presses "Diskon" and returns the new discount-amount TextInput.
 * INDEX FALLBACK: same mid-tree insertion as `addExtraFeeRow` (Diskon row also sits in Rincian
 * Biaya, before Catatan) — the new input lands at index `before - 1`, displacing Catatan to
 * `before`.
 */
function addDiscountRow(utils: RenderResult): any {
  const before = allTextInputs(utils).length
  fireEvent.press(utils.getByText("Diskon"))
  return allTextInputs(utils)[before - 1]
}

/**
 * Presses the Bensin Kembali stepper's decrement or increment button.
 * STRUCTURAL FALLBACK: `getByText(`${value} kotak`)` returns the Stepper's own label host Text
 * node (PengembalianScreen.tsx Stepper, lines ~105-156). `findAncestorWhere` walks up from it to
 * the nearest ancestor whose flattened style matches `styles.stepperRow`'s unique signature
 * (`justifyContent: "space-between"` with no `flexWrap` — the only style block in this screen
 * with that combination; `paySummaryRow` also uses `space-between` but always carries
 * `flexWrap: "wrap"`). `within(...)` then scopes `UNSAFE_getAllByType(TouchableOpacity)` to
 * exactly the two Stepper buttons: [0]=decrement ("remove" icon), [1]=increment ("add" icon), in
 * JSX order. Distinct from the "Saat keluar: N kotak" caption below it, a different full string.
 */
function pressStepper(utils: RenderResult, currentValue: number, direction: "inc" | "dec") {
  const { getByText } = utils
  const label = getByText(`${currentValue} kotak`)
  const row = findAncestorWhere(
    label,
    (flat) => flat.justifyContent === "space-between" && flat.flexWrap === undefined,
  )
  if (!row) throw new Error("Stepper row (styles.stepperRow) not found")
  const { within } = require("@testing-library/react-native")
  const buttons = within(row).UNSAFE_getAllByType(require("react-native").TouchableOpacity)
  fireEvent.press(buttons[direction === "dec" ? 0 : 1])
}

function pressSave(utils: RenderResult) {
  fireEvent.press(utils.getByText(/Selesaikan/))
}

/**
 * Reads the value Text SPECIFICALLY inside the row labelled `rowLabel` — "Subtotal Sewa",
 * "Diskon", or "Total Tagihan" (the three rows sharing `styles.infoRow`; "Sisa:" uses a
 * DIFFERENT style, `paySummaryRow` — see `getSisaLabelColor` for that one). Scoped via
 * `findAncestorWhere` to `infoRow`'s signature (`alignItems: "center"`, `flexDirection: "row"`,
 * `minHeight: 40`) — the row's own container, the nearest such ancestor of `rowLabel`'s own text
 * node (all three rows use the SAME style, but each is a SIBLING, not an ancestor, of the others'
 * text).
 *
 * ③ Tier-2 #12: `getAllByText("Rp X").length >= 2` (used elsewhere in this file for the common
 * case of "Total Tagihan and Sisa happen to show the same figure") proves "this string appears
 * twice SOMEWHERE", not "the row labelled `rowLabel` shows X" — a migration that, say, dropped
 * Total Tagihan's OWN value while Sisa's rendered fine could still pass a `>= 2` check as long as
 * two matches happened to survive some other way. This reads the SPECIFIC row.
 */
function getRowValue(utils: RenderResult, rowLabel: string): string {
  const row = findAncestorWhere(
    utils.getByText(rowLabel),
    (flat) => flat.alignItems === "center" && flat.flexDirection === "row" && flat.minHeight === 40,
  )
  if (!row) throw new Error(`row for "${rowLabel}" (styles.infoRow) not found`)
  const { within } = require("@testing-library/react-native")
  const { Text } = require("react-native")
  const texts = within(row).UNSAFE_getAllByType(Text)
  // [0] = the label itself (`rowLabel`), [1] = its value.
  return texts[1].props.children
}

/** Reads the "Sisa:" label's OWN text colour (PengembalianScreen.tsx:890-897) — no ancestor walk
 * needed, the colour lives on the same node this locates (by its literal, unambiguous text). */
function getSisaLabelColor(utils: RenderResult): string {
  const { StyleSheet } = require("react-native")
  return StyleSheet.flatten(utils.getByText("Sisa:").props.style).color
}

/**
 * Reads the Jaminan banner's OWN `backgroundColor` (PengembalianScreen.tsx:913-917).
 * STRUCTURAL FALLBACK: walks up from the banner's own sentence text (content differs by state,
 * so the caller supplies it) to the nearest ancestor matching `styles.jaminanBanner`'s signature
 * (`borderRadius: 12`, a defined `gap`, a defined `padding`). Not located via the inline
 * `{flexDirection:"row",alignItems:"center",gap:spacing.sm}` icon row one level in — ③ Tier-1
 * #3's investigation found that EXACT style object is also used, byte-for-byte, by
 * `styles.extraFeeRow` elsewhere on screen; `borderRadius: 12` + a defined `padding` is unique to
 * `jaminanBanner` among ITS OWN ancestors (`styles.card` also has `borderRadius`, but `16`, not
 * `12`).
 */
function getJaminanBannerColor(utils: RenderResult, bannerText: string): string {
  const { StyleSheet } = require("react-native")
  const row = findAncestorWhere(
    utils.getByText(bannerText),
    (flat) => flat.borderRadius === 12 && flat.gap !== undefined && flat.padding !== undefined,
  )
  if (!row) throw new Error(`Jaminan banner (styles.jaminanBanner) for "${bannerText}" not found`)
  return StyleSheet.flatten(row.props.style).backgroundColor
}

// ─── Dispatch ②b helpers — text-entry, row removal, the picker, PembayaranSheet edit/delete ──

/** Harga bensin / kotak. INDEX FALLBACK: fixed index 1, valid ONLY on a fresh render — see
 * `getSubtotalInput`. */
function getHargaInput(utils: RenderResult) {
  return allTextInputs(utils)[1]
}

/** KM Kembali. INDEX FALLBACK: fixed index 2, valid ONLY on a fresh render (Tujuan 0, Harga 1,
 * KM 2, Subtotal 3, ...Catatan last) — see `getSubtotalInput`. */
function getKmInput(utils: RenderResult) {
  return allTextInputs(utils)[2]
}

/** Tujuan. INDEX FALLBACK: fixed index 0, valid ONLY on a fresh render — see `getSubtotalInput`. */
function getTujuanInput(utils: RenderResult) {
  return allTextInputs(utils)[0]
}

/** Catatan (main, not the PembayaranSheet's own Catatan). INDEX FALLBACK: always the LAST
 * TextInput on a fresh render with no extra-fee/discount/payment rows added and the sheet
 * closed — see `getSubtotalInput`. */
function getNotesInput(utils: RenderResult) {
  const inputs = allTextInputs(utils)
  return inputs[inputs.length - 1]
}

/**
 * Locates one extra-fee row's own container by its live description `value`.
 * STRUCTURAL FALLBACK: walks up from the description TextInput (found via `getByDisplayValue`)
 * to the nearest ancestor matching `styles.extraFeeRow`'s signature (`flexDirection: "row"`,
 * `alignItems: "center"`, a defined `gap`, no `justifyContent`). `styles.terlambatWarning` shares
 * the same 3 keys but is never encountered here — it lives in a different section of the tree
 * (Waktu Sewa, not Rincian Biaya) and is therefore never an ANCESTOR of this specific starting
 * node, only a sibling elsewhere.
 */
function getExtraFeeRowByDescription(utils: RenderResult, description: string) {
  const descInput = utils.getByDisplayValue(description)
  const row = findAncestorWhere(
    descInput,
    (flat) =>
      flat.flexDirection === "row" &&
      flat.alignItems === "center" &&
      flat.gap !== undefined &&
      flat.justifyContent === undefined,
  )
  if (!row) throw new Error(`extra-fee row (styles.extraFeeRow) for "${description}" not found`)
  return row
}

/** Presses one extra-fee row's own trash icon (see `getExtraFeeRowByDescription`). Exactly one
 * `TouchableOpacity` lives inside an `extraFeeRow` — the trash icon. */
function removeExtraFeeRowByDescription(utils: RenderResult, description: string) {
  const row = getExtraFeeRowByDescription(utils, description)
  const { within } = require("@testing-library/react-native")
  const trash = within(row).UNSAFE_getAllByType(require("react-native").TouchableOpacity)[0]
  fireEvent.press(trash)
}

/**
 * Presses the Diskon row's own trash icon (adjacent to `addDiscountRow`).
 * STRUCTURAL FALLBACK: walks up from the discount amount TextInput to the nearest ancestor
 * matching `styles.infoRow`'s signature (`flexDirection: "row"`, `alignItems: "center"`,
 * `minHeight: 40`) — the Diskon row itself; Subtotal Sewa's own `infoRow` is a SIBLING, not an
 * ancestor, of this specific input, so it is never encountered. The amount field's own wrapper
 * (`amountInputRow`) uses `height: 40`, a distinct key from `minHeight`, so it does not
 * false-match on the way up.
 */
function removeDiscountRow(utils: RenderResult, discountInput: any) {
  const row = findAncestorWhere(
    discountInput,
    (flat) => flat.flexDirection === "row" && flat.alignItems === "center" && flat.minHeight === 40,
  )
  if (!row) throw new Error("Diskon row (styles.infoRow) not found")
  const { within } = require("@testing-library/react-native")
  const trash = within(row).UNSAFE_getAllByType(require("react-native").TouchableOpacity)[0]
  fireEvent.press(trash)
}

/**
 * Opens the "Edit" affordance on an EXISTING (already-persisted) payment row, identified by its
 * displayed rupiah amount.
 * STRUCTURAL FALLBACK: `getAllByText` (not `getByText`) because the same figure can legitimately
 * appear elsewhere too (Total Tagihan, Sisa, "Sudah dibayar:"). Each candidate is walked up
 * looking for the nearest ancestor matching `styles.paymentRow`'s signature (`flexDirection:
 * "row"`, `borderBottomWidth: 1`) — none of Total Tagihan/Sisa/"Sudah dibayar:"'s own containers
 * carry `borderBottomWidth`, so only the genuine payment row matches. `within(row).getByText`
 * then disambiguates from the Kembali row's OWN "Edit" control, which uses the identical string.
 */
function openExistingPaymentEdit(utils: RenderResult, amountLabel: string) {
  const { within } = require("@testing-library/react-native")
  const candidates = utils.getAllByText(amountLabel)
  for (const candidate of candidates) {
    const row = findAncestorWhere(
      candidate,
      (flat) => flat.flexDirection === "row" && flat.borderBottomWidth === 1,
    )
    if (row) {
      fireEvent.press(within(row).getByText("Edit"))
      return
    }
  }
  throw new Error(`payment row for "${amountLabel}" (styles.paymentRow) not found`)
}

// ─── (b) Sisa — the inline clamp at PengembalianScreen.tsx:242 ────────────

describe("Sisa — inline composition (Math.max(0, totalTagihan - totalPaid))", () => {
  it("sisa > 0 when nothing has been paid: shows the full bill and the auto-debt banner", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    // "Rp 40.000" is shown twice at this point (Total Tagihan AND Sisa share the same figure
    // when nothing has been paid) — getAllByText, not getByText, to avoid an ambiguous-match
    // throw; the interpolated banner sentence below is the unambiguous proof that Sisa = 40.000.
    expect(utils.getAllByText("Rp 40.000").length).toBeGreaterThanOrEqual(2)
    expect(utils.getByText("Jaminan ditahan — akan dibuat Hutang Rp 40.000")).toBeDefined()
    expect(utils.getByText("Hutang otomatis dibuat saat pengembalian disimpan.")).toBeDefined()
    expect(utils.getByText("Selesaikan & Buat Hutang")).toBeDefined()
    // ③ Tier-2 #8: §6 mandates a colour distinction at Sisa > 0, not just different text — a
    // migration that rendered the SAME colour in both states would pass a text-only suite.
    expect(getSisaLabelColor(utils)).toBe(colors.error)
    expect(getJaminanBannerColor(utils, "Jaminan ditahan — akan dibuat Hutang Rp 40.000")).toBe(
      colors.warningContainer,
    )
  })

  it("sisa = 0 once payments cover the bill exactly: shows the paid-off banner and CTA", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    addPayment(utils, 40000)
    await waitFor(() => expect(utils.getByText("Jaminan bisa dikembalikan")).toBeDefined())
    expect(utils.getByText("Selesaikan Pengembalian")).toBeDefined()
    expect(utils.queryByText(/Buat Hutang/)).toBeNull()
    // ③ Tier-2 #8: the OTHER half of the colour pin — green at Sisa = 0, not the same amber/error
    // as the > 0 case above.
    expect(getSisaLabelColor(utils)).toBe(colors.onSuccessContainer)
    expect(getJaminanBannerColor(utils, "Jaminan bisa dikembalikan")).toBe(colors.successContainer)
  })

  it("clamps at 0, never negative, when existing payments already exceed the bill", async () => {
    const rental = makeRental({
      tarif: 40000,
      payments: [
        { id: "p1", amount: 100000, method: "CASH", paidAt: new Date("2026-07-01T00:00:00Z") },
      ],
    })
    const utils = await renderScreen(rental)
    // totalTagihan (40.000) - totalPaid (100.000) = -60.000, clamped to 0 by Math.max(0, ...).
    expect(utils.getByText("Jaminan bisa dikembalikan")).toBeDefined()
    expect(utils.getByText("Selesaikan Pengembalian")).toBeDefined()
    // "Rp 100.000" appears twice (the payment row itself, and "Sudah dibayar:") — getAllByText,
    // not getByText, to avoid an ambiguous-match throw.
    expect(utils.getAllByText("Rp 100.000").length).toBeGreaterThanOrEqual(2)
    // "Rp 0" appears exactly once — the clamped Sisa figure (Total Tagihan still shows "Rp 40.000").
    expect(utils.getByText("Rp 0")).toBeDefined()
  })
})

// ─── (b) closeRental payload — pin the arguments, not just the pixels (D-4) ─

describe("closeRental payload — pinned scenarios", () => {
  it("sisa = 0 (fully paid): pins the full CloseRentalInput, including newPayments and the four hydrated fields", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    // ③ Tier-1 #11 (midnight-rollover flake): captured immediately before `addPayment` — that is
    // the exact moment PembayaranSheet's `useState(todayMidnight)` lazy initializer runs in
    // production, so this and the production value are computed within the same synchronous
    // window rather than being compared across the whole test's duration (which could
    // legitimately straddle a real local-midnight rollover and fail for a reason that has
    // nothing to do with a regression).
    const expectedPaidAt = new Date()
    expectedPaidAt.setHours(0, 0, 0, 0)
    addPayment(utils, 40000)
    await waitFor(() => expect(utils.getByText("Jaminan bisa dikembalikan")).toBeDefined())

    const beforeSave = Date.now()
    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))

    const [rentalId, payload] = mockCloseRental.mock.calls[0]
    expect(rentalId).toBe("r1")
    expect(payload).toEqual({
      returnedAt: expect.any(Date),
      // ③ Tier-1 #2: bensinKotak/tujuan/notes below are the fixture's OWN distinguishing values
      // (`6`/"Kos Barat"/"catatan awal", not the `useState` defaults `4`/""/"") — this full-object
      // match is what proves PengembalianScreen.tsx:221-224's hydration effect actually ran,
      // rather than the screen having coincidentally rendered its untouched defaults.
      kondisiKembali: { bensinKotak: 6, km: null, photos: [] },
      subtotalSewa: 40000,
      extraFees: [],
      discount: 0,
      tujuan: "Kos Barat",
      notes: "catatan awal",
      newPayments: [
        {
          amount: 40000,
          method: "CASH",
          methodDescription: undefined,
          paidAt: expect.any(Date),
          notes: undefined,
        },
      ],
    })
    // returnedAt is seeded from `new Date()` at screen-open (RG-4, debt #16) — tolerant match,
    // not an exact value, and never changed via this test (guard 1).
    expect(Math.abs(payload.returnedAt.getTime() - beforeSave)).toBeLessThan(5000)
    // PembayaranSheet's paidAt is `todayMidnight()` — deterministic given "now", so an exact
    // match is possible (not just tolerant).
    expect(payload.newPayments[0].paidAt).toEqual(expectedPaidAt)
    // ③ Tier-2 #7: §6's final clause — navigation.replace is the only pin on it.
    expect(navigation.replace).toHaveBeenCalledWith("RentalDetail", {
      rentalId: "r1",
      justClosed: true,
    })
  })

  it("sisa > 0 (auto-debt path): pins the payload with newPayments empty — the server creates the hutang", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))

    const beforeSave = Date.now()
    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))

    const [rentalId, payload] = mockCloseRental.mock.calls[0]
    expect(rentalId).toBe("r1")
    expect(payload).toEqual({
      returnedAt: expect.any(Date),
      // Same hydration proof as the fully-paid test above (③ Tier-1 #2).
      kondisiKembali: { bensinKotak: 6, km: null, photos: [] },
      subtotalSewa: 40000,
      extraFees: [],
      discount: 0,
      tujuan: "Kos Barat",
      notes: "catatan awal",
      newPayments: [],
    })
    expect(Math.abs(payload.returnedAt.getTime() - beforeSave)).toBeLessThan(5000)
    expect(navigation.replace).toHaveBeenCalledWith("RentalDetail", {
      rentalId: "r1",
      justClosed: true,
    })
  })

  it("extra fee present: pins description + amount in extraFees, subtotal untouched", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    const [descInput, amountInput] = addExtraFeeRow(utils)
    fireEvent.changeText(descInput, "Helm hilang")
    fireEvent.changeText(amountInput, "15000")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))

    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.subtotalSewa).toBe(40000)
    expect(payload.extraFees).toEqual([{ description: "Helm hilang", amount: 15000 }])
    expect(payload.discount).toBe(0)
  })

  it("discount present: pins the discount figure, extraFees stays empty", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    const discountInput = addDiscountRow(utils)
    fireEvent.changeText(discountInput, "5000")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))

    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.subtotalSewa).toBe(40000)
    expect(payload.extraFees).toEqual([])
    expect(payload.discount).toBe(5000)
  })

  it("editing Subtotal Sewa directly: the new value round-trips into the payload untouched by other fields", async () => {
    // Absorbed from test/spike.pengembalian.discovery.test.tsx (deleted) — its original
    // proof-of-concept that a render-level test can pin the argument handed to closeRental.
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    fireEvent.changeText(getSubtotalInput(utils), "100000")
    // ③ Tier-1 #6: a dropped/mis-bound `value={displayRupiah(rawSubtotal)}` (PengembalianScreen.tsx
    // :651) is invisible to a payload-only assertion, because `fireEvent.changeText` drives state
    // directly regardless of what the field DISPLAYS. This reads the field back.
    expect(utils.getByDisplayValue("100.000")).toBeDefined()

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))

    const [rentalId, payload] = mockCloseRental.mock.calls[0]
    expect(rentalId).toBe("r1")
    expect(payload.subtotalSewa).toBe(100000)
    expect(payload.extraFees).toEqual([])
    expect(payload.discount).toBe(0)
  })

  it("combined: one discount + one extra fee + one payment, all in a single save, pinned as a full payload", async () => {
    // ③ Tier-1 #4: excluded originally on the reasoning that "the composition IS
    // computeReturnTotal, already pinned pure" — true for the ARITHMETIC, not for the
    // CONSTRUCTION of the closeRental arguments, which is exactly what the ⑤/④ migrations touch.
    // Also the only test in this file where `alreadyPaid + pendingPaid`
    // (PengembalianScreen.tsx:241) has BOTH operands non-zero — every other test exercises it
    // with one side at 0, so a regression from `+` to e.g. `Math.max(...)` would pass everywhere
    // else. Discount is added BEFORE the extra fee deliberately — that ordering is exactly what
    // exposed the `addExtraFeeRow` bug fixed under ③ Tier-1 #3; this test doubles as its
    // regression guard.
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))

    const discountInput = addDiscountRow(utils)
    fireEvent.changeText(discountInput, "3000")

    const [descInput, amountInput] = addExtraFeeRow(utils)
    fireEvent.changeText(descInput, "Servis")
    fireEvent.changeText(amountInput, "7000")

    addPayment(utils, 20000)

    // Total Tagihan = 40.000 + 7.000 - 3.000 = 44.000; Sisa = 44.000 - 20.000 = 24.000 (> 0).
    expect(utils.getAllByText("Rp 44.000").length).toBeGreaterThanOrEqual(1)

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))

    const [rentalId, payload] = mockCloseRental.mock.calls[0]
    expect(rentalId).toBe("r1")
    expect(payload).toEqual({
      returnedAt: expect.any(Date),
      kondisiKembali: { bensinKotak: 6, km: null, photos: [] },
      subtotalSewa: 40000,
      extraFees: [{ description: "Servis", amount: 7000 }],
      discount: 3000,
      tujuan: "Kos Barat",
      notes: "catatan awal",
      newPayments: [
        {
          amount: 20000,
          method: "CASH",
          methodDescription: undefined,
          paidAt: expect.any(Date),
          notes: undefined,
        },
      ],
    })
  })
})

// ─── (b) Fuel suggestion "Terapkan" — debt #12, preserved exactly as-is ────

describe("fuel suggestion 'Terapkan' — appends an extra-fee line (debt #12, NOT a Subtotal edit)", () => {
  it("direction 'add' (less fuel returned): appends a positive 'Bensin' extra-fee line, Subtotal untouched", async () => {
    // No explicit `kondisiKeluar` override — the fixture default (`bensinKotak: 6`) IS the
    // collision-free baseline this test needs (③ Tier-1 #2); an explicit `bensinKotak: 4` here
    // would coincidentally match PengembalianScreen.tsx:181's `useState(4)` default and so would
    // NOT prove the hydration effect ran, even though the test would still pass either way.
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    // rawHarga defaults to "5000" — press decrement once: bensinKembali 6 -> 5 (less than taken).
    pressStepper(utils, 6, "dec")

    fireEvent.press(utils.getByText("Terapkan"))

    // The extra-fee line appears with description "Bensin" pre-filled, amount "5.000" — ③
    // Tier-1 #6: pins the field's DISPLAYED value (PengembalianScreen.tsx:709), not just the
    // state that later feeds the payload. Scoped to the row via `within` — "5.000" also matches
    // the untouched "Harga bensin / kotak" field elsewhere on screen, so an unscoped
    // `getByDisplayValue` would throw on an ambiguous match.
    expect(utils.getByDisplayValue("Bensin")).toBeDefined()
    const { within } = require("@testing-library/react-native")
    const bensinRow = getExtraFeeRowByDescription(utils, "Bensin")
    expect(within(bensinRow).getByDisplayValue("5.000")).toBeDefined()
    // Total Tagihan reflects the +5.000 line (40.000 + 5.000) — read from the row itself, not
    // "some element somewhere shows this text" (③ Tier-2 #12).
    expect(getRowValue(utils, "Total Tagihan")).toBe("Rp 45.000")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.subtotalSewa).toBe(40000) // pinned: Subtotal Sewa is NOT touched
    expect(payload.extraFees).toEqual([{ description: "Bensin", amount: 5000 }])
  })

  it("direction 'subtract' (more fuel returned): appends a negative 'Bensin' extra-fee line, Subtotal untouched", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    // press increment once: bensinKembali 6 -> 7 (more than taken).
    pressStepper(utils, 6, "inc")

    fireEvent.press(utils.getByText("Terapkan"))

    expect(utils.getByDisplayValue("Bensin")).toBeDefined()
    // ③ Tier-1 #6: the negative line's DISPLAYED value — pins `displayRupiah`'s "−" (U+2212
    // MINUS SIGN, not the ASCII hyphen U+002D) rendering, which is otherwise unpinned anywhere in
    // this suite (only the payload's numeric -5000 was previously asserted).
    expect(utils.getByDisplayValue("−5.000")).toBeDefined()
    // Total Tagihan reflects the -5.000 line (40.000 - 5.000) — read from the row itself.
    expect(getRowValue(utils, "Total Tagihan")).toBe("Rp 35.000")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.subtotalSewa).toBe(40000) // pinned: Subtotal Sewa is NOT touched
    expect(payload.extraFees).toEqual([{ description: "Bensin", amount: -5000 }])
  })

  it("removing a Terapkan-created NEGATIVE 'Bensin' line (subtract direction) clears it and restores Total Tagihan", async () => {
    // ③ Tier-2 #10: the existing removal tests only ever remove positive-amount rows; a sign
    // bug in the recompute (e.g. `Math.abs` slipping into the removal path) would pass all of
    // them and only show up removing a negative one.
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    pressStepper(utils, 6, "inc") // -> direction "subtract"
    fireEvent.press(utils.getByText("Terapkan"))
    expect(getRowValue(utils, "Total Tagihan")).toBe("Rp 35.000")

    removeExtraFeeRowByDescription(utils, "Bensin")

    expect(utils.queryByDisplayValue("Bensin")).toBeNull()
    // Back to the untouched bill — not 45.000 (which a sign bug turning removal into addition
    // would produce).
    expect(getRowValue(utils, "Total Tagihan")).toBe("Rp 40.000")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.extraFees).toEqual([])
  })

  it("editing Harga bensin/kotak changes the rate the fuel suggestion computes against", async () => {
    // ③ Tier-1 #5: `rawHarga` (PengembalianScreen.tsx:232) stays at its initial "5000" in every
    // OTHER test in this file — its `value`/`onChangeText` binding (⑤ boxes this field too)
    // could be fully destroyed by the migration with a green suite throughout. This is the one
    // test in the file that actually edits it.
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    fireEvent.changeText(getHargaInput(utils), "10000")
    expect(utils.getByDisplayValue("10.000")).toBeDefined()

    pressStepper(utils, 6, "dec") // -> direction "add", selisih 1 kotak
    fireEvent.press(utils.getByText("Terapkan"))

    // 1 kotak * the EDITED rate (10.000), not the stale default (5.000). Scoped via `within` —
    // the Harga field ALSO still shows "10.000", so an unscoped query would be ambiguous.
    const { within } = require("@testing-library/react-native")
    const bensinRow = getExtraFeeRowByDescription(utils, "Bensin")
    expect(within(bensinRow).getByDisplayValue("10.000")).toBeDefined()
    expect(getRowValue(utils, "Total Tagihan")).toBe("Rp 50.000") // 40.000 + 10.000

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.extraFees).toEqual([{ description: "Bensin", amount: 10000 }])
  })

  it("the fuel-suggestion row renders amber (colors.warningContainer) UNCONDITIONALLY — same color for both directions", async () => {
    const { StyleSheet } = require("react-native")

    async function suggestionRowBackground(direction: "inc" | "dec") {
      const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
      pressStepper(utils, 6, direction)
      const terapkan = utils.getByText("Terapkan")
      // ③ Tier-1 #1 fix: the row is located WITHOUT reading `backgroundColor` at all — by
      // `styles.fuelSuggestionRow`'s STRUCTURAL signature (`borderRadius: 12`, a defined `gap`,
      // a defined `padding`, `flexDirection: "row"`). The original version selected the node BY
      // the very property (`backgroundColor === colors.warningContainer`) it then asserted,
      // making all three assertions true by construction — the only real signal was "the search
      // succeeded", and its failure mode was a thrown Error, not an assertion diff. Walking up
      // from "Terapkan": `styles.terapkanBtn` has `borderRadius: 8` (not 12), so the walk
      // correctly skips past it; `styles.fuelSuggestionIcon` also has `borderRadius: 18` and is
      // a sibling of "Terapkan" besides, so it is never even encountered walking upward.
      const row = findAncestorWhere(
        terapkan,
        (flat) =>
          flat.borderRadius === 12 &&
          flat.flexDirection === "row" &&
          flat.gap === spacing.sm &&
          flat.padding === spacing.sm,
      )
      if (!row) throw new Error("fuel suggestion row (styles.fuelSuggestionRow) not found")
      return StyleSheet.flatten(row.props.style).backgroundColor
    }

    const addColor = await suggestionRowBackground("dec") // direction "add"
    const subtractColor = await suggestionRowBackground("inc") // direction "subtract"

    // These three are now genuine assertions — the row was found independently of its colour,
    // so a migration that turned it any OTHER colour (or dropped `warningContainer` from just one
    // direction) would show up as a real value mismatch here, not a thrown "not found".
    expect(addColor).toBe(colors.warningContainer)
    expect(subtractColor).toBe(colors.warningContainer)
    expect(addColor).toBe(subtractColor) // pins "unconditional": identical regardless of direction
  })
})

// ─── (2b·1) Text entry into the fields ⑤ will box, proven through to the payload ───

describe("text entry into ⑤'s boxed fields — KM Kembali / Tujuan / Catatan, pinned to the payload", () => {
  it("KM Kembali: a real numeric entry reaches the payload", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    fireEvent.changeText(getKmInput(utils), "1500")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.kondisiKembali.km).toBe(1500)
  })

  it("KM Kembali: '0' is a real value, not treated as empty — the code checks string truthiness, not numeric truthiness", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    fireEvent.changeText(getKmInput(utils), "0")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.kondisiKembali.km).toBe(0) // not null
  })

  it("KM Kembali: non-numeric characters never reach state — the field's own onChangeText strips them before parseInt ever runs", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    fireEvent.changeText(getKmInput(utils), "abc")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.kondisiKembali.km).toBeNull()
  })

  it("KM Kembali: digits interspersed with letters keep only the digits ('12a3b4' -> 1234)", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    fireEvent.changeText(getKmInput(utils), "12a3b4")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.kondisiKembali.km).toBe(1234)
  })

  it("Tujuan: whitespace-padded input is trimmed before it reaches the payload", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    fireEvent.changeText(getTujuanInput(utils), "  Kos Barat  ")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.tujuan).toBe("Kos Barat")
  })

  it("Tujuan: whitespace-only input trims to an empty string, not preserved as whitespace", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    fireEvent.changeText(getTujuanInput(utils), "   ")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.tujuan).toBe("")
  })

  it("Catatan: whitespace-padded input is trimmed before it reaches the payload", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    fireEvent.changeText(getNotesInput(utils), "  Catatan penting  ")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.notes).toBe("Catatan penting")
  })

  it("Catatan: whitespace-only input trims to an empty string", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    fireEvent.changeText(getNotesInput(utils), "   ")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.notes).toBe("")
  })
})

// ─── (2b·2) Extra-fee and discount row removal ─────────────────────────────

describe("extra-fee and discount row removal", () => {
  it("removing one of two extra-fee rows leaves only the other, and Total Tagihan drops correspondingly", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))

    // `addExtraFeeRow` always returns the NEWEST row's own [desc, amount] pair, regardless of how
    // many rows already exist (③ Tier-1 #3 fix) — safe to call twice in a row like this.
    const [descA, amountA] = addExtraFeeRow(utils)
    fireEvent.changeText(descA, "Fee A")
    fireEvent.changeText(amountA, "1000")

    const [descB, amountB] = addExtraFeeRow(utils)
    fireEvent.changeText(descB, "Fee B")
    fireEvent.changeText(amountB, "2000")

    expect(utils.getByDisplayValue("Fee A")).toBeDefined()
    expect(utils.getByDisplayValue("Fee B")).toBeDefined()
    // 40.000 + 1.000 + 2.000 — read from the row itself, not "some element somewhere shows this
    // text" (③ Tier-2 #12).
    expect(getRowValue(utils, "Total Tagihan")).toBe("Rp 43.000")

    removeExtraFeeRowByDescription(utils, "Fee A")

    expect(utils.queryByDisplayValue("Fee A")).toBeNull()
    expect(utils.getByDisplayValue("Fee B")).toBeDefined()
    // Total Tagihan reflects only the surviving Fee B line (40.000 + 2.000).
    expect(getRowValue(utils, "Total Tagihan")).toBe("Rp 42.000")

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.extraFees).toEqual([{ description: "Fee B", amount: 2000 }])
  })

  it("removing the discount row clears it from the payload and restores Total Tagihan", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    const discountInput = addDiscountRow(utils)
    fireEvent.changeText(discountInput, "5000")
    // 40.000 - 5.000 — read from the row itself.
    expect(getRowValue(utils, "Total Tagihan")).toBe("Rp 35.000")
    const inputCountWithDiscount = allTextInputs(utils).length

    removeDiscountRow(utils, discountInput)

    // ③ Tier-2 #12: `getByText("Diskon")` alone can never fail here — that literal string is the
    // TEXT on both the row's own label (when showing) AND the "+ Diskon" add-button (when the
    // row is removed), so it matches either way. The genuine structural proof that the ROW
    // itself (not just some "Diskon" text somewhere) is gone: exactly one fewer TextInput in the
    // tree than while the row existed.
    expect(allTextInputs(utils).length).toBe(inputCountWithDiscount - 1)
    expect(getRowValue(utils, "Total Tagihan")).toBe("Rp 40.000") // back to the full bill

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.discount).toBe(0)
  })
})

// ─── (2b·3) returnedAt — the Kembali picker interaction (D-2) ─────────────

describe("returnedAt — the Kembali picker interaction (D-2: gets the box, keeps its inlineEditBtn, no interaction change)", () => {
  it("pressing the inline Edit control opens the Android picker, and a chosen value reaches the payload", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))

    // Kembali's own "Edit" is first in JSX order (Waktu Sewa is the screen's first section) —
    // getAllByText, not getByText, so this stays correct even when a payment row (which also
    // renders an "Edit" button, same string) exists elsewhere on screen.
    fireEvent.press(utils.getAllByText("Edit")[0])

    // SURPRISING FINDING (flagged separately in the report): under this jest config,
    // `@react-native-community/datetimepicker`'s default export resolves to its **iOS**
    // implementation regardless of the Platform.ios mock used throughout this suite — that mock
    // only overrides `Platform.OS`'s runtime *value*; Metro/jest's platform-suffixed *file*
    // resolution (which picks `.ios.js` vs `.android.js`) is a separate mechanism it does not
    // touch. This is what makes the interaction testable at all: the iOS implementation is a
    // real renderable component, whereas the Android one (`datetimepicker.android.js`) returns
    // `null` and opens an imperative native dialog with no JS-visible element to drive.
    // PengembalianScreen's OWN `Platform.OS === "android"` JSX guard still reads the mocked
    // value correctly and still renders the picker; only the library's internal module happens
    // to be the iOS file underneath it.
    const DateTimePicker = require("@react-native-community/datetimepicker").default

    // Step 1 — the "date" dialog. handlePickerChange (PengembalianScreen.tsx) only reads
    // getFullYear/getMonth/getDate from this Date.
    let pickers = utils.UNSAFE_getAllByType(DateTimePicker)
    expect(pickers[0].props.mode).toBe("date")
    fireEvent(pickers[0], "change", {}, new Date(2026, 6, 10, 0, 0))

    // Android auto-advances to a "time" dialog (same component instance, updated props) — this
    // is PengembalianScreen's OWN Platform.OS branch (handlePickerChange), not the library's.
    pickers = utils.UNSAFE_getAllByType(DateTimePicker)
    expect(pickers[0].props.mode).toBe("time")
    fireEvent(pickers[0], "change", {}, new Date(2000, 0, 1, 14, 30))

    // The displayed Kembali row reflects the chosen value. `formatHeaderDate(returnedAt)} ·
    // {formatTime(returnedAt)}` renders as ONE Text host node with three string children (date,
    // the literal " · ", time) — getByText matches the concatenation, not the date/time pieces
    // individually.
    expect(utils.getByText("Jumat, 10 Juli 2026 · 14:30")).toBeDefined()

    // ③ Tier-2 #9: the Terlambat caption is on screen in every test in this file (returnedAt,
    // wall-clock-seeded, is always well past the fixture's fixed `dueAt` by the time a test
    // runs) but was asserted nowhere — §6 makes it the only lateness signal; losing it means Mom
    // under-charges. Computed via the same pure `hoursLate` (already pinned independently in
    // rentalMath.test.ts) against the exact Date this test just picked, rather than a hardcoded
    // hour count — hardcoding it would be timezone-dependent (the picker's local Y/M/D/H/M
    // convert to a UTC instant that shifts with whatever TZ the test runs under, same class of
    // issue as the debt #16 note elsewhere in this file).
    const dueAt = new Date("2026-07-02T00:00:00Z")
    const chosenReturnedAt = new Date(2026, 6, 10, 14, 30, 0, 0)
    const expectedJamLambat = hoursLate(dueAt, chosenReturnedAt)
    expect(utils.getByText(`Terlambat ${expectedJamLambat} jam dari estimasi`)).toBeDefined()

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    // Guard 1 / debt #16: the `new Date()` seed at screen-open is untouched by this test — this
    // asserts the picker's OUTPUT, not the seed. Built the same way production code builds
    // `combined` (local Y/M/D from step 1, local H/M from step 2), so this is an exact match,
    // not a tolerant one.
    expect(payload.returnedAt).toEqual(new Date(2026, 6, 10, 14, 30, 0, 0))
  })
})

// ─── (2b·4) PembayaranSheet — existing-payment edit and delete ─────────────

describe("PembayaranSheet — existing-payment edit and delete (④'s Jumlah is the BR-7 proof case)", () => {
  it("method 'Lainnya': its description field (④'s third boxed input) carries through to newPayments", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))

    // Same delta-index rule as `addPayment`: count BEFORE opening the sheet.
    const before = allTextInputs(utils).length
    fireEvent.press(utils.getByText("Tambah Pembayaran"))
    fireEvent.changeText(allTextInputs(utils)[before], "40000") // Jumlah

    // Selecting "Lainnya" inserts ONE new TextInput (the method description) BETWEEN Jumlah and
    // the sheet's own Catatan field — a mid-sheet insertion, the same shape as the extra-fee/
    // discount rows on the main screen (see `addExtraFeeRow`'s docstring), not an
    // appended-at-the-end one. Verified: after this press, the method-description input sits
    // immediately after Jumlah, at `before + 1`.
    fireEvent.press(utils.getByText("Lainnya"))
    const methodDescInput = allTextInputs(utils)[before + 1]
    fireEvent.changeText(methodDescInput, "DANA")

    fireEvent.press(utils.getByText("Simpan"))

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.newPayments).toEqual([
      {
        amount: 40000,
        method: "LAINNYA",
        methodDescription: "DANA",
        paidAt: expect.any(Date),
        notes: undefined,
      },
    ])
  })

  it("editing an existing payment's amount calls updatePayment, updates Sisa, and leaves the close payload's newPayments empty", async () => {
    const paidAt = new Date("2026-07-05T00:00:00Z")
    const rental = makeRental({
      tarif: 40000,
      payments: [{ id: "p1", amount: 25000, method: "CASH", paidAt }],
    })
    mockUpdatePayment.mockResolvedValue(
      makeRental({
        tarif: 40000,
        payments: [{ id: "p1", amount: 40000, method: "CASH", paidAt }],
      }),
    )
    const utils = await renderScreen(rental)
    // Sisa = 40.000 - 25.000 = 15.000, unpaid banner up front.
    expect(utils.getByText("Jaminan ditahan — akan dibuat Hutang Rp 15.000")).toBeDefined()

    // Same delta-index rule as `addPayment`: the sheet's inputs append at the very end of the
    // tree (the Modal is the last sibling) regardless of which control opened it — count BEFORE
    // opening, exactly as `addPayment` does.
    const before = allTextInputs(utils).length
    openExistingPaymentEdit(utils, "Rp 25.000")
    expect(utils.getByText("Edit Pembayaran")).toBeDefined() // confirms EDIT mode, not "Tambah"

    const jumlahInput = allTextInputs(utils)[before]
    fireEvent.changeText(jumlahInput, "40000")
    fireEvent.press(utils.getByText("Simpan"))

    await waitFor(() => expect(mockUpdatePayment).toHaveBeenCalledTimes(1))
    expect(mockUpdatePayment).toHaveBeenCalledWith("r1", "p1", {
      amount: 40000,
      method: "CASH",
      methodDescription: undefined,
      paidAt,
      notes: undefined,
    })

    // Sisa recomputes from the server's returned `rental` (setRental(updated)) — now paid off.
    await waitFor(() => expect(utils.getByText("Jaminan bisa dikembalikan")).toBeDefined())

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    // The edit went through updatePayment directly — pendingPayments (newPayments) is untouched.
    expect(payload.newPayments).toEqual([])
  })

  it("deleting an existing payment calls deletePayment, reverts Sisa to the auto-debt path, and the close payload reflects it", async () => {
    const paidAt = new Date("2026-07-05T00:00:00Z")
    const rental = makeRental({
      tarif: 40000,
      payments: [{ id: "p1", amount: 40000, method: "CASH", paidAt }],
    })
    mockDeletePayment.mockResolvedValue(makeRental({ tarif: 40000, payments: [] }))
    const utils = await renderScreen(rental)
    // Fully paid up front.
    expect(utils.getByText("Jaminan bisa dikembalikan")).toBeDefined()

    openExistingPaymentEdit(utils, "Rp 40.000")
    expect(utils.getByText("Edit Pembayaran")).toBeDefined()

    const { Alert } = require("react-native")
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {})
    fireEvent.press(utils.getByText("Hapus Pembayaran"))

    expect(alertSpy).toHaveBeenCalledTimes(1)
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[]
    const hapusButton = buttons.find((b) => b.text === "Hapus")
    if (!hapusButton?.onPress) {
      throw new Error("'Hapus' button (destructive) not found in Alert.alert's buttons")
    }
    const { act } = require("@testing-library/react-native")
    act(() => hapusButton.onPress!())

    await waitFor(() => expect(mockDeletePayment).toHaveBeenCalledTimes(1))
    expect(mockDeletePayment).toHaveBeenCalledWith("r1", "p1")

    // Sisa reverts to the full bill — the auto-debt banner returns.
    await waitFor(() =>
      expect(utils.getByText("Jaminan ditahan — akan dibuat Hutang Rp 40.000")).toBeDefined(),
    )

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    // The delete went through deletePayment directly — pendingPayments (newPayments) is
    // untouched; the server, not this payload, is now responsible for the auto-debt.
    expect(payload.newPayments).toEqual([])

    alertSpy.mockRestore()
  })
})

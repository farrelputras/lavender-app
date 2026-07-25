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
import { colors } from "@/theme/tokens"

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
    totalBill: 40000,
    totalPaid: 0,
    payments: [],
    jaminan: { items: ["KTP"] },
    kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] },
    kondisiKembali: null,
    notes: "",
    tujuan: "",
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
    rate24h: 40000,
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
 * Presses "Tambah Biaya" and returns the two new TextInputs it adds (description, amount).
 * INDEX FALLBACK: extraFees.map renders inside the Rincian Biaya card, which sits BEFORE the
 * Catatan section in JSX — so the two new TextInputs are inserted in the *middle* of the tree,
 * not appended at the end. Verified empirically (a debug spike dumped the placeholder list
 * before/after pressing "Tambah Biaya"): with N inputs before the press, the new pair lands at
 * indices [N-1, N], displacing Catatan (previously the last, at N-1) to N+1. `addPayment`'s
 * delta-at-the-end technique does NOT apply here for that reason.
 */
function addExtraFeeRow(utils: RenderResult): [any, any] {
  const before = allTextInputs(utils).length
  fireEvent.press(utils.getByText("Tambah Biaya"))
  const inputs = allTextInputs(utils)
  return [inputs[before - 1], inputs[before]]
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

// ─── Dispatch ②b helpers — text-entry, row removal, the picker, PembayaranSheet edit/delete ──

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
 * Presses one extra-fee row's own trash icon.
 * STRUCTURAL FALLBACK: walks up from that row's description TextInput (found via its live
 * `value`, i.e. `getByDisplayValue`) to the nearest ancestor matching `styles.extraFeeRow`'s
 * signature (`flexDirection: "row"`, `alignItems: "center"`, a defined `gap`, no
 * `justifyContent`). `styles.terlambatWarning` shares the same 3 keys but is never encountered
 * here — it lives in a different section of the tree (Waktu Sewa, not Rincian Biaya) and is
 * therefore never an ANCESTOR of this specific starting node, only a sibling elsewhere. Exactly
 * one `TouchableOpacity` lives inside an `extraFeeRow` — the trash icon.
 */
function removeExtraFeeRowByDescription(utils: RenderResult, description: string) {
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
  })

  it("sisa = 0 once payments cover the bill exactly: shows the paid-off banner and CTA", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    addPayment(utils, 40000)
    await waitFor(() => expect(utils.getByText("Jaminan bisa dikembalikan")).toBeDefined())
    expect(utils.getByText("Selesaikan Pengembalian")).toBeDefined()
    expect(utils.queryByText(/Buat Hutang/)).toBeNull()
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
  it("sisa = 0 (fully paid): pins the full CloseRentalInput, including newPayments", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    addPayment(utils, 40000)
    await waitFor(() => expect(utils.getByText("Jaminan bisa dikembalikan")).toBeDefined())

    const beforeSave = Date.now()
    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))

    const [rentalId, payload] = mockCloseRental.mock.calls[0]
    expect(rentalId).toBe("r1")
    expect(payload).toEqual({
      returnedAt: expect.any(Date),
      kondisiKembali: { bensinKotak: 4, km: null, photos: [] },
      subtotalSewa: 40000,
      extraFees: [],
      discount: 0,
      tujuan: "",
      notes: "",
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
    const expectedPaidAt = new Date()
    expectedPaidAt.setHours(0, 0, 0, 0)
    expect(payload.newPayments[0].paidAt).toEqual(expectedPaidAt)
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
      kondisiKembali: { bensinKotak: 4, km: null, photos: [] },
      subtotalSewa: 40000,
      extraFees: [],
      discount: 0,
      tujuan: "",
      notes: "",
      newPayments: [],
    })
    expect(Math.abs(payload.returnedAt.getTime() - beforeSave)).toBeLessThan(5000)
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

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))

    const [rentalId, payload] = mockCloseRental.mock.calls[0]
    expect(rentalId).toBe("r1")
    expect(payload.subtotalSewa).toBe(100000)
    expect(payload.extraFees).toEqual([])
    expect(payload.discount).toBe(0)
  })
})

// ─── (b) Fuel suggestion "Terapkan" — debt #12, preserved exactly as-is ────

describe("fuel suggestion 'Terapkan' — appends an extra-fee line (debt #12, NOT a Subtotal edit)", () => {
  it("direction 'add' (less fuel returned): appends a positive 'Bensin' extra-fee line, Subtotal untouched", async () => {
    const utils = await renderScreen(
      makeRental({
        tarif: 40000,
        payments: [],
        kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] },
      }),
    )
    // rawHarga defaults to "5000" — press decrement once: bensinKembali 4 -> 3 (less than taken).
    pressStepper(utils, 4, "dec")

    fireEvent.press(utils.getByText("Terapkan"))

    // The extra-fee line appears with description "Bensin" pre-filled.
    expect(utils.getByDisplayValue("Bensin")).toBeDefined()
    // Total Tagihan reflects the +5.000 line (40.000 + 5.000). "Rp 45.000" is shown twice (Total
    // Tagihan AND Sisa share the figure — no payment made yet) — getAllByText, not getByText.
    expect(utils.getAllByText("Rp 45.000").length).toBeGreaterThanOrEqual(2)

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.subtotalSewa).toBe(40000) // pinned: Subtotal Sewa is NOT touched
    expect(payload.extraFees).toEqual([{ description: "Bensin", amount: 5000 }])
  })

  it("direction 'subtract' (more fuel returned): appends a negative 'Bensin' extra-fee line, Subtotal untouched", async () => {
    const utils = await renderScreen(
      makeRental({
        tarif: 40000,
        payments: [],
        kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] },
      }),
    )
    // press increment once: bensinKembali 4 -> 5 (more than taken).
    pressStepper(utils, 4, "inc")

    fireEvent.press(utils.getByText("Terapkan"))

    expect(utils.getByDisplayValue("Bensin")).toBeDefined()
    // Total Tagihan reflects the -5.000 line (40.000 - 5.000). "Rp 35.000" is shown twice (Total
    // Tagihan AND Sisa share the figure — no payment made yet) — getAllByText, not getByText.
    expect(utils.getAllByText("Rp 35.000").length).toBeGreaterThanOrEqual(2)

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.subtotalSewa).toBe(40000) // pinned: Subtotal Sewa is NOT touched
    expect(payload.extraFees).toEqual([{ description: "Bensin", amount: -5000 }])
  })

  it("the fuel-suggestion row renders amber (colors.warningContainer) UNCONDITIONALLY — same color for both directions", async () => {
    const { StyleSheet } = require("react-native")

    async function suggestionRowBackground(direction: "inc" | "dec") {
      const utils = await renderScreen(
        makeRental({
          tarif: 40000,
          payments: [],
          kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] },
        }),
      )
      pressStepper(utils, 4, direction)
      const terapkan = utils.getByText("Terapkan")
      // STRUCTURAL FALLBACK: walk up from "Terapkan" to the nearest ancestor whose flattened
      // style has `backgroundColor: colors.warningContainer` — that is `styles.fuelSuggestionRow`
      // itself. `styles.terapkanBtn` (the button "Terapkan" sits directly inside) has its OWN
      // backgroundColor (`tertiaryContainer`, a different value), so the walk correctly skips
      // past it rather than matching prematurely; `styles.fuelSuggestionIcon` also uses
      // `warningContainer` but is a sibling, not an ancestor, of "Terapkan", so it is never
      // encountered walking upward.
      const row = findAncestorWhere(
        terapkan,
        (flat) => flat.backgroundColor === colors.warningContainer,
      )
      if (!row) throw new Error("fuel suggestion row (styles.fuelSuggestionRow) not found")
      return StyleSheet.flatten(row.props.style).backgroundColor
    }

    const addColor = await suggestionRowBackground("dec") // direction "add"
    const subtractColor = await suggestionRowBackground("inc") // direction "subtract"

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

    // Row 1 — same mid-tree insertion rule as `addExtraFeeRow`'s own docstring.
    let before = allTextInputs(utils).length
    fireEvent.press(utils.getByText("Tambah Biaya"))
    let inputs = allTextInputs(utils)
    fireEvent.changeText(inputs[before - 1], "Fee A")
    fireEvent.changeText(inputs[before], "1000")

    // Row 2 — same rule, now relative to the tree state AFTER row 1 was inserted.
    before = allTextInputs(utils).length
    fireEvent.press(utils.getByText("Tambah Biaya"))
    inputs = allTextInputs(utils)
    fireEvent.changeText(inputs[before - 1], "Fee B")
    fireEvent.changeText(inputs[before], "2000")

    expect(utils.getByDisplayValue("Fee A")).toBeDefined()
    expect(utils.getByDisplayValue("Fee B")).toBeDefined()
    // 40.000 + 1.000 + 2.000, shown twice (Total Tagihan and Sisa share the figure, unpaid).
    expect(utils.getAllByText("Rp 43.000").length).toBeGreaterThanOrEqual(2)

    removeExtraFeeRowByDescription(utils, "Fee A")

    expect(utils.queryByDisplayValue("Fee A")).toBeNull()
    expect(utils.getByDisplayValue("Fee B")).toBeDefined()
    // Total Tagihan reflects only the surviving Fee B line (40.000 + 2.000).
    expect(utils.getAllByText("Rp 42.000").length).toBeGreaterThanOrEqual(2)

    pressSave(utils)
    await waitFor(() => expect(mockCloseRental).toHaveBeenCalledTimes(1))
    const [, payload] = mockCloseRental.mock.calls[0]
    expect(payload.extraFees).toEqual([{ description: "Fee B", amount: 2000 }])
  })

  it("removing the discount row clears it from the payload and restores Total Tagihan", async () => {
    const utils = await renderScreen(makeRental({ tarif: 40000, payments: [] }))
    const discountInput = addDiscountRow(utils)
    fireEvent.changeText(discountInput, "5000")
    // 40.000 - 5.000, shown twice (Total Tagihan and Sisa share the figure, unpaid).
    expect(utils.getAllByText("Rp 35.000").length).toBeGreaterThanOrEqual(2)

    removeDiscountRow(utils, discountInput)

    // The row is gone entirely — the "+ Diskon" add-button reappears (its own text is "Diskon").
    expect(utils.getByText("Diskon")).toBeDefined()
    expect(utils.getAllByText("Rp 40.000").length).toBeGreaterThanOrEqual(2) // back to the full bill

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

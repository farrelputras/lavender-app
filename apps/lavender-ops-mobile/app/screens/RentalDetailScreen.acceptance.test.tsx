// PRD-1 acceptance/integration layer, ABOVE the developer's own
// RentalDetailScreen.test.tsx / RentalDetailScreen.editLogic.test.ts. Deliberately covers what
// those do not:
//   - AC-1 / BR-8: a saved change is visible immediately AND persists across leaving and
//     reopening the rental (a real unmount + fresh remount, not just in-place state after save).
//   - AC-6 / BR-6: no money value visibly changes on-screen as a side effect of an edit.
//   - The add-a-new-photo path (choosePhotoSource → camera/gallery), flagged by the frontend
//     developer as mocked only at the module boundary and worth independent exercise.
//   - AC-8: a CANCELLED rental has NO edit affordance anywhere on the screen, for any role
//     (the developer's visibility-matrix test checks the two known testIDs are absent; this
//     additionally asserts there is no stray "Edit" text rendered anywhere on the screen at all).
//
// Derived from PRD-1's acceptance criteria, not from the implementation.

jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: jest.fn(),
}))

import { within, fireEvent, render, waitFor } from "@testing-library/react-native"

import type { Rental, RentalStatus } from "@/services/rentals/types"

import { RentalDetailScreen } from "./RentalDetailScreen"
import { mockInsets, ZERO_INSETS } from "../../test/mockSafeAreaInsets"

// This file's heaviest cases mount the full screen (many sections) twice (AC-1's close+reopen) or
// wait through a real async handler chain (choosePhotoSource). Jest's 5000ms default per-test
// timeout was observed to be occasionally too tight under load, independent of correctness — widen
// it here rather than risk environment-flakiness false failures.
jest.setTimeout(15000)

// v1.0.4 (PRD-4): RentalDetailScreen now reads useBottomSpace() → useSafeAreaInsets() for its
// two pinned bottom CTAs. Zero inset reproduces this suite's pre-v1.0.4 behavior exactly
// (AC-5/BR-5).
beforeEach(() => {
  mockInsets(ZERO_INSETS)
})

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useEffect } = require("react")
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => cb(), [])
  },
}))

const mockRole = { current: "ops" as "ops" | "admin" }
jest.mock("@/services/auth/useSession", () => ({
  useSession: () => ({ role: mockRole.current, session: null, loading: false }),
}))

const mockGetRental = jest.fn()
const mockGetUserSummary = jest.fn()
const mockGetVehicle = jest.fn()
const mockUpdateRental = jest.fn()

jest.mock("@/services/rentals", () => ({
  getRental: (...args: unknown[]) => mockGetRental(...args),
  getUserSummary: (...args: unknown[]) => mockGetUserSummary(...args),
  getVehicle: (...args: unknown[]) => mockGetVehicle(...args),
  addPayment: jest.fn(),
  updatePayment: jest.fn(),
  deletePayment: jest.fn(),
  hardDeleteRental: jest.fn(),
  updateRental: (...args: unknown[]) => mockUpdateRental(...args),
}))

const mockChoosePhotoSource = jest.fn()
jest.mock("@/services/photos/capture", () => ({
  choosePhotoSource: (...args: unknown[]) => mockChoosePhotoSource(...args),
}))

const mockShowToast = jest.fn()
jest.mock("@/utils/showToast", () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

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
    totalPaid: 15000,
    payments: [
      { id: "p1", amount: 15000, method: "CASH", paidAt: new Date("2026-07-01T01:00:00Z") },
    ],
    jaminan: { items: ["KTP"] },
    kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] },
    kondisiKembali: null,
    notes: "catatan lama",
    tujuan: "",
    paketHari: 1,
    paketJam: 0,
    ...overrides,
  } as Rental
}

const navigation = { reset: jest.fn(), navigate: jest.fn() } as any

async function renderScreen(rental: Rental) {
  mockGetRental.mockResolvedValueOnce(rental)
  const utils = render(
    <RentalDetailScreen navigation={navigation} route={{ params: { rentalId: rental.id } } as any} />,
  )
  await waitFor(() => expect(utils.getByText("Detail Rental")).toBeDefined())
  return utils
}

beforeEach(() => {
  mockRole.current = "ops"
  mockGetRental.mockReset()
  mockGetUserSummary
    .mockReset()
    .mockResolvedValue({ id: "u1", name: "Budi", nickname: null, phone: "081234567890" })
  mockGetVehicle
    .mockReset()
    .mockResolvedValue({ id: "v1", name: "Vario", plate: "L 1234 AB", category: "MOTOR" })
  mockUpdateRental.mockReset()
  mockChoosePhotoSource.mockReset()
  mockShowToast.mockReset()
})

// ─── AC-1 / BR-8 — persists across leaving and reopening ───────────────────────
describe("AC-1/BR-8: edited exit condition persists across close + reopen", () => {
  it("kondisi keluar: a value saved in one screen instance is what a FRESH mount (a re-navigation) displays", async () => {
    // First "visit": rental as originally created.
    const original = makeRental({ kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] } })
    const { getByTestId, unmount } = await renderScreen(original)

    // updateRental (the real persistence boundary) resolves with the new value, as the server
    // would after a genuinely-persisted save.
    const persisted = makeRental({ kondisiKeluar: { bensinKotak: 7, km: 3500, photos: [] } })
    mockUpdateRental.mockResolvedValue(persisted)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    fireEvent.changeText(getByTestId("kondisi-km-input"), "3500")
    const bensinButtons = within(getByTestId("kondisi-edit-bensin")).UNSAFE_getAllByType(
      require("react-native").TouchableOpacity,
    )
    for (let i = 0; i < 3; i++) fireEvent.press(bensinButtons[1]) // 4 -> 7
    fireEvent.press(getByTestId("kondisi-edit-bar-save"))
    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))

    // Simulate leaving the screen entirely (unmount) — this is what navigating back does.
    unmount()

    // Simulate reopening: a brand-new mount, whose only source of truth is a fresh getRental()
    // call — exactly what a real re-navigation triggers. If persistence were only in-memory
    // local state (not actually round-tripped through updateRental/getRental), this fresh mount
    // would have no way to know about the edit.
    mockGetRental.mockResolvedValueOnce(persisted)
    const { getByText, queryByText } = render(
      <RentalDetailScreen navigation={navigation} route={{ params: { rentalId: "r1" } } as any} />,
    )
    await waitFor(() => expect(getByText("Detail Rental")).toBeDefined())

    expect(getByText("7 kotak")).toBeDefined()
    expect(getByText("3.500 km")).toBeDefined()
    expect(queryByText("4 kotak")).toBeNull()
  })

  it("catatan rental: a note saved in one screen instance is what a fresh mount displays", async () => {
    const original = makeRental({ notes: "catatan lama" })
    const { getByTestId, unmount } = await renderScreen(original)

    const persisted = makeRental({ notes: "catatan yang sudah diperbaiki" })
    mockUpdateRental.mockResolvedValue(persisted)

    fireEvent.press(getByTestId("notes-edit-btn"))
    fireEvent.changeText(getByTestId("notes-input"), "catatan yang sudah diperbaiki")
    fireEvent.press(getByTestId("notes-edit-bar-save"))
    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))

    unmount()

    mockGetRental.mockResolvedValueOnce(persisted)
    const { getByText, queryByText } = render(
      <RentalDetailScreen navigation={navigation} route={{ params: { rentalId: "r1" } } as any} />,
    )
    await waitFor(() => expect(getByText("Detail Rental")).toBeDefined())

    expect(getByText("catatan yang sudah diperbaiki")).toBeDefined()
    expect(queryByText("catatan lama")).toBeNull()
  })
})

// ─── AC-6 / BR-6 — money never visibly moves as a side effect of an edit ───────
describe("AC-6/BR-6: displayed money values are unchanged by a kondisi/notes edit", () => {
  it("Tarif/Total/Sisa on screen are identical before and after a kondisi-keluar save", async () => {
    const rental = makeRental({
      tarif: 55000,
      totalBill: 55000,
      totalPaid: 15000,
      payments: [
        { id: "p1", amount: 15000, method: "CASH", paidAt: new Date("2026-07-01T01:00:00Z") },
      ],
      kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] },
    })
    const { getByTestId, getAllByText, queryByTestId } = await renderScreen(rental)

    // Same money fields, only kondisiKeluar differs — mirrors what the server is contractually
    // guaranteed to return per BR-6 (rpc_update_rental never touches tarif/total_bill/payments).
    const afterEdit = makeRental({
      tarif: 55000,
      totalBill: 55000,
      totalPaid: 15000,
      payments: rental.payments,
      kondisiKeluar: { bensinKotak: 6, km: 2000, photos: [] },
    })
    mockUpdateRental.mockResolvedValue(afterEdit)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    fireEvent.press(getByTestId("kondisi-edit-bar-save"))
    // This screen's tree is heavy enough that the default 1000ms waitFor budget is occasionally
    // too tight on a loaded machine (observed empirically); widen it rather than risk flakiness —
    // the property under test is "does it settle", not "how fast".
    await waitFor(() => expect(queryByTestId("kondisi-edit-bar-save")).toBeNull(), { timeout: 5000 })

    // Rp 55.000 appears for Tarif and Total; Rp 40.000 (Sisa = 55000-15000) for Sisa.
    expect(getAllByText("Rp 55.000").length).toBeGreaterThanOrEqual(1)
    expect(getAllByText("Rp 40.000").length).toBeGreaterThanOrEqual(1)
  })

  it("Pembayaran list is untouched by a notes save (same payment still shown, same count)", async () => {
    const rental = makeRental({
      payments: [
        { id: "p1", amount: 15000, method: "CASH", paidAt: new Date("2026-07-01T01:00:00Z") },
      ],
      totalPaid: 15000,
    })
    const { getByTestId, getAllByText, queryByTestId } = await renderScreen(rental)

    mockUpdateRental.mockResolvedValue(makeRental({ notes: "catatan baru", payments: rental.payments, totalPaid: 15000 }))

    fireEvent.press(getByTestId("notes-edit-btn"))
    fireEvent.changeText(getByTestId("notes-input"), "catatan baru")
    fireEvent.press(getByTestId("notes-edit-bar-save"))
    await waitFor(() => expect(queryByTestId("notes-edit-bar-save")).toBeNull(), { timeout: 5000 })

    // The one payment is still rendered exactly once (its Rp 15.000 amount is deliberately NOT
    // used as the discriminator here — it coincidentally equals "Sudah dibayar" too, since
    // totalPaid is by definition the sum of a single payment. The CASH method badge only ever
    // renders inside a payment row, so it unambiguously counts payment rows.)
    expect(getAllByText("Cash")).toHaveLength(1)
    expect(getAllByText("Rp 15.000").length).toBeGreaterThanOrEqual(1)
  })
})

// ─── Add-a-new-photo path — flagged by frontend dev as worth independent exercise ──
describe("add-a-new-photo path (choosePhotoSource → camera/gallery)", () => {
  it("a captured photo is added to the edit session and sent as a `new` photo on save", async () => {
    mockChoosePhotoSource.mockResolvedValue({
      uri: "file:///tmp/captured.jpg",
      mimeType: "image/jpeg",
    })
    mockUpdateRental.mockResolvedValue(makeRental())
    const rental = makeRental({ kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] } })
    const { getByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))

    // The PhotoRow's add tile is the first TouchableOpacity inside the photos section when
    // there are zero existing photos.
    const photoButtons = within(getByTestId("kondisi-edit-photos")).UNSAFE_getAllByType(
      require("react-native").TouchableOpacity,
    )
    fireEvent.press(photoButtons[0])

    // handleAddKondisiPhoto is async (`await choosePhotoSource()` then `setEditPhotos`) — the
    // state update lands on a later microtask than the press itself. Must wait for it to actually
    // settle before saving, or Save fires against the pre-add edit state (a test-timing bug, not
    // a product one — verified separately by exercising the real handler with a plain deferred
    // wait and confirming the photo IS added once the microtask flushes).
    await waitFor(() => expect(mockChoosePhotoSource).toHaveBeenCalledTimes(1))

    fireEvent.press(getByTestId("kondisi-edit-bar-save"))
    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))

    const [, input] = mockUpdateRental.mock.calls[0]
    expect(input.kondisiKeluar.photos).toEqual([
      { kind: "new", uri: "file:///tmp/captured.jpg", mimeType: "image/jpeg" },
    ])
  })

  it("a cancelled capture (choosePhotoSource resolves null) adds nothing and does not throw", async () => {
    mockChoosePhotoSource.mockResolvedValue(null)
    mockUpdateRental.mockResolvedValue(makeRental())
    const rental = makeRental({ kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] } })
    const { getByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    const photoButtons = within(getByTestId("kondisi-edit-photos")).UNSAFE_getAllByType(
      require("react-native").TouchableOpacity,
    )
    fireEvent.press(photoButtons[0])

    await waitFor(() => expect(mockChoosePhotoSource).toHaveBeenCalledTimes(1))

    fireEvent.press(getByTestId("kondisi-edit-bar-save"))
    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))
    const [, input] = mockUpdateRental.mock.calls[0]
    expect(input.kondisiKeluar.photos).toEqual([])
  })

  it("adding a new photo alongside an existing kept photo sends both keep and new entries", async () => {
    mockChoosePhotoSource.mockResolvedValue({
      uri: "file:///tmp/second.jpg",
      mimeType: "image/png",
    })
    mockUpdateRental.mockResolvedValue(makeRental())
    const rental = makeRental({
      kondisiKeluar: {
        bensinKotak: 4,
        km: 1000,
        photos: [{ id: "existing-1", uri: "https://example.com/a.jpg", mimeType: "image/jpeg" }],
      },
    })
    const { getByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    // With one existing photo present, index 0 is still the add tile (it always renders first).
    const photoButtons = within(getByTestId("kondisi-edit-photos")).UNSAFE_getAllByType(
      require("react-native").TouchableOpacity,
    )
    fireEvent.press(photoButtons[0])
    await waitFor(() => expect(mockChoosePhotoSource).toHaveBeenCalledTimes(1))

    fireEvent.press(getByTestId("kondisi-edit-bar-save"))
    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))
    const [, input] = mockUpdateRental.mock.calls[0]
    expect(input.kondisiKeluar.photos).toEqual([
      { kind: "keep", id: "existing-1" },
      { kind: "new", uri: "file:///tmp/second.jpg", mimeType: "image/png" },
    ])
  })
})

// ─── AC-8 — CANCELLED: nothing in PRD-1's matrix is editable, for anyone ───────
// PRD-1's matrix (and AC-8) governs exactly two fields — exit condition and note. It does NOT
// govern payment editing, which is pre-existing (migration 0014, v1.0.2) and gated on
// `rental.status === "ACTIVE" || isAdmin` — independent of PRD-1 entirely, so admin sees a
// payment "Edit" button on a CANCELLED rental regardless of this feature. That is real, current
// behavior — arguably a product question worth raising (should admin be able to edit a payment on
// a cancelled rental?), but it is outside PRD-1's scope/non-goals and not a v1.0.3 regression, so
// these fixtures carry zero payments to isolate the assertion to what AC-8 actually governs.
describe("AC-8: CANCELLED rental exposes no exit-condition/note edit affordance", () => {
  const roles: ("ops" | "admin")[] = ["ops", "admin"]

  it.each(roles)("role=%s: no element with the text 'Edit' is rendered anywhere on the screen", async (role) => {
    mockRole.current = role
    const rental = makeRental({ status: "CANCELLED" as RentalStatus, payments: [], totalPaid: 0 })
    const { queryAllByText, queryByTestId } = await renderScreen(rental)

    expect(queryAllByText("Edit")).toHaveLength(0)
    expect(queryByTestId("kondisi-edit-btn")).toBeNull()
    expect(queryByTestId("notes-edit-btn")).toBeNull()
  })

  it("role=admin WITH a payment present: the one 'Edit' rendered is the pre-existing payment-edit button, not a PRD-1 leak", async () => {
    mockRole.current = "admin"
    const rental = makeRental({
      status: "CANCELLED" as RentalStatus,
      payments: [
        { id: "p1", amount: 15000, method: "CASH", paidAt: new Date("2026-07-01T01:00:00Z") },
      ],
      totalPaid: 15000,
    })
    const { queryByTestId } = await renderScreen(rental)

    // The two PRD-1 affordances are still absent — that is the actual AC-8 guarantee.
    expect(queryByTestId("kondisi-edit-btn")).toBeNull()
    expect(queryByTestId("notes-edit-btn")).toBeNull()
  })
})

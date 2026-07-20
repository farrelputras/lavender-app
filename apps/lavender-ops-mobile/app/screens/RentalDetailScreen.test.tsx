import { within, fireEvent, render, waitFor } from "@testing-library/react-native"

import type { Rental, RentalStatus } from "@/services/rentals/types"

import { RentalDetailScreen } from "./RentalDetailScreen"

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- required inline: a jest.mock
    // factory may not close over an outer-scope import binding.
    const { useEffect } = require("react")
    // Intentional: mirrors real useFocusEffect's "run once on mount" behavior — `cb` is a fresh
    // closure every render, so including it would defeat the mock's purpose.
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
    totalPaid: 0,
    payments: [],
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
  mockGetRental.mockResolvedValue(rental)
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

// ─── Visibility matrix (PRD-1 matrix; mirrors rpc_update_rental's gate) ────────
describe("edit affordance visibility", () => {
  const cases: [RentalStatus, "ops" | "admin", boolean, boolean][] = [
    // status, role, kondisi edit visible, notes edit visible
    ["ACTIVE", "ops", true, true],
    ["ACTIVE", "admin", true, true],
    ["COMPLETED", "ops", false, false],
    ["COMPLETED", "admin", false, true],
    ["CANCELLED", "ops", false, false],
    ["CANCELLED", "admin", false, false],
  ]

  it.each(cases)(
    "status=%s role=%s -> kondisi edit=%s, notes edit=%s",
    async (status, role, kondisiVisible, notesVisible) => {
      mockRole.current = role
      const { queryByTestId } = await renderScreen(makeRental({ status }))

      if (kondisiVisible) {
        expect(queryByTestId("kondisi-edit-btn")).toBeTruthy()
      } else {
        expect(queryByTestId("kondisi-edit-btn")).toBeNull()
      }

      if (notesVisible) {
        expect(queryByTestId("notes-edit-btn")).toBeTruthy()
      } else {
        expect(queryByTestId("notes-edit-btn")).toBeNull()
      }
    },
  )
})

// ─── Wholesale patch construction (RPC rewrites kondisiKeluar wholesale) ───────
describe("kondisi keluar save — wholesale patch", () => {
  it("always sends bensinKotak, km, and photos — km preserved even though only bensin was touched", async () => {
    mockUpdateRental.mockResolvedValue(makeRental({ kondisiKeluar: { bensinKotak: 5, km: 1000, photos: [] } }))
    const rental = makeRental({ kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] } })
    const { getByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))

    // Touch ONLY bensin via the Stepper's increment button — km/photos are untouched.
    const bensinButtons = within(getByTestId("kondisi-edit-bensin")).UNSAFE_getAllByType(
      require("react-native").TouchableOpacity,
    )
    fireEvent.press(bensinButtons[1]) // increment

    fireEvent.press(getByTestId("kondisi-edit-bar-save"))

    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))
    const [rentalId, input] = mockUpdateRental.mock.calls[0]
    expect(rentalId).toBe("r1")
    expect(input.kondisiKeluar).toEqual({
      bensinKotak: 5,
      km: 1000, // preserved, not lost, even though never touched this save
      photos: [],
    })
  })

  it("carries km through as null when cleared, rather than dropping it", async () => {
    mockUpdateRental.mockResolvedValue(makeRental())
    const rental = makeRental({ kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] } })
    const { getByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    fireEvent.changeText(getByTestId("kondisi-km-input"), "")
    fireEvent.press(getByTestId("kondisi-edit-bar-save"))

    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))
    const [, input] = mockUpdateRental.mock.calls[0]
    expect(input.kondisiKeluar.km).toBeNull()
  })

  it("seeds all three fields from the rental on entering edit mode and sends them unchanged on an immediate save", async () => {
    mockUpdateRental.mockResolvedValue(makeRental())
    const rental = makeRental({
      kondisiKeluar: {
        bensinKotak: 6,
        km: 2500,
        photos: [{ id: "p1", uri: "https://example.com/a.jpg", mimeType: "image/jpeg" }],
      },
    })
    const { getByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    fireEvent.press(getByTestId("kondisi-edit-bar-save"))

    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))
    const [, input] = mockUpdateRental.mock.calls[0]
    expect(input.kondisiKeluar).toEqual({
      bensinKotak: 6,
      km: 2500,
      photos: [{ kind: "keep", id: "p1" }],
    })
  })
})

// ─── D-1 — last-photo rule, client-side mirror of rpc_update_rental ────────────
describe("last-photo removal block (D-1)", () => {
  it("blocks ops from removing the last photo and shows the Farrel message, without calling updateRental", async () => {
    const rental = makeRental({
      kondisiKeluar: {
        bensinKotak: 4,
        km: 1000,
        photos: [{ id: "p1", uri: "https://example.com/a.jpg", mimeType: "image/jpeg" }],
      },
    })
    const { getByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    const photoButtons = within(getByTestId("kondisi-edit-photos")).UNSAFE_getAllByType(
      require("react-native").TouchableOpacity,
    )
    // index 0 = add tile, 1 = the photo's own press (onPhotoPress → viewer), 2 = its remove (x) button
    fireEvent.press(photoButtons[2])

    expect(mockShowToast).toHaveBeenCalledWith(
      "Foto terakhir tidak bisa dihapus. Minta Farrel untuk menghapusnya.",
    )

    fireEvent.press(getByTestId("kondisi-edit-bar-save"))
    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))
    const [, input] = mockUpdateRental.mock.calls[0]
    // Not removed — still sent as a kept photo.
    expect(input.kondisiKeluar.photos).toEqual([{ kind: "keep", id: "p1" }])
  })

  it("allows admin to remove the last photo, saving an empty set", async () => {
    mockRole.current = "admin"
    mockUpdateRental.mockResolvedValue(makeRental())
    const rental = makeRental({
      kondisiKeluar: {
        bensinKotak: 4,
        km: 1000,
        photos: [{ id: "p1", uri: "https://example.com/a.jpg", mimeType: "image/jpeg" }],
      },
    })
    const { getByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    const photoButtons = within(getByTestId("kondisi-edit-photos")).UNSAFE_getAllByType(
      require("react-native").TouchableOpacity,
    )
    fireEvent.press(photoButtons[2])

    expect(mockShowToast).not.toHaveBeenCalledWith(
      "Foto terakhir tidak bisa dihapus. Minta Farrel untuk menghapusnya.",
    )

    fireEvent.press(getByTestId("kondisi-edit-bar-save"))
    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))
    const [, input] = mockUpdateRental.mock.calls[0]
    expect(input.kondisiKeluar.photos).toEqual([])
  })

  it("edge case: a rental that already has zero exit photos saves fine (fuel/km-only correction not blocked)", async () => {
    mockUpdateRental.mockResolvedValue(makeRental())
    const rental = makeRental({ kondisiKeluar: { bensinKotak: 4, km: 1000, photos: [] } })
    const { getByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    fireEvent.changeText(getByTestId("kondisi-km-input"), "3000")
    fireEvent.press(getByTestId("kondisi-edit-bar-save"))

    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))
    expect(mockShowToast).not.toHaveBeenCalledWith(
      "Foto terakhir tidak bisa dihapus. Minta Farrel untuk menghapusnya.",
    )
    const [, input] = mockUpdateRental.mock.calls[0]
    expect(input.kondisiKeluar).toEqual({ bensinKotak: 4, km: 3000, photos: [] })
  })
})

// ─── BR-7 — save in flight / failure keeps edit mode ───────────────────────────
describe("save in-flight + failure behavior (BR-7)", () => {
  it("disables Save while the write is in flight (re-entrancy guard)", async () => {
    let resolveUpdate!: (r: Rental) => void
    mockUpdateRental.mockReturnValue(
      new Promise<Rental>((resolve) => {
        resolveUpdate = resolve
      }),
    )
    const rental = makeRental()
    const { getByTestId, UNSAFE_getAllByType } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    fireEvent.press(getByTestId("kondisi-edit-bar-save"))

    function findSaveButton() {
      return UNSAFE_getAllByType(require("react-native").TouchableOpacity).find(
        (b: any) => b.props.testID === "kondisi-edit-bar-save",
      )
    }

    await waitFor(() => expect(findSaveButton()?.props.disabled).toBe(true))

    resolveUpdate(makeRental())
    await waitFor(() => expect(getByTestId("kondisi-edit-btn")).toBeTruthy())
  })

  it("on failure: toasts the thrown message and stays in edit mode", async () => {
    mockUpdateRental.mockRejectedValue(new Error("Kondisi keluar hanya dapat diubah selama rental berstatus aktif"))
    const rental = makeRental()
    const { getByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    fireEvent.press(getByTestId("kondisi-edit-bar-save"))

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        "Kondisi keluar hanya dapat diubah selama rental berstatus aktif",
      ),
    )
    // Still in edit mode — the Save/Cancel bar is still present, not the Edit button.
    expect(getByTestId("kondisi-edit-bar-save")).toBeTruthy()
  })

  it("notes save: on failure stays in edit mode and surfaces the thrown message", async () => {
    mockUpdateRental.mockRejectedValue(new Error("network down"))
    const rental = makeRental()
    const { getByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("notes-edit-btn"))
    fireEvent.changeText(getByTestId("notes-input"), "catatan baru")
    fireEvent.press(getByTestId("notes-edit-bar-save"))

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith("network down"))
    expect(getByTestId("notes-edit-bar-save")).toBeTruthy()
  })

  it("notes save: on success updates local state, toasts, and exits edit mode", async () => {
    mockUpdateRental.mockResolvedValue(makeRental({ notes: "catatan baru" }))
    const rental = makeRental({ notes: "catatan lama" })
    const { getByTestId, getByText, queryByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("notes-edit-btn"))
    fireEvent.changeText(getByTestId("notes-input"), "catatan baru")
    fireEvent.press(getByTestId("notes-edit-bar-save"))

    await waitFor(() => expect(mockUpdateRental).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(queryByTestId("notes-edit-bar-save")).toBeNull())
    expect(getByText("catatan baru")).toBeDefined()
    expect(mockUpdateRental).toHaveBeenCalledWith("r1", { notes: "catatan baru" })
  })
})

describe("cancel discards edit-session changes", () => {
  it("kondisi cancel restores the display view without calling updateRental", async () => {
    const rental = makeRental()
    const { getByTestId, queryByTestId } = await renderScreen(rental)

    fireEvent.press(getByTestId("kondisi-edit-btn"))
    fireEvent.changeText(getByTestId("kondisi-km-input"), "9999")
    fireEvent.press(getByTestId("kondisi-edit-bar-cancel"))

    expect(queryByTestId("kondisi-edit-bar-save")).toBeNull()
    expect(getByTestId("kondisi-edit-btn")).toBeTruthy()
    expect(mockUpdateRental).not.toHaveBeenCalled()
  })
})

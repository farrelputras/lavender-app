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

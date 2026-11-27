import { describe, expect, it } from "vitest";

import { butuhBiaya, pilihanAwal, pilihanStatus, susunCatatan, validasiIsianStatus, type IsianStatus, type TiketUntukStatus } from "@/lib/tiket/perbarui";

const tiket = (ubah: Partial<TiketUntukStatus> = {}): TiketUntukStatus => ({ status: "pengujian", keputusan: "disetujui", biaya: 0, estimasi_biaya: 595000, ...ubah });
const isian = (ubah: Partial<IsianStatus> = {}): IsianStatus => ({ ke: "siap_diambil", catatan: "Uji beban lolos.", biaya: 595000, pengujianLolos: true, komponen: "", perkiraanTiba: "", ...ubah });

describe("pilihanStatus", () => {
  it("dari Pengujian sesuai mockup 04h, tanpa Selesai dan Dibatalkan", () => {
    expect(pilihanStatus(tiket()).map((p) => [p.label, p.keterangan])).toEqual([
      ["Siap Diambil", "Tahap berikutnya"],
      ["Dikerjakan", "Jika pengujian gagal"],
      ["Menunggu Komponen", "Butuh komponen tambahan"],
    ]);
  });

  it("Dikerjakan terkunci sebelum estimasi disetujui", () => {
    const p = pilihanStatus(tiket({ status: "didiagnosis", keputusan: "menunggu" }));
    expect(p.find((x) => x.ke === "dikerjakan")?.terkunci).toContain("persetujuan");
    expect(p.find((x) => x.ke === "siap_diambil")?.terkunci).toContain("ditolak");
    expect(p.find((x) => x.ke === "menunggu_part")?.terkunci).toContain("persetujuan");
    expect(pilihanAwal(tiket({ status: "didiagnosis", keputusan: "menunggu" }))).toBeNull();
  });

  it("estimasi ditolak membuka jalur Siap Diambil tanpa perbaikan lalu Dikembalikan", () => {
    expect(pilihanAwal(tiket({ status: "didiagnosis", keputusan: "ditolak" }))).toBe("siap_diambil");
    expect(pilihanStatus(tiket({ status: "didiagnosis", keputusan: "ditolak" })).find((x) => x.ke === "menunggu_part")?.terkunci).toContain("ditolak");
    const dariSiap = pilihanStatus(tiket({ status: "siap_diambil", keputusan: "ditolak" }));
    expect(dariSiap.map((p) => [p.ke, p.terkunci])).toEqual([["dikembalikan", null]]);
  });

  it("tiket tertutup tidak punya pilihan", () => {
    expect(pilihanStatus(tiket({ status: "selesai" }))).toEqual([]);
    expect(pilihanAwal(tiket({ status: "selesai" }))).toBeNull();
  });
});

describe("validasiIsianStatus", () => {
  it("Siap Diambil dari Pengujian: lolos uji, biaya, dan catatan", () => {
    expect(validasiIsianStatus(tiket(), isian())).toEqual([]);
    expect(validasiIsianStatus(tiket(), isian({ pengujianLolos: false, biaya: 0, catatan: "" }))).toEqual([
      "Centang hasil pengujian lolos.",
      "Total biaya akhir wajib diisi dan lebih dari Rp 0.",
      "Catatan wajib diisi sebelum status Siap Diambil.",
    ]);
  });

  it("Siap Diambil tanpa perbaikan tidak meminta biaya", () => {
    expect(butuhBiaya("didiagnosis", "siap_diambil")).toBe(false);
    expect(validasiIsianStatus(tiket({ status: "didiagnosis", keputusan: "ditolak" }), isian({ biaya: 0 }))).toEqual([]);
  });

  it("Menunggu Komponen wajib menyebut komponen", () => {
    expect(validasiIsianStatus(tiket({ status: "dikerjakan" }), isian({ ke: "menunggu_part", catatan: "" }))).toEqual(["Isi nama komponen yang ditunggu."]);
  });

  it("pembatalan wajib beralasan", () => {
    expect(validasiIsianStatus(tiket(), isian({ ke: "dibatalkan", catatan: " " }))).toEqual(["Alasan pembatalan wajib diisi."]);
  });

  it("status belum dipilih", () => {
    expect(validasiIsianStatus(tiket(), isian({ ke: "" }))).toEqual(["Pilih status baru."]);
  });
});

describe("susunCatatan", () => {
  it("menggabungkan komponen dan perkiraan tiba ke catatan riwayat", () => {
    expect(susunCatatan({ ke: "menunggu_part", komponen: "IC charging BQ24780S", perkiraanTiba: "2026-10-20", catatan: "Dipesan via Tokopedia" })).toBe(
      "Komponen: IC charging BQ24780S · perkiraan tiba 2026-10-20. Dipesan via Tokopedia",
    );
    expect(susunCatatan({ ke: "pengujian", komponen: "abaikan", perkiraanTiba: "", catatan: "  " })).toBe("");
  });
});

describe("pilihan terkunci ditolak juga oleh validasi", () => {
  it("menunggu komponen saat estimasi ditolak", () => {
    expect(validasiIsianStatus(tiket({ status: "didiagnosis", keputusan: "ditolak" }), isian({ ke: "menunggu_part", komponen: "LCD" }))).toEqual([
      "Estimasi ditolak: unit dikembalikan tanpa perbaikan.",
    ]);
  });
});

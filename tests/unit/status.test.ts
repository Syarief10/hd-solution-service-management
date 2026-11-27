import { describe, expect, it } from "vitest";

import {
  DAFTAR_STATUS,
  infoWajib,
  isAktif,
  labelPilihan,
  menungguPersetujuan,
  STATUS,
  tahapDariStatus,
  tampilanStatus,
  transisiDiizinkan,
  validasiTransisi,
  type DataTransisi,
} from "@/lib/tiket/status";
import { hariTerlambat, jatuhTempoBesok } from "@/lib/tiket/terlambat";

const data = (ubah: Partial<DataTransisi> = {}): DataTransisi => ({ keputusan: "disetujui", biaya: 595000, catatan: "ok", pengujianLolos: true, ...ubah });

describe("daftar status (K1)", () => {
  it("sembilan kode sama dengan constraint database", () => {
    expect(DAFTAR_STATUS).toEqual([
      "diterima",
      "didiagnosis",
      "menunggu_part",
      "dikerjakan",
      "pengujian",
      "siap_diambil",
      "selesai",
      "dikembalikan",
      "dibatalkan",
    ]);
  });

  it("label mengikuti mockup", () => {
    expect(STATUS.didiagnosis.label).toBe("Pemeriksaan");
    expect(STATUS.menunggu_part.label).toBe("Menunggu Komponen");
    expect(STATUS.pengujian.labelPelanggan).toBe("Sedang Diuji");
  });

  it("status akhir tidak aktif", () => {
    expect(isAktif("selesai")).toBe(false);
    expect(isAktif("dikembalikan")).toBe(false);
    expect(isAktif("dibatalkan")).toBe(false);
    expect(isAktif("pengujian")).toBe(true);
    expect(isAktif("tidak_ada")).toBe(false);
  });

  it("kode tak dikenal tetap bisa ditampilkan", () => {
    expect(tampilanStatus("lama").label).toBe("lama");
  });

  it("menunggu persetujuan adalah keadaan turunan, bukan status", () => {
    expect(menungguPersetujuan({ status: "didiagnosis", estimasi_biaya: 595000, keputusan: "menunggu" })).toBe(true);
    expect(menungguPersetujuan({ status: "didiagnosis", estimasi_biaya: null, keputusan: "menunggu" })).toBe(false);
    expect(menungguPersetujuan({ status: "didiagnosis", estimasi_biaya: 595000, keputusan: "disetujui" })).toBe(false);
  });
});

describe("transisi (sama dengan transisi_status_diizinkan)", () => {
  it.each([
    ["diterima", ["didiagnosis", "dibatalkan"]],
    ["didiagnosis", ["dikerjakan", "menunggu_part", "siap_diambil", "dibatalkan"]],
    ["menunggu_part", ["dikerjakan", "dibatalkan"]],
    ["dikerjakan", ["pengujian", "menunggu_part", "dibatalkan"]],
    ["pengujian", ["siap_diambil", "dikerjakan", "menunggu_part", "dibatalkan"]],
    ["siap_diambil", ["selesai", "dikembalikan", "dibatalkan"]],
    ["selesai", []],
    ["dikembalikan", []],
    ["dibatalkan", []],
  ])("dari %s", (dari, ke) => {
    expect(transisiDiizinkan(dari)).toEqual(ke);
  });

  it.each([
    ["diterima", "dikerjakan"],
    ["diterima", "siap_diambil"],
    ["menunggu_part", "pengujian"],
    ["dikerjakan", "siap_diambil"],
    ["pengujian", "selesai"],
    ["siap_diambil", "pengujian"],
    ["selesai", "dibatalkan"],
  ])("menolak %s → %s", (dari, ke) => {
    expect(validasiTransisi(dari, ke, data())).not.toEqual([]);
  });

  it("dikerjakan hanya setelah estimasi disetujui", () => {
    expect(validasiTransisi("didiagnosis", "dikerjakan", data({ keputusan: "menunggu" }))).toEqual([
      "Pekerjaan belum boleh dimulai: pelanggan belum menyetujui estimasi.",
    ]);
    expect(validasiTransisi("didiagnosis", "dikerjakan", data())).toEqual([]);
  });

  it("siap diambil dari pengujian butuh lolos uji, biaya, dan catatan", () => {
    expect(validasiTransisi("pengujian", "siap_diambil", data({ pengujianLolos: false, biaya: 0, catatan: " " }))).toHaveLength(3);
    expect(validasiTransisi("pengujian", "siap_diambil", data())).toEqual([]);
  });

  it("siap diambil tanpa perbaikan hanya jika estimasi ditolak, tanpa wajib biaya", () => {
    expect(validasiTransisi("didiagnosis", "siap_diambil", data({ keputusan: "menunggu" }))).not.toEqual([]);
    expect(validasiTransisi("didiagnosis", "siap_diambil", data({ keputusan: "ditolak", biaya: 0 }))).toEqual([]);
  });

  it("dikembalikan hanya untuk estimasi ditolak, selesai hanya lewat tutup tiket", () => {
    expect(validasiTransisi("siap_diambil", "dikembalikan", data())).not.toEqual([]);
    expect(validasiTransisi("siap_diambil", "dikembalikan", data({ keputusan: "ditolak" }))).toEqual([]);
    expect(validasiTransisi("siap_diambil", "selesai", data())).not.toEqual([]);
  });

  it("pembatalan wajib beralasan", () => {
    expect(validasiTransisi("dikerjakan", "dibatalkan", data({ catatan: "" }))).toEqual(["Alasan pembatalan wajib diisi."]);
  });

  it("label pilihan dan info wajib sesuai perancangan", () => {
    expect(labelPilihan("pengujian", "siap_diambil")).toBe("Tahap berikutnya");
    expect(labelPilihan("pengujian", "dikerjakan")).toBe("Jika pengujian gagal");
    expect(labelPilihan("pengujian", "menunggu_part")).toBe("Butuh komponen tambahan");
    expect(infoWajib("pengujian", "siap_diambil")).toEqual(["Hasil pengujian lolos", "Total biaya akhir lebih dari Rp 0", "Catatan"]);
  });
});

describe("lintasan 6 tahap", () => {
  it("menunggu komponen digabung ke dikerjakan", () => {
    expect(tahapDariStatus("menunggu_part")).toBe("dikerjakan");
    expect(tahapDariStatus("didiagnosis")).toBe("didiagnosis");
    expect(tahapDariStatus("dibatalkan")).toBeNull();
  });
});

describe("terlambat (Asia/Jakarta)", () => {
  // 21 Okt 2026 09.30 WIB
  const hariIni = new Date("2026-10-21T02:30:00Z");

  it("menghitung selisih hari kalender", () => {
    expect(hariTerlambat({ status: "dikerjakan", estimasi_selesai: "2026-10-15" }, hariIni)).toBe(6);
    expect(hariTerlambat({ status: "dikerjakan", estimasi_selesai: "2026-10-21" }, hariIni)).toBe(0);
  });

  it("tanpa estimasi, siap diambil, atau tiket tertutup tidak terlambat", () => {
    expect(hariTerlambat({ status: "dikerjakan", estimasi_selesai: null }, hariIni)).toBe(0);
    expect(hariTerlambat({ status: "siap_diambil", estimasi_selesai: "2026-10-16" }, hariIni)).toBe(0);
    expect(hariTerlambat({ status: "selesai", estimasi_selesai: "2026-10-01" }, hariIni)).toBe(0);
  });

  it("memakai tanggal Jakarta di sekitar tengah malam", () => {
    // 20 Okt 2026 17.30 UTC = 21 Okt 2026 00.30 WIB
    expect(hariTerlambat({ status: "dikerjakan", estimasi_selesai: "2026-10-20" }, new Date("2026-10-20T17:30:00Z"))).toBe(1);
  });

  it("jatuh tempo besok", () => {
    expect(jatuhTempoBesok({ status: "dikerjakan", estimasi_selesai: "2026-10-22" }, hariIni)).toBe(true);
    expect(jatuhTempoBesok({ status: "siap_diambil", estimasi_selesai: "2026-10-22" }, hariIni)).toBe(false);
  });
});

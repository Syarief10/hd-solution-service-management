import { describe, expect, it } from "vitest";

import {
  barisKomponen,
  hitungGaransi,
  isianDariBaris,
  isianKomponenKosong,
  labelLamaGaransi,
  skemaKomponen,
  tampilanPengadaan,
  validasiKomponen,
  type IsianKomponen,
} from "@/lib/tiket/komponen";

// closed_at 21 Okt 2026 pukul 10.00 WIB = 03.00 UTC.
const SELESAI = { status: "selesai", closed_at: "2026-10-21T03:00:00Z" };
const pada = (tanggal: string) => new Date(`${tanggal}T05:00:00Z`); // siang WIB

describe("hitungGaransi (sama dengan v_garansi)", () => {
  it("belum dimulai selama tiket belum ditutup", () => {
    expect(hitungGaransi(90, { status: "pengujian", closed_at: null })).toMatchObject({ status: "belum_dimulai", mulai: null });
  });

  it("mulai pada tanggal penyerahan (WIB) dan berakhir setelah lama garansi", () => {
    expect(hitungGaransi(90, SELESAI, pada("2026-10-21"))).toEqual({ status: "aktif", mulai: "2026-10-21", berakhir: "2027-01-19", sisaHari: 90 });
  });

  it("closed_at malam hari UTC tetap dihitung tanggal WIB", () => {
    // 20 Okt 18.30 UTC = 21 Okt 01.30 WIB
    expect(hitungGaransi(7, { status: "selesai", closed_at: "2026-10-20T18:30:00Z" }, pada("2026-10-21")).mulai).toBe("2026-10-21");
  });

  it("akan berakhir jika sisa ≤ 14 hari, termasuk hari terakhir", () => {
    expect(hitungGaransi(30, SELESAI, pada("2026-11-06")).status).toBe("akan_berakhir"); // sisa 14
    expect(hitungGaransi(30, SELESAI, pada("2026-11-05")).status).toBe("aktif"); // sisa 15
    expect(hitungGaransi(30, SELESAI, pada("2026-11-20"))).toMatchObject({ status: "akan_berakhir", sisaHari: 0 });
  });

  it("berakhir sehari setelah tanggal akhir", () => {
    expect(hitungGaransi(30, SELESAI, pada("2026-11-21"))).toMatchObject({ status: "berakhir", sisaHari: -1 });
  });

  it("komponen tanpa garansi dan tiket dikembalikan/dibatalkan tidak punya garansi", () => {
    expect(hitungGaransi(0, SELESAI).status).toBe("tanpa_garansi");
    expect(hitungGaransi(90, { status: "dikembalikan", closed_at: "2026-10-21T03:00:00Z" }).status).toBe("tidak_berlaku");
    expect(hitungGaransi(90, { status: "dibatalkan", closed_at: null }).status).toBe("tidak_berlaku");
  });
});

describe("skemaKomponen dan validasiKomponen", () => {
  const isian = (ubah: Partial<IsianKomponen> = {}): IsianKomponen => ({
    ...isianKomponenKosong(),
    nama: "IC Charging BQ24780S",
    biaya: 245000,
    tanggalPesan: "2026-10-15",
    perkiraanTiba: "2026-10-20",
    ...ubah,
  });
  const HARI_INI = "2026-10-21";
  const cek = (i: IsianKomponen) => validasiKomponen(skemaKomponen.parse(i), HARI_INI);

  it("isian kosong bawaan: dipesan, garansi 90 hari", () => {
    expect(isianKomponenKosong()).toMatchObject({ pengadaan: "dipesan", lamaGaransi: 90 });
  });

  it("nama wajib", () => {
    expect(skemaKomponen.safeParse(isian({ nama: "  " })).error?.issues[0].message).toBe("Nama komponen wajib diisi.");
  });

  it("menerima komponen dipesan dengan perkiraan tiba di masa depan", () => {
    expect(cek(isian({ perkiraanTiba: "2026-10-30" }))).toEqual([]);
  });

  it("menolak tanggal yang belum terjadi dan urutan tanggal yang salah", () => {
    expect(cek(isian({ tanggalPesan: "2026-10-22" }))).toContain("Tanggal dipesan tidak boleh setelah hari ini.");
    expect(cek(isian({ pengadaan: "tiba", tanggalTiba: "2026-10-14" }))).toContain("Tanggal tiba tidak boleh sebelum tanggal dipesan.");
    expect(cek(isian({ pengadaan: "tiba", tanggalTiba: "2026-10-20", tanggalPasang: "2026-10-19" }))).toContain("Tanggal dipasang tidak boleh sebelum tanggal tiba.");
  });

  it("komponen yang masih dipesan tidak boleh punya tanggal tiba atau dipasang", () => {
    expect(cek(isian({ tanggalPasang: "2026-10-20" }))).toContain("Komponen yang masih dipesan belum bisa dipasang.");
    expect(cek(isian({ tanggalTiba: "2026-10-20" }))).toContain("Komponen yang sudah tiba: ubah status pengadaan menjadi Sudah tiba.");
  });
});

describe("barisKomponen", () => {
  const data = (ubah: Partial<IsianKomponen>) =>
    skemaKomponen.parse({ ...isianKomponenKosong(), nama: "RAM 8GB", tanggalPesan: "2026-10-15", perkiraanTiba: "2026-10-20", tanggalTiba: "2026-10-19", tanggalPasang: "2026-10-20", ...ubah });

  it("dipesan: hanya tanggal pesan dan perkiraan tiba", () => {
    expect(barisKomponen(data({ pengadaan: "dipesan", tanggalTiba: "", tanggalPasang: "" }))).toMatchObject({
      status_pengadaan: "dipesan",
      tanggal_pesan: "2026-10-15",
      estimasi_tiba: "2026-10-20",
      tanggal_tiba: null,
      tanggal_pasang: null,
    });
  });

  it("sudah tiba: perkiraan tiba dikosongkan", () => {
    expect(barisKomponen(data({ pengadaan: "tiba" }))).toMatchObject({ estimasi_tiba: null, tanggal_tiba: "2026-10-19", tanggal_pasang: "2026-10-20" });
  });

  it("stok tersedia: tanpa tanggal pengadaan", () => {
    expect(barisKomponen(data({ pengadaan: "tersedia" }))).toMatchObject({ tanggal_pesan: null, estimasi_tiba: null, tanggal_tiba: null, tanggal_pasang: "2026-10-20" });
  });

  it("isianDariBaris adalah kebalikannya", () => {
    const b = { ...barisKomponen(data({ pengadaan: "tiba" })), biaya: 245000 };
    expect(skemaKomponen.parse(isianDariBaris(b))).toMatchObject({ nama: "RAM 8GB", pengadaan: "tiba", biaya: 245000, tanggalTiba: "2026-10-19" });
  });
});

describe("label", () => {
  it("komponen terpasang tampil Terpasang", () => {
    expect(tampilanPengadaan({ status_pengadaan: "tiba", tanggal_pasang: "2026-10-20" }).label).toBe("Terpasang");
    expect(tampilanPengadaan({ status_pengadaan: "dipesan", tanggal_pasang: null })).toEqual({ label: "Dipesan", nada: "peringatan" });
  });

  it("lama garansi", () => {
    expect(labelLamaGaransi(0)).toBe("Tanpa garansi");
    expect(labelLamaGaransi(14)).toBe("14 hari");
    expect(labelLamaGaransi(90)).toBe("90 hari (3 bulan)");
  });
});

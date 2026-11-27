import { describe, expect, it } from "vitest";

import { awalMinggu, bacaPeriode, keCsv, MAKS_HARI_RENTANG, queryPeriode, ringkas, selisihHari, seriHarian, type BarisTransaksi } from "@/lib/rekap";

// Jumat, 27 Nov 2026 pukul 10.00 WIB.
const HARI_INI = new Date("2026-11-27T03:00:00Z");

const trx = (ubah: Partial<BarisTransaksi> = {}): BarisTransaksi => ({
  transaksi_id: "t1",
  tanggal: "2026-11-02",
  created_at: "2026-11-02T03:00:00Z",
  nominal: 150000,
  jenis: "servis",
  metode: "tunai",
  keterangan: "Ganti roller",
  nomor_tiket: "HD-2026-0001",
  tiket_id: "a",
  nama_pelanggan: "Devi",
  ...ubah,
});

describe("periode", () => {
  it("bawaan: bulan berjalan", () => {
    expect(bacaPeriode({}, HARI_INI)).toEqual({ jenis: "bulanan", dari: "2026-11-01", sampai: "2026-11-30", label: "November 2026" });
  });

  it("bulanan memakai jumlah hari bulan itu, termasuk kabisat", () => {
    expect(bacaPeriode({ periode: "bulanan", bulan: "2028-02" }, HARI_INI).sampai).toBe("2028-02-29");
    expect(bacaPeriode({ periode: "bulanan", bulan: "2026-13" }, HARI_INI).dari).toBe("2026-11-01");
  });

  it("harian memakai tanggal yang diminta atau hari ini", () => {
    expect(bacaPeriode({ periode: "harian", tanggal: "2026-11-03" }, HARI_INI)).toMatchObject({ dari: "2026-11-03", sampai: "2026-11-03" });
    expect(bacaPeriode({ periode: "harian", tanggal: "2026-02-31" }, HARI_INI).dari).toBe("2026-11-27");
  });

  it("mingguan dari Senin sampai Minggu", () => {
    expect(awalMinggu("2026-11-27")).toBe("2026-11-23");
    expect(awalMinggu("2026-11-29")).toBe("2026-11-23");
    expect(bacaPeriode({ periode: "mingguan", tanggal: "2026-11-27" }, HARI_INI)).toMatchObject({ dari: "2026-11-23", sampai: "2026-11-29" });
  });

  it("rentang ditukar bila terbalik dan dibatasi panjangnya", () => {
    expect(bacaPeriode({ periode: "rentang", dari: "2026-11-10", sampai: "2026-11-01" }, HARI_INI)).toMatchObject({ dari: "2026-11-01", sampai: "2026-11-10" });
    const p = bacaPeriode({ periode: "rentang", dari: "2020-01-01", sampai: "2026-11-27" }, HARI_INI);
    expect(selisihHari(p.sampai, p.dari)).toBe(MAKS_HARI_RENTANG - 1);
  });

  it("query periode bisa dibaca ulang", () => {
    for (const q of [{ periode: "harian", tanggal: "2026-11-03" }, { periode: "mingguan", tanggal: "2026-11-25" }, { periode: "bulanan", bulan: "2026-10" }, { periode: "rentang", dari: "2026-10-05", sampai: "2026-11-02" }]) {
      const p = bacaPeriode(q, HARI_INI);
      expect(bacaPeriode(Object.fromEntries(new URLSearchParams(queryPeriode(p))), HARI_INI)).toEqual(p);
    }
  });
});

describe("ringkasan dan seri", () => {
  it("menjumlahkan nominal (termasuk numeric berupa teks) dan rata-rata", () => {
    expect(ringkas([{ nominal: 450000 }, { nominal: "225000" }])).toEqual({ total: 675000, jumlah: 2, rataRata: 337500 });
  });

  it("tanpa transaksi: rata-rata tidak tersedia, bukan Rp 0", () => {
    expect(ringkas([])).toEqual({ total: 0, jumlah: 0, rataRata: null });
  });

  it("membedakan hari dengan pembayaran, Rp 0, dan belum terjadi", () => {
    const seri = seriHarian([trx({ tanggal: "2026-11-25", nominal: 100000 }), trx({ tanggal: "2026-11-25", nominal: 50000 })], "2026-11-24", "2026-11-29", HARI_INI);
    expect(seri).toHaveLength(6);
    expect(seri[0]).toEqual({ tanggal: "2026-11-24", total: 0, jumlah: 0, keadaan: "nol" });
    expect(seri[1]).toEqual({ tanggal: "2026-11-25", total: 150000, jumlah: 2, keadaan: "ada" });
    expect(seri[3].keadaan).toBe("nol"); // hari ini tanpa transaksi
    expect(seri[4].keadaan).toBe("belum");
  });

  it("total seri sama dengan total ringkasan (rekonsiliasi)", () => {
    const data = [trx({ tanggal: "2026-11-02", nominal: 300000 }), trx({ tanggal: "2026-11-15", nominal: 1150000 }), trx({ tanggal: "2026-11-15", nominal: "50000" })];
    const seri = seriHarian(data, "2026-11-01", "2026-11-30", HARI_INI);
    expect(seri.reduce((s, t) => s + t.total, 0)).toBe(ringkas(data).total);
  });
});

describe("CSV", () => {
  it("berpemisah titik koma, ber-BOM, terurut tanggal, dan diakhiri total", () => {
    const csv = keCsv([trx({ tanggal: "2026-11-10", nominal: 225000, metode: "qris" }), trx()]);
    const baris = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(baris[0]).toBe("Tanggal;No. Tiket;Pelanggan;Jenis;Metode;Keterangan;Nominal");
    expect(baris[1]).toBe("2026-11-02;HD-2026-0001;Devi;Servis;Tunai;Ganti roller;150000");
    expect(baris[2]).toContain(";QRIS;");
    expect(baris.at(-1)).toBe("Total;;;;;;375000");
  });

  it("mengutip sel bertitik koma dan menetralkan awalan formula", () => {
    const csv = keCsv([trx({ keterangan: 'Ganti LCD; "14 inci"', nama_pelanggan: "=HYPERLINK(1)" })]);
    expect(csv).toContain('"Ganti LCD; ""14 inci"""');
    expect(csv).toContain(";'=HYPERLINK(1);");
  });
});

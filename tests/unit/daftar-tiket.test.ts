import { describe, expect, it } from "vitest";

import { adaFilter, bacaFilter, cocokPencarian, keteranganTiket, PER_HALAMAN, queryFilter, ringkasanDaftar, saringTiket, susunDaftar, type TiketDaftar } from "@/lib/tiket/daftar";

const HARI_INI = new Date("2026-10-21T05:00:00Z");

const tiket = (n: number, ubah: Partial<TiketDaftar> = {}): TiketDaftar => ({
  tiket_id: `id-${n}`,
  nomor_tiket: `HD-2026-${String(n).padStart(4, "0")}`,
  status: "dikerjakan",
  estimasi_selesai: "2026-10-25",
  estimasi_biaya: 200000,
  keputusan: "disetujui",
  created_at: `2026-10-${String(Math.min(n, 21)).padStart(2, "0")}T02:00:00Z`,
  closed_at: null,
  status_sejak: "2026-10-20T02:00:00Z",
  nama_pelanggan: `Pelanggan ${n}`,
  no_whatsapp: "6281234567890",
  kategori: "Laptop",
  merk_tipe: "Asus",
  serial_number: `SN${n}X`,
  ...ubah,
});

describe("filter dari query string", () => {
  it("nilai bawaan", () => {
    expect(bacaFilter({})).toEqual({ segmen: "prioritas", q: "", status: "", tanggal: "", dari: "", sampai: "", telat: "", hal: 1, tampil: PER_HALAMAN });
  });

  it("nilai tidak dikenal diabaikan", () => {
    const f = bacaFilter({ segmen: "x", status: "rusak", tanggal: "kemarin", telat: "?", hal: "-3", dari: "21/10/2026" });
    expect(f).toMatchObject({ segmen: "prioritas", status: "", tanggal: "", telat: "", hal: 1, dari: "" });
  });

  it("query bisa dibaca ulang menjadi filter yang sama", () => {
    const f = bacaFilter({ segmen: "semua", q: "Budi", status: "pengujian", tanggal: "rentang", dari: "2026-10-01", sampai: "2026-10-21", telat: "terlambat", hal: "2" });
    const ulang = bacaFilter(Object.fromEntries(new URLSearchParams(queryFilter(f).slice(1))));
    expect(ulang).toEqual(f);
    expect(adaFilter(f)).toBe(true);
    expect(queryFilter(bacaFilter({}))).toBe("");
  });
});

describe("pencarian", () => {
  const t = tiket(12, { nama_pelanggan: "Budi Santoso", serial_number: "PF3K8L2M" });

  it("nomor tiket tanpa memperhatikan tanda hubung dan huruf besar", () => {
    expect(cocokPencarian(t, "hd-2026-0012")).toBe(true);
    expect(cocokPencarian(t, "20260012")).toBe(true);
  });

  it("nama pelanggan dan nomor seri", () => {
    expect(cocokPencarian(t, "budi")).toBe(true);
    expect(cocokPencarian(t, "pf3k8")).toBe(true);
    expect(cocokPencarian(t, "rina")).toBe(false);
  });

  it("1.000 tiket tersaring jauh di bawah 1 detik", () => {
    const banyak = Array.from({ length: 1000 }, (_, i) => tiket(i + 1));
    const mulai = performance.now();
    const hasil = saringTiket(banyak, bacaFilter({ q: "0999" }), HARI_INI);
    expect(performance.now() - mulai).toBeLessThan(1000);
    expect(hasil.map((x) => x.nomor_tiket)).toEqual(["HD-2026-0999"]);
  });
});

describe("filter status, tanggal, keterlambatan", () => {
  const data = [
    tiket(3, { estimasi_selesai: "2026-10-13" }), // terlambat
    tiket(16, { status: "pengujian" }),
    tiket(21, { status: "diterima", estimasi_selesai: null }), // masuk hari ini
  ];

  it("status", () => {
    expect(saringTiket(data, bacaFilter({ status: "pengujian" }), HARI_INI).map((t) => t.tiket_id)).toEqual(["id-16"]);
  });

  it("tanggal penerimaan hari ini dan 7 hari terakhir", () => {
    expect(saringTiket(data, bacaFilter({ tanggal: "hari-ini" }), HARI_INI).map((t) => t.tiket_id)).toEqual(["id-21"]);
    expect(saringTiket(data, bacaFilter({ tanggal: "7-hari" }), HARI_INI).map((t) => t.tiket_id)).toEqual(["id-16", "id-21"]);
  });

  it("rentang tanggal (terbalik tetap diterima)", () => {
    expect(saringTiket(data, bacaFilter({ tanggal: "rentang", dari: "2026-10-20", sampai: "2026-10-01" }), HARI_INI).map((t) => t.tiket_id)).toEqual(["id-3", "id-16"]);
  });

  it("keterlambatan", () => {
    expect(saringTiket(data, bacaFilter({ telat: "terlambat" }), HARI_INI).map((t) => t.tiket_id)).toEqual(["id-3"]);
    expect(saringTiket(data, bacaFilter({ telat: "belum" }), HARI_INI)).toHaveLength(2);
  });
});

describe("ringkasan dan keterangan", () => {
  it("menghitung aktif, terlambat, dan tanpa estimasi dari tiket aktif saja", () => {
    const data = [tiket(3, { estimasi_selesai: "2026-10-13" }), tiket(5, { estimasi_selesai: null }), tiket(6, { status: "selesai", estimasi_selesai: null })];
    expect(ringkasanDaftar(data, HARI_INI)).toEqual({ aktif: 2, terlambat: 1, tanpaEstimasi: 1 });
  });

  it("keterangan tiket tertutup", () => {
    expect(keteranganTiket(tiket(10, { status: "dikembalikan", status_sejak: "2026-10-17T08:00:00Z" }), HARI_INI)).toBe("Estimasi ditolak · ditutup 17 Okt");
    expect(keteranganTiket(tiket(2, { status: "selesai", closed_at: "2026-10-03T07:05:00Z" }), HARI_INI)).toBe("Selesai · diambil 3 Okt");
    expect(keteranganTiket(tiket(4, { status: "dibatalkan", status_sejak: "2026-10-09T03:00:00Z" }), HARI_INI)).toBe("Dibatalkan · 9 Okt");
  });
});

describe("segmen dan paginasi", () => {
  const data = Array.from({ length: 18 }, (_, i) => tiket(i + 1, i === 9 ? { status: "dikembalikan" } : {}));

  it("prioritas hanya tiket aktif, tanpa paginasi", () => {
    const d = susunDaftar(data, bacaFilter({}), HARI_INI);
    expect(d.total).toBe(17);
    expect(d.baris).toHaveLength(17);
  });

  it("semua tiket: terbaru di atas, 10 per halaman", () => {
    const h1 = susunDaftar(data, bacaFilter({ segmen: "semua" }), HARI_INI);
    expect(h1.baris[0].nomor_tiket).toBe("HD-2026-0018");
    expect([h1.mulai, h1.akhir, h1.total, h1.jumlahHalaman]).toEqual([1, 10, 18, 2]);
    const h2 = susunDaftar(data, bacaFilter({ segmen: "semua", hal: "2" }), HARI_INI);
    expect([h2.mulai, h2.akhir]).toEqual([11, 18]);
    expect(h2.baris[0].nomor).toBe(11);
  });

  it("halaman di luar jangkauan jatuh ke halaman terakhir", () => {
    expect(susunDaftar(data, bacaFilter({ segmen: "semua", hal: "9" }), HARI_INI).halaman).toBe(2);
  });
});

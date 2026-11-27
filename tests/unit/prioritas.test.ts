import { describe, expect, it } from "vitest";

import { alasanPrioritas, urutkanPrioritas, type TiketAntrean } from "@/lib/tiket/prioritas";

// Tanggal acuan mockup: Rabu, 21 Oktober 2026 pukul 12.00 WIB.
const HARI_INI = new Date("2026-10-21T05:00:00Z");
const pukul9 = (tgl: string) => `${tgl}T02:00:00Z`;

type Contoh = TiketAntrean & { nomor: string };

const tiket = (nomor: string, status: string, masuk: string, estimasi: string | null, ubah: Partial<Contoh> = {}): Contoh => ({
  nomor,
  status,
  created_at: pukul9(masuk),
  estimasi_selesai: estimasi,
  estimasi_biaya: estimasi ? 300000 : null,
  keputusan: "disetujui",
  ...ubah,
});

// 11 tiket aktif di mockup 02 (data samaran), ditambah tiket tertutup yang tidak boleh masuk antrean.
const MOCKUP: Contoh[] = [
  tiket("HD-2026-0018", "diterima", "2026-10-21", null, { keputusan: "menunggu" }),
  tiket("HD-2026-0017", "diterima", "2026-10-20", null, { keputusan: "menunggu" }),
  tiket("HD-2026-0016", "dikerjakan", "2026-10-19", "2026-10-22"),
  tiket("HD-2026-0015", "siap_diambil", "2026-10-17", "2026-10-21", { siap_sejak: pukul9("2026-10-20") }),
  tiket("HD-2026-0014", "didiagnosis", "2026-10-16", "2026-10-23", { keputusan: "menunggu" }),
  tiket("HD-2026-0013", "didiagnosis", "2026-10-15", null, { keputusan: "menunggu" }),
  tiket("HD-2026-0012", "pengujian", "2026-10-14", "2026-10-17"),
  tiket("HD-2026-0011", "siap_diambil", "2026-10-13", "2026-10-16", { siap_sejak: pukul9("2026-10-16") }),
  tiket("HD-2026-0010", "dikembalikan", "2026-10-12", "2026-10-15", { keputusan: "ditolak" }),
  tiket("HD-2026-0009", "dikerjakan", "2026-10-12", "2026-10-22"),
  tiket("HD-2026-0007", "dikerjakan", "2026-10-10", "2026-10-15"),
  tiket("HD-2026-0003", "menunggu_part", "2026-10-07", "2026-10-13"),
  tiket("HD-2026-0002", "selesai", "2026-10-03", "2026-10-06"),
];

describe("urutan prioritas (mockup 02)", () => {
  const hasil = urutkanPrioritas(MOCKUP, HARI_INI);

  it("urutannya sama persis dengan mockup 02", () => {
    expect(hasil.map((t) => t.nomor)).toEqual([
      "HD-2026-0003",
      "HD-2026-0007",
      "HD-2026-0012",
      "HD-2026-0009",
      "HD-2026-0011",
      "HD-2026-0013",
      "HD-2026-0014",
      "HD-2026-0015",
      "HD-2026-0016",
      "HD-2026-0017",
      "HD-2026-0018",
    ]);
    expect(hasil.map((t) => t.peringkat)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("tiket berstatus akhir tidak masuk antrean", () => {
    expect(hasil.some((t) => ["selesai", "dikembalikan", "dibatalkan"].includes(t.status))).toBe(false);
  });

  it("teks alasan sesuai mockup", () => {
    const alasan = Object.fromEntries(hasil.map((t) => [t.nomor, t.alasan]));
    expect(alasan).toMatchObject({
      "HD-2026-0003": "Terlambat 8 hari",
      "HD-2026-0007": "Terlambat 6 hari",
      "HD-2026-0012": "Terlambat 4 hari",
      "HD-2026-0011": "Siap sejak 16 Okt · hubungi pelanggan",
      "HD-2026-0013": "Estimasi belum tersedia",
      "HD-2026-0014": "Estimasi dikirim, menunggu jawaban",
      "HD-2026-0016": "Jatuh tempo besok",
      "HD-2026-0017": "Estimasi belum tersedia",
      "HD-2026-0018": "Estimasi belum tersedia",
    });
  });
});

describe("aturan alasan (aturan pertama yang cocok)", () => {
  it("terlambat mengalahkan aturan lain", () => {
    expect(alasanPrioritas(tiket("x", "didiagnosis", "2026-10-10", "2026-10-19", { keputusan: "menunggu" }), HARI_INI)).toBe("Terlambat 2 hari");
  });

  it("jatuh tempo besok sebelum menunggu persetujuan", () => {
    expect(alasanPrioritas(tiket("x", "didiagnosis", "2026-10-18", "2026-10-22", { keputusan: "menunggu" }), HARI_INI)).toBe("Jatuh tempo besok");
  });

  it("siap diambil tidak dihitung terlambat walau estimasi sudah lewat", () => {
    expect(alasanPrioritas(tiket("x", "siap_diambil", "2026-10-10", "2026-10-12", { siap_sejak: pukul9("2026-10-14") }), HARI_INI)).toBe("Siap sejak 14 Okt · hubungi pelanggan");
  });

  it("estimasi hari ini belum terlambat (terlambat 0 hari)", () => {
    expect(alasanPrioritas(tiket("x", "dikerjakan", "2026-10-15", "2026-10-21"), HARI_INI)).toBe("Antre sejak 15 Okt");
  });

  it("tanpa estimasi tidak pernah terlambat", () => {
    expect(alasanPrioritas(tiket("x", "diterima", "2026-09-01", null), HARI_INI)).toBe("Estimasi belum tersedia");
  });
});

describe("urutan kasus batas", () => {
  it("keterlambatan sama diurutkan dari yang masuk lebih dulu", () => {
    const hasil = urutkanPrioritas(
      [tiket("baru", "dikerjakan", "2026-10-12", "2026-10-18"), tiket("lama", "dikerjakan", "2026-10-05", "2026-10-18")],
      HARI_INI,
    );
    expect(hasil.map((t) => t.nomor)).toEqual(["lama", "baru"]);
  });

  it("daftar kosong menghasilkan antrean kosong", () => {
    expect(urutkanPrioritas([], HARI_INI)).toEqual([]);
  });
});

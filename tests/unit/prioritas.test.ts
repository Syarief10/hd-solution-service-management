import { describe, expect, it } from "vitest";

import { AHP, alasanPrioritas, BOBOT, BOBOT_NOTEBOOK, hitungAhp, matriksAhp, nilaiKriteria, PERBANDINGAN, urutkanPrioritas, type TiketAntrean } from "@/lib/tiket/prioritas";

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

  it("semua tiket aktif mendapat peringkat berurutan dan skor menurun", () => {
    expect(hasil).toHaveLength(11);
    expect(hasil.map((t) => t.peringkat)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    hasil.slice(1).forEach((t, i) => expect(t.skor).toBeLessThanOrEqual(hasil[i].skor));
  });

  it("tiket terlambat paling lama ada di atas tiket antre biasa", () => {
    const posisi = (n: string) => hasil.findIndex((t) => t.nomor === n);
    expect(posisi("HD-2026-0003")).toBeLessThan(posisi("HD-2026-0017"));
    expect(posisi("HD-2026-0003")).toBeLessThan(posisi("HD-2026-0013"));
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

describe("bobot AHP dari notebook (bobot-ahp.json)", () => {
  it("konsisten (CR < 0,1) dan bobot berjumlah 1", () => {
    expect(BOBOT_NOTEBOOK.cr).toBeLessThan(0.1);
    expect(BOBOT.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 3);
  });

  it("cocok dengan perhitungan ulang dari matriks yang sama", () => {
    BOBOT.forEach((w, i) => expect(w).toBeCloseTo(AHP.bobot[i], 1));
    expect(AHP.konsisten).toBe(true);
    // Penilaian pemilik: kedekatan tenggat paling penting.
    expect(Math.max(...BOBOT)).toBe(BOBOT[1]);
  });

  it("matriks berbalikan dengan diagonal 1", () => {
    const m = matriksAhp(PERBANDINGAN);
    m.forEach((baris, i) => {
      expect(baris[i]).toBe(1);
      baris.forEach((x, j) => expect(x * m[j][i]).toBeCloseTo(1));
    });
  });

  it("matriks semua sama penting menghasilkan bobot rata dan CR 0", () => {
    const h = hitungAhp(Array.from({ length: 5 }, () => [1, 1, 1, 1, 1]));
    h.bobot.forEach((w) => expect(w).toBeCloseTo(0.2));
    expect(h.cr).toBeCloseTo(0);
  });

  it("penilaian bertentangan terdeteksi tidak konsisten, perbandingan kosong ditolak", () => {
    expect(hitungAhp(matriksAhp({ "A-B": 9, "B-C": 9, "A-C": 1 / 9 }, ["A", "B", "C"])).konsisten).toBe(false);
    expect(() => matriksAhp({ "A-B": 2 }, ["A", "B", "C"])).toThrow(/belum diisi/);
  });
});

describe("nilai kriteria dan skor SAW", () => {
  it("terlambat mengisi C1, tenggat besok C2 = 1/2, siap diambil mengisi C5", () => {
    expect(nilaiKriteria(tiket("x", "dikerjakan", "2026-10-10", "2026-10-17"), HARI_INI)).toMatchObject({ C1: 4, C2: 0 });
    expect(nilaiKriteria(tiket("x", "dikerjakan", "2026-10-10", "2026-10-22"), HARI_INI).C2).toBeCloseTo(0.5);
    const siap = nilaiKriteria(tiket("x", "siap_diambil", "2026-10-10", "2026-10-15", { siap_sejak: pukul9("2026-10-16") }), HARI_INI);
    expect(siap).toMatchObject({ C1: 0, C2: 0, C5: 5 });
  });

  it("skor sama dengan perhitungan manual SAW", () => {
    const w = [0.4, 0.3, 0.1, 0.1, 0.1];
    const a = tiket("a", "dikerjakan", "2026-10-10", "2026-10-19", { estimasi_biaya: 100000, status_sejak: pukul9("2026-10-19") }); // C1=2, C3=2
    const b = tiket("b", "dikerjakan", "2026-10-10", "2026-10-17", { estimasi_biaya: 400000, status_sejak: pukul9("2026-10-20") }); // C1=4, C3=1
    const [pertama, kedua] = urutkanPrioritas([a, b], HARI_INI, w);
    expect(pertama.nomor).toBe("b");
    expect(pertama.skor).toBeCloseTo(0.4 + 0.1 * 0.5 + 0.1); // 0,55
    expect(kedua.skor).toBeCloseTo(0.4 * 0.5 + 0.1 + 0.1 * 0.25); // 0,325
  });

  it("sesuai penilaian pemilik: tenggat besok didahulukan daripada terlambat 2 hari", () => {
    const hasil = urutkanPrioritas([tiket("telat", "dikerjakan", "2026-10-10", "2026-10-19"), tiket("besok", "dikerjakan", "2026-10-10", "2026-10-22")], HARI_INI);
    expect(hasil.map((t) => t.nomor)).toEqual(["besok", "telat"]);
  });
});

describe("urutan kasus batas", () => {
  it("skor sama diurutkan dari yang masuk lebih dulu", () => {
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

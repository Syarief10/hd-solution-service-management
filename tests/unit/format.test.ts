import { describe, expect, it } from "vitest";

import {
  formatNomorWa,
  formatRupiah,
  formatRupiahRingkas,
  formatTanggal,
  formatTanggalPanjang,
  formatTanggalWaktu,
  tanggalJakarta,
} from "@/lib/format";

describe("formatRupiah", () => {
  it("memakai titik ribuan", () => {
    expect(formatRupiah(595000)).toBe("Rp 595.000");
    expect(formatRupiah(1150000)).toBe("Rp 1.150.000");
  });

  it("menerima numeric dari Supabase dalam bentuk string", () => {
    expect(formatRupiah("2510000.00")).toBe("Rp 2.510.000");
  });

  it("menangani nol dan pembulatan", () => {
    expect(formatRupiah(0)).toBe("Rp 0");
    expect(formatRupiah(999.6)).toBe("Rp 1.000");
  });

  it("menolak nilai yang bukan angka", () => {
    expect(() => formatRupiah("abc")).toThrow(RangeError);
  });
});

describe("formatRupiahRingkas", () => {
  it("meringkas ribuan dan jutaan seperti grafik di mockup", () => {
    expect(formatRupiahRingkas(675000)).toBe("675 rb");
    expect(formatRupiahRingkas(2510000)).toBe("2,51 jt");
    expect(formatRupiahRingkas(1150000)).toBe("1,15 jt");
    expect(formatRupiahRingkas(500)).toBe("500");
  });
});

describe("tanggal Asia/Jakarta", () => {
  // 21 Okt 2026 02.30 UTC = 21 Okt 2026 09.30 WIB
  const waktu = "2026-10-21T02:30:00Z";

  it("menampilkan jam dinding Jakarta dengan pemisah titik", () => {
    expect(formatTanggalWaktu(waktu)).toBe("21 Okt 2026, 09.30");
  });

  it("menampilkan tanggal singkat dan panjang", () => {
    expect(formatTanggal(waktu)).toBe("21 Okt 2026");
    expect(formatTanggalPanjang(waktu)).toBe("Rabu, 21 Oktober 2026");
  });

  it("memakai tanggal Jakarta, bukan UTC, di sekitar tengah malam", () => {
    // 20 Okt 2026 18.00 UTC sudah 21 Okt 2026 01.00 WIB
    expect(tanggalJakarta("2026-10-20T18:00:00Z")).toBe("2026-10-21");
    expect(formatTanggalWaktu("2026-10-20T18:00:00Z")).toBe("21 Okt 2026, 01.00");
  });

  it("menolak tanggal yang tidak valid", () => {
    expect(() => formatTanggal("bukan-tanggal")).toThrow(RangeError);
  });
});

describe("formatNomorWa", () => {
  it("mengubah format database 62… menjadi 08…", () => {
    expect(formatNomorWa("6281234567890")).toBe("0812-3456-7890");
  });

  it("merapikan isian dengan spasi atau tanda hubung", () => {
    expect(formatNomorWa("0812 3456 789")).toBe("0812-3456-789");
  });

  it("mengembalikan nomor yang tidak dikenali apa adanya", () => {
    expect(formatNomorWa("12345")).toBe("12345");
  });
});

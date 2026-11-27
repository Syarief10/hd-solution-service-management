import { describe, expect, it } from "vitest";

import { labelHasil, labelJenis, linkWa, pesanEstimasi, pesanStatus, pesanTandaTerima, perluTindakLanjut } from "@/lib/whatsapp";

const D = { nama: "Budi Santoso", nomorTiket: "HD-2026-0012", perangkat: "Lenovo IdeaPad Slim 3", link: "https://hd.contoh/status/k7p29xq4m3nd8tfa" };

describe("template pesan", () => {
  it("status memakai label pelanggan, nama panggilan, dan link", () => {
    const p = pesanStatus(D, "pengujian");
    expect(p).toContain("Halo Budi, servis HD-2026-0012 (Lenovo IdeaPad Slim 3) kini berstatus Sedang Diuji.");
    expect(p).toContain("Cek progres: https://hd.contoh/status/k7p29xq4m3nd8tfa");
  });

  it("siap diambil mengingatkan PIN tanpa menuliskan PIN", () => {
    const p = pesanStatus(D, "siap_diambil");
    expect(p).toContain("sebutkan PIN pengambilan");
    expect(p).not.toMatch(/PIN\D{0,20}\d{4}/);
  });

  it("tanda terima berisi nomor tiket dan link", () => {
    expect(pesanTandaTerima(D)).toContain("nomor tiket HD-2026-0012");
    expect(pesanTandaTerima(D)).toContain(D.link);
  });

  it("estimasi memuat total, rincian, perkiraan selesai, dan permintaan jawaban", () => {
    const p = pesanEstimasi(D, {
      total: 595000,
      rincian: [
        { uraian: "Jasa perbaikan", biaya: 350000 },
        { uraian: "IC charging", biaya: 245000 },
      ],
      selesai: "2026-10-17",
      diagnosis: "IC charging rusak.",
    });
    expect(p).toContain("Estimasi biaya: Rp 595.000\n- Jasa perbaikan: Rp 350.000\n- IC charging: Rp 245.000");
    expect(p).toContain("Perkiraan selesai: 17 Okt 2026");
    expect(p).toContain("balas SETUJU");
  });
});

describe("linkWa", () => {
  it("memakai nomor format 62 dan mengodekan pesan", () => {
    expect(linkWa("6281234567890", "Halo Budi")).toBe("https://wa.me/6281234567890?text=Halo%20Budi");
    expect(linkWa("0812-3456-7890", "x")).toBe("https://wa.me/6281234567890?text=x");
  });

  it("nomor tidak valid menghasilkan null", () => {
    expect(linkWa("12345", "x")).toBeNull();
  });
});

describe("status pengiriman", () => {
  it("gagal tanpa tindak lanjut masih perlu ditangani", () => {
    expect(perluTindakLanjut({ hasil: "gagal", tindak_lanjut: null })).toBe(true);
    expect(perluTindakLanjut({ hasil: "gagal", tindak_lanjut: "telepon" })).toBe(false);
    expect(perluTindakLanjut({ hasil: "terkirim", tindak_lanjut: null })).toBe(false);
  });

  it("label hasil dan jenis", () => {
    expect(labelHasil({ hasil: "terkirim", tindak_lanjut: null })).toBe("Ditandai terkirim");
    expect(labelHasil({ hasil: "gagal", tindak_lanjut: "telepon" })).toBe("Gagal · pelanggan dihubungi via telepon");
    expect(labelJenis("siap_diambil")).toBe("Status Siap Diambil");
    expect(labelJenis("tanda_terima")).toBe("Tanda terima");
  });
});

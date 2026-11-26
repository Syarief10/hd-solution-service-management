import { describe, expect, it } from "vitest";

import {
  digitWhatsApp,
  gabungMerkTipe,
  isianKosong,
  namaItemKelengkapan,
  urutanKesalahan,
  validasiPenerimaan,
  whatsAppDatabase,
  type IsianPenerimaan,
} from "@/lib/penerimaan/skema";

const isianValid = (): IsianPenerimaan => ({
  ...isianKosong(),
  nama: "Rudi Hartono",
  whatsapp: "0812-5566-7788",
  jenis: "Laptop",
  merek: "Lenovo",
  model: "IdeaPad Gaming 3 15ACH6",
  nomorSeri: "SN MP2C4R9X",
  keluhan: "Layar berkedip lalu mati setelah ±10 menit dipakai.",
  kondisiFisik: "Lecet di sudut kanan bawah casing.",
  ditinjau: true,
});

describe("validasiPenerimaan", () => {
  it("menerima isian lengkap dan merapikan spasi", () => {
    const hasil = validasiPenerimaan({ ...isianValid(), nama: "  Rudi Hartono  " });
    expect(hasil.ok).toBe(true);
    if (hasil.ok) expect(hasil.data.nama).toBe("Rudi Hartono");
  });

  it("form kosong menghasilkan kesalahan sesuai urutan tampilan", () => {
    const hasil = validasiPenerimaan(isianKosong());
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) {
      expect(urutanKesalahan(hasil.kesalahan)).toEqual([
        "nama",
        "whatsapp",
        "jenis",
        "merek",
        "model",
        "nomorSeri",
        "keluhan",
        "kondisiFisik",
        "ditinjau",
      ]);
    }
  });

  it.each([
    ["0812-55", false],
    ["081234567", false], // 9 digit
    ["0812345678", true], // 10 digit
    ["0812-3456-7890", true],
    ["+62 812 3456 7890", true],
    ["08123456789012", false], // 14 digit
    ["1234567890", false], // tidak diawali 0
  ])("nomor WhatsApp %s valid = %s", (wa, valid) => {
    const hasil = validasiPenerimaan({ ...isianValid(), whatsapp: wa });
    expect(hasil.ok).toBe(valid);
    if (!hasil.ok) expect(hasil.kesalahan.whatsapp).toContain("10–13 digit");
  });

  it("keluhan minimal 10 karakter setelah spasi dibuang", () => {
    const hasil = validasiPenerimaan({ ...isianValid(), keluhan: "  mati    " });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.kesalahan.keluhan).toBe("Tuliskan keluhan pelanggan (minimal 10 karakter).");
  });

  it("wajib mencentang tinjauan bersama pelanggan", () => {
    const hasil = validasiPenerimaan({ ...isianValid(), ditinjau: false });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(Object.keys(hasil.kesalahan)).toEqual(["ditinjau"]);
  });

  it("jenis perangkat hanya dari pilihan database", () => {
    const hasil = validasiPenerimaan({ ...isianValid(), jenis: "Komputer / PC" });
    expect(hasil.ok).toBe(false);
  });
});

describe("format penyimpanan", () => {
  it("nomor WhatsApp disimpan dengan awalan 62", () => {
    expect(digitWhatsApp("0812-3456-7890")).toBe("081234567890");
    expect(whatsAppDatabase("0812-3456-7890")).toBe("6281234567890");
    expect(whatsAppDatabase("+62 812 3456 7890")).toBe("6281234567890");
  });

  it("merek dan model digabung menjadi merk_tipe", () => {
    expect(gabungMerkTipe(" Lenovo ", "IdeaPad Slim 3 ")).toBe("Lenovo IdeaPad Slim 3");
  });

  it("keterangan kelengkapan menyatu dengan nama item", () => {
    expect(namaItemKelengkapan("Charger", "Lenovo 65W USB-C")).toBe("Charger (Lenovo 65W USB-C)");
    expect(namaItemKelengkapan("Tas", "  ")).toBe("Tas");
  });
});

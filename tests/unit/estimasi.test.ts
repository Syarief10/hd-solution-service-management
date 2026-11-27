import { describe, expect, it } from "vitest";

import { skemaCatatan, skemaRincian, totalRincian } from "@/lib/tiket/estimasi";

describe("totalRincian", () => {
  it("null jika belum ada rincian, sehingga total diisi langsung", () => {
    expect(totalRincian([])).toBeNull();
  });

  it("menjumlahkan biaya, termasuk numeric dari database berupa teks", () => {
    expect(totalRincian([{ biaya: 350000 }, { biaya: "245000.00" }])).toBe(595000);
  });

  it("baris berbiaya 0 tetap dihitung", () => {
    expect(totalRincian([{ biaya: 0 }])).toBe(0);
  });
});

describe("skemaRincian", () => {
  const sah = { jenis: "jasa", uraian: " Jasa perbaikan motherboard ", biaya: 350000 } as const;

  it("menerima baris sah dan merapikan uraian", () => {
    expect(skemaRincian.parse(sah)).toEqual({ jenis: "jasa", uraian: "Jasa perbaikan motherboard", biaya: 350000 });
  });

  it.each([
    [{ ...sah, uraian: "   " }, "Uraian wajib diisi."],
    [{ ...sah, uraian: "x".repeat(121) }, "Uraian maksimal 120 karakter."],
    [{ ...sah, biaya: Number.NaN }, "Isi biaya."],
    [{ ...sah, biaya: -1 }, "Biaya tidak boleh negatif."],
    [{ ...sah, biaya: 1500.5 }, "Gunakan rupiah tanpa sen."],
    [{ ...sah, jenis: "ongkir" }, "Pilih jenis rincian."],
  ])("menolak %o", (isian, pesan) => {
    const r = skemaRincian.safeParse(isian);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe(pesan);
  });
});

describe("skemaCatatan", () => {
  it("merapikan spasi", () => {
    expect(skemaCatatan.parse("  IC charging diganti.  ")).toBe("IC charging diganti.");
  });

  it("menolak catatan kosong dan yang lebih dari 1000 karakter", () => {
    expect(skemaCatatan.safeParse("   ").error?.issues[0].message).toBe("Tulis isi catatan.");
    expect(skemaCatatan.safeParse("a".repeat(1001)).error?.issues[0].message).toBe("Catatan maksimal 1000 karakter.");
  });
});

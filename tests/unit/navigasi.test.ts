import { describe, expect, it } from "vitest";

import { TUJUAN_BAWAAN, tujuanAman } from "@/lib/navigasi";

describe("tujuanAman", () => {
  it("mengembalikan halaman internal yang diminta, termasuk query", () => {
    expect(tujuanAman("/tiket/baru")).toBe("/tiket/baru");
    expect(tujuanAman("/tiket?status=dikerjakan&q=andi")).toBe("/tiket?status=dikerjakan&q=andi");
    expect(tujuanAman("/dashboard")).toBe("/dashboard");
  });

  it("memakai dasbor jika tujuan kosong", () => {
    expect(tujuanAman(null)).toBe(TUJUAN_BAWAAN);
    expect(tujuanAman(undefined)).toBe(TUJUAN_BAWAAN);
    expect(tujuanAman("")).toBe(TUJUAN_BAWAAN);
  });

  it("menolak alamat situs lain (open redirect)", () => {
    expect(tujuanAman("https://contoh.com")).toBe(TUJUAN_BAWAAN);
    expect(tujuanAman("//contoh.com/tiket")).toBe(TUJUAN_BAWAAN);
    expect(tujuanAman("/\\contoh.com")).toBe(TUJUAN_BAWAAN);
    expect(tujuanAman("javascript:alert(1)")).toBe(TUJUAN_BAWAAN);
  });

  it("menolak rute yang bukan area internal", () => {
    expect(tujuanAman("/login")).toBe(TUJUAN_BAWAAN);
    expect(tujuanAman("/status/abc")).toBe(TUJUAN_BAWAAN);
    expect(tujuanAman("/tiketpalsu")).toBe(TUJUAN_BAWAAN);
    expect(tujuanAman("/api/kesehatan")).toBe(TUJUAN_BAWAAN);
  });

  it("menolak karakter kontrol dan path yang keluar folder", () => {
    expect(tujuanAman("/tiket\r\nSet-Cookie: x")).toBe(TUJUAN_BAWAAN);
    expect(tujuanAman("/tiket/../login")).toBe(TUJUAN_BAWAAN);
  });
});

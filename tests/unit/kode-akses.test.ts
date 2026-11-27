import { describe, expect, it } from "vitest";

import { formatToken, normalisasiToken, pathStatus, tokenValid } from "@/lib/tiket/kode-akses";

const TOKEN = "k7p29xq4m3nd8tfa";

describe("token link status", () => {
  it("diformat per 4 karakter", () => {
    expect(formatToken(TOKEN)).toBe("k7p2-9xq4-m3nd-8tfa");
  });

  it("normalisasi menerima huruf besar, spasi, tanda hubung, dan link lengkap", () => {
    expect(normalisasiToken("K7P2-9XQ4-M3ND-8TFA")).toBe(TOKEN);
    expect(normalisasiToken("  k7p2 9xq4 m3nd 8tfa ")).toBe(TOKEN);
    expect(normalisasiToken(`https://hdsolution.id/status/${TOKEN}?ref=wa`)).toBe(TOKEN);
  });

  it("memeriksa pola yang sama dengan database", () => {
    expect(tokenValid(TOKEN)).toBe(true);
    expect(tokenValid("")).toBe(false);
    expect(tokenValid("k7p29xq4m3nd8tf")).toBe(false); // 15 karakter
    expect(tokenValid("k7p29xq4m3nd8tf0")).toBe(false); // angka 0 tidak dipakai
    expect(tokenValid("k7p29xq4m3nd8tfl")).toBe(false); // huruf l tidak dipakai
  });

  it("membentuk path halaman status", () => {
    expect(pathStatus(TOKEN)).toBe(`/status/${TOKEN}`);
  });
});

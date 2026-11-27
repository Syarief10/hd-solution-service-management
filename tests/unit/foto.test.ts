import { describe, expect, it } from "vitest";

import { MAKS_FOTO, pathFoto, pathValid, periksaFile, ukuranTarget } from "@/lib/foto";

const TIKET = "44d7dc07-99eb-46e6-ac20-dd0dc2574436";
const FOTO = "0b9d1c2e-3f4a-4b5c-8d6e-7f8091a2b3c4";

describe("ukuranTarget", () => {
  it("memperkecil sisi terpanjang menjadi 1600 dan menjaga perbandingan", () => {
    expect(ukuranTarget(4000, 3000)).toEqual({ lebar: 1600, tinggi: 1200 });
    expect(ukuranTarget(3000, 4000)).toEqual({ lebar: 1200, tinggi: 1600 });
  });

  it("foto kecil tidak diperbesar", () => {
    expect(ukuranTarget(800, 600)).toEqual({ lebar: 800, tinggi: 600 });
  });
});

describe("path foto", () => {
  it("berbentuk {tiket_id}/{uuid}.jpg", () => {
    expect(pathFoto(TIKET, FOTO)).toBe(`${TIKET}/${FOTO}.jpg`);
    expect(pathValid(TIKET, pathFoto(TIKET, FOTO))).toBe(true);
  });

  it("menolak path tiket lain atau bentuk lain", () => {
    expect(pathValid(TIKET, `${FOTO}/${FOTO}.jpg`)).toBe(false);
    expect(pathValid(TIKET, `${TIKET}/../${FOTO}.jpg`)).toBe(false);
    expect(pathValid(TIKET, `${TIKET}/${FOTO}.png`)).toBe(false);
  });
});

describe("periksaFile", () => {
  it("menerima foto dan menolak file lain, file besar, atau foto ke-5", () => {
    expect(periksaFile({ type: "image/jpeg", size: 3_000_000 }, 0)).toBeNull();
    expect(periksaFile({ type: "application/pdf", size: 1000 }, 0)).toContain("File harus berupa foto");
    expect(periksaFile({ type: "image/png", size: 30 * 1024 * 1024 }, 0)).toContain("maksimal 25 MB");
    expect(periksaFile({ type: "image/jpeg", size: 1000 }, MAKS_FOTO)).toBe("Maksimal 4 foto per tiket.");
  });
});

import { describe, expect, it } from "vitest";

import { nomorTahap, susunLintasan, syaratTutupTiket, tabAktif, waktuDiagnosis } from "@/lib/tiket/detail";

const r = (status: string, created_at: string) => ({ riwayat_id: `${status}-${created_at}`, status, catatan_teknis: null, created_at });

// Riwayat HD-2026-0012 di mockup: diterima → didiagnosis → menunggu_part → dikerjakan → pengujian
const RIWAYAT = [
  r("diterima", "2026-10-14T03:15:00Z"),
  r("didiagnosis", "2026-10-14T06:40:00Z"),
  r("menunggu_part", "2026-10-15T04:30:00Z"),
  r("dikerjakan", "2026-10-20T07:10:00Z"),
  r("pengujian", "2026-10-21T02:30:00Z"),
];

describe("susunLintasan", () => {
  it("menandai tahap selesai, sekarang, dan belum dengan waktunya", () => {
    const l = susunLintasan({ status: "pengujian", riwayat_status: RIWAYAT });
    expect(l.map((x) => x.keadaan)).toEqual(["selesai", "selesai", "selesai", "sekarang", "belum", "belum"]);
    expect(l[3].waktu).toBe("2026-10-21T02:30:00Z");
    expect(l[4].waktu).toBeNull();
  });

  it("menunggu komponen digabung ke tahap Dikerjakan dengan keterangan", () => {
    const l = susunLintasan({ status: "pengujian", riwayat_status: RIWAYAT });
    expect(l[2]).toMatchObject({ tahap: "dikerjakan", waktu: "2026-10-15T04:30:00Z", catatan: "Termasuk tunggu komponen" });
  });

  it("status menunggu komponen berada di tahap 3 dari 6", () => {
    expect(nomorTahap("menunggu_part")).toBe(3);
    expect(nomorTahap("siap_diambil")).toBe(5);
  });

  it("tiket selesai menandai semua tahap selesai", () => {
    const l = susunLintasan({ status: "selesai", riwayat_status: [...RIWAYAT, r("siap_diambil", "2026-10-22T01:00:00Z"), r("selesai", "2026-10-23T01:00:00Z")] });
    expect(l.every((x) => x.keadaan === "selesai")).toBe(true);
  });

  it("tiket dibatalkan hanya menandai tahap yang pernah dicapai", () => {
    const l = susunLintasan({ status: "dibatalkan", riwayat_status: [RIWAYAT[0], r("dibatalkan", "2026-10-14T05:00:00Z")] });
    expect(l.map((x) => x.keadaan)).toEqual(["selesai", "belum", "belum", "belum", "belum", "belum"]);
  });
});

describe("waktuDiagnosis", () => {
  it("diambil dari pertama kali masuk Pemeriksaan", () => {
    expect(waktuDiagnosis({ riwayat_status: RIWAYAT })).toBe("2026-10-14T06:40:00Z");
    expect(waktuDiagnosis({ riwayat_status: [RIWAYAT[0]] })).toBeNull();
  });
});

describe("syaratTutupTiket (sama dengan fungsi tutup_tiket)", () => {
  const dasar = {
    status: "siap_diambil",
    keputusan: "disetujui",
    biaya: 595000,
    metode: "tunai",
    kelengkapan: [{ is_checked_in: true, is_checked_out: true }],
  };

  it("lengkap: tidak ada syarat yang kurang", () => {
    expect(syaratTutupTiket(dasar)).toEqual([]);
  });

  it("menyebut setiap syarat yang belum terpenuhi", () => {
    expect(
      syaratTutupTiket({ ...dasar, status: "pengujian", biaya: 0, metode: "", kelengkapan: [{ is_checked_in: true, is_checked_out: false }] }),
    ).toEqual([
      "Status tiket harus Siap Diambil.",
      "Biaya akhir belum diisi.",
      "Pilih metode pembayaran.",
      "Centang semua kelengkapan yang diserahkan kembali.",
    ]);
  });

  it("estimasi ditolak diarahkan ke Dikembalikan", () => {
    expect(syaratTutupTiket({ ...dasar, keputusan: "ditolak" })).toContain("Estimasi ditolak: akhiri tiket sebagai Dikembalikan lewat Perbarui Status.");
  });

  it("item yang tidak diserahkan tidak perlu dicentang", () => {
    expect(syaratTutupTiket({ ...dasar, kelengkapan: [{ is_checked_in: false, is_checked_out: false }] })).toEqual([]);
  });
});

describe("tabAktif", () => {
  it("bawaan Informasi Unit; slug tak dikenal diabaikan", () => {
    expect(tabAktif(undefined)).toBe("informasi");
    expect(tabAktif("estimasi")).toBe("estimasi");
    expect(tabAktif(["transaksi", "x"])).toBe("transaksi");
    expect(tabAktif("hapus")).toBe("informasi");
  });
});

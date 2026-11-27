import { describe, expect, it } from "vitest";

import { bacaPortal, formatWaTersensor, labelPelanggan, langkahBerikutnya, ringkasRincian, susunProgres, teksGaransi } from "@/lib/portal";

const DASAR = {
  nomor_tiket: "HD-2026-0012",
  status: "pengujian",
  nama_pelanggan: "Budi S.",
  no_whatsapp: "0812****7890",
  kategori: "Laptop",
  merk_tipe: "Lenovo IdeaPad Slim 3",
  keluhan: "Laptop tidak menyala",
  estimasi_biaya: "595000.00",
  estimasi_selesai: "2026-10-17",
  rincian_estimasi: [
    { jenis: "jasa", uraian: "Jasa perbaikan", biaya: 350000 },
    { jenis: "komponen", uraian: "IC charging", biaya: "245000.00" },
  ],
  keputusan: "disetujui",
  keputusan_cara: "whatsapp",
  keputusan_at: "2026-10-15T04:05:00Z",
  biaya: 0,
  created_at: "2026-10-14T03:15:00Z",
  closed_at: null,
  token_berakhir: null,
  barang_bawaan: ["Charger", "Tas"],
  linimasa: [
    { status: "diterima", waktu: "2026-10-14T03:15:00Z" },
    { status: "didiagnosis", waktu: "2026-10-14T06:40:00Z" },
    { status: "menunggu_part", waktu: "2026-10-15T04:30:00Z" },
    { status: "dikerjakan", waktu: "2026-10-20T07:10:00Z" },
    { status: "pengujian", waktu: "2026-10-21T02:30:00Z" },
  ],
  garansi: [{ komponen: "IC Charging", lama_hari: 90, mulai: null, berakhir: null, status: "belum_dimulai" }],
  bisa_ulas: false,
};

describe("bacaPortal", () => {
  it("jawaban kosong dan bentuk yang salah sama-sama dianggap tidak berlaku", () => {
    expect(bacaPortal(null)).toBeNull();
    expect(bacaPortal({ nomor_tiket: "HD-2026-0012" })).toBeNull();
  });

  it("mengubah numeric dari database menjadi angka", () => {
    const d = bacaPortal(DASAR)!;
    expect(d.estimasi_biaya).toBe(595000);
    expect(d.rincian_estimasi[1].biaya).toBe(245000);
  });
});

describe("tampilan pelanggan", () => {
  it("WhatsApp tersensor diberi pemisah", () => {
    expect(formatWaTersensor("0812****7890")).toBe("0812-****-7890");
    expect(formatWaTersensor(null)).toBe("—");
  });

  it("label pelanggan untuk Pengujian adalah Sedang Diuji", () => {
    expect(labelPelanggan("pengujian")).toBe("Sedang Diuji");
  });

  it("rincian diringkas dalam satu baris", () => {
    expect(ringkasRincian(bacaPortal(DASAR)!.rincian_estimasi)).toBe("Jasa perbaikan Rp 350.000 · IC charging Rp 245.000");
    expect(ringkasRincian([])).toBeNull();
  });

  it("garansi sebelum dan sesudah unit diambil", () => {
    expect(teksGaransi(DASAR.garansi[0])).toBe("Garansi 90 hari, mulai berlaku saat unit Anda ambil.");
    expect(teksGaransi({ komponen: "IC", lama_hari: 90, mulai: "2026-10-21", berakhir: "2027-01-19", status: "aktif" })).toBe("Garansi 90 hari, berlaku sampai 19 Jan 2027.");
    expect(teksGaransi({ komponen: "IC", lama_hari: 30, mulai: "2026-01-01", berakhir: "2026-01-31", status: "berakhir" })).toBe("Garansi 30 hari, berakhir 31 Jan 2026.");
  });
});

describe("langkahBerikutnya", () => {
  it("estimasi menunggu jawaban meminta tindakan pelanggan", () => {
    expect(langkahBerikutnya({ status: "didiagnosis", keputusan: "menunggu", estimasi_biaya: 595000 }).perluTindakan).toBe(true);
  });

  it("pemeriksaan tanpa estimasi belum perlu tindakan", () => {
    expect(langkahBerikutnya({ status: "didiagnosis", keputusan: "menunggu", estimasi_biaya: null })).toMatchObject({ perluTindakan: false });
  });

  it("siap diambil mengingatkan tanda terima dan PIN", () => {
    expect(langkahBerikutnya({ status: "siap_diambil", keputusan: "disetujui", estimasi_biaya: 1 }).teks).toContain("PIN pengambilan");
  });
});

describe("susunProgres", () => {
  it("riwayat berurutan, tahap terakhir 'sekarang', lalu Siap Diambil menunggu", () => {
    const p = susunProgres(bacaPortal(DASAR)!);
    expect(p.map((l) => [l.label, l.keadaan])).toEqual([
      ["Diterima", "selesai"],
      ["Pemeriksaan", "selesai"],
      ["Menunggu Komponen", "selesai"],
      ["Dikerjakan", "selesai"],
      ["Sedang Diuji", "sekarang"],
      ["Siap Diambil", "menunggu"],
    ]);
  });

  it("tiket baru menampilkan semua tahap berikutnya sebagai menunggu", () => {
    const p = susunProgres({ status: "diterima", linimasa: [{ status: "diterima", waktu: "2026-10-14T03:15:00Z" }] });
    expect(p.map((l) => l.label)).toEqual(["Diterima", "Pemeriksaan", "Dikerjakan", "Sedang Diuji", "Siap Diambil"]);
  });

  it("tiket yang sudah berakhir tidak punya tahap menunggu", () => {
    const p = susunProgres({ status: "selesai", linimasa: [{ status: "siap_diambil", waktu: "2026-10-22T03:00:00Z" }, { status: "selesai", waktu: "2026-10-23T03:00:00Z" }] });
    expect(p.every((l) => l.keadaan === "selesai")).toBe(true);
  });
});

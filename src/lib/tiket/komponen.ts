// Komponen pengganti dan garansinya (Iterasi 2, FR-GAR-01/02, mockup 04e/04f).
// Fungsi murni; dipakai tab Komponen (klien/server) dan server action.
//
// Aturan dari database:
// - `spare_part.status_pengadaan`: dipesan, tiba, tersedia;
// - `tanggal_tiba` tidak boleh sebelum `tanggal_pesan`;
// - `tiket.pakai_komponen = false` (Tanpa komponen) tidak boleh punya baris komponen;
// - komponen tiket berstatus akhir terkunci (tidak bisa ditambah, diubah, atau dihapus);
// - garansi dihitung seperti view `v_garansi`: mulai saat tiket Selesai (tanggal `closed_at` WIB),
//   berakhir setelah `lama_garansi_hari`, "akan berakhir" jika sisa ≤ 14 hari. Komponen tanpa
//   garansi (0 hari) dan tiket Dibatalkan/Dikembalikan tidak punya garansi.
import { z } from "zod";

import { tanggalJakarta } from "@/lib/format";

export const STATUS_PENGADAAN = ["dipesan", "tiba", "tersedia"] as const;
export type StatusPengadaan = (typeof STATUS_PENGADAAN)[number];

export const LABEL_PENGADAAN: Record<StatusPengadaan, string> = {
  dipesan: "Dipesan",
  tiba: "Sudah tiba",
  tersedia: "Stok tersedia",
};

/** Pilihan lama garansi (hari). Nilai bawaan skema 90 hari (K15, menunggu jawaban pemilik). */
export const PILIHAN_GARANSI = [0, 7, 14, 30, 60, 90, 180, 365] as const;
export const GARANSI_BAWAAN = 90;

export function labelLamaGaransi(hari: number): string {
  if (hari <= 0) return "Tanpa garansi";
  if (hari === 90) return "90 hari (3 bulan)";
  if (hari === 180) return "180 hari (6 bulan)";
  if (hari === 365) return "365 hari (1 tahun)";
  return `${hari} hari`;
}

/** Label pengadaan untuk tabel: komponen yang sudah dipasang tampil "Terpasang". */
export function tampilanPengadaan(k: { status_pengadaan: string; tanggal_pasang: string | null }): { label: string; nada: "sukses" | "info" | "peringatan" } {
  if (k.tanggal_pasang) return { label: "Terpasang", nada: "sukses" };
  if (k.status_pengadaan === "dipesan") return { label: LABEL_PENGADAAN.dipesan, nada: "peringatan" };
  return { label: LABEL_PENGADAAN[k.status_pengadaan as StatusPengadaan] ?? k.status_pengadaan, nada: "info" };
}

export type StatusGaransi = "tanpa_garansi" | "tidak_berlaku" | "belum_dimulai" | "aktif" | "akan_berakhir" | "berakhir";

export type Garansi = {
  status: StatusGaransi;
  /** `YYYY-MM-DD` atau null jika belum dimulai. */
  mulai: string | null;
  berakhir: string | null;
  /** Sisa hari (negatif jika sudah lewat); null jika belum dimulai. */
  sisaHari: number | null;
};

const hariKe = (tanggal: string) => Date.UTC(+tanggal.slice(0, 4), +tanggal.slice(5, 7) - 1, +tanggal.slice(8, 10)) / 86_400_000;
const tambahHari = (tanggal: string, n: number) => new Date((hariKe(tanggal) + n) * 86_400_000).toISOString().slice(0, 10);

/** Garansi satu komponen, sama dengan perhitungan view `v_garansi`. */
export function hitungGaransi(
  lamaHari: number,
  tiket: { status: string; closed_at: string | null },
  sekarang: Date = new Date(),
): Garansi {
  if (lamaHari <= 0) return { status: "tanpa_garansi", mulai: null, berakhir: null, sisaHari: null };
  if (tiket.status === "dibatalkan" || tiket.status === "dikembalikan") return { status: "tidak_berlaku", mulai: null, berakhir: null, sisaHari: null };
  if (tiket.status !== "selesai" || !tiket.closed_at) return { status: "belum_dimulai", mulai: null, berakhir: null, sisaHari: null };

  const mulai = tanggalJakarta(tiket.closed_at);
  const berakhir = tambahHari(mulai, lamaHari);
  const sisaHari = hariKe(berakhir) - hariKe(tanggalJakarta(sekarang));
  const status: StatusGaransi = sisaHari < 0 ? "berakhir" : sisaHari <= 14 ? "akan_berakhir" : "aktif";
  return { status, mulai, berakhir, sisaHari };
}

const tanggal = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.")]);

export const skemaKomponen = z.object({
  nama: z.string().trim().min(1, "Nama komponen wajib diisi.").max(120, "Nama komponen maksimal 120 karakter."),
  pengadaan: z.enum(STATUS_PENGADAAN, { error: "Pilih status pengadaan." }),
  /** Rupiah; null jika belum diketahui. */
  biaya: z.number().int("Gunakan rupiah tanpa sen.").min(0, "Biaya tidak boleh negatif.").max(1_000_000_000, "Nominal terlalu besar.").nullable(),
  lamaGaransi: z.number().int().min(0, "Lama garansi tidak boleh negatif.").max(3650, "Lama garansi maksimal 10 tahun."),
  tanggalPesan: tanggal,
  perkiraanTiba: tanggal,
  tanggalTiba: tanggal,
  tanggalPasang: tanggal,
});

export type IsianKomponen = z.input<typeof skemaKomponen>;
export type DataKomponen = z.output<typeof skemaKomponen>;

export function isianKomponenKosong(): IsianKomponen {
  return { nama: "", pengadaan: "dipesan", biaya: null, lamaGaransi: GARANSI_BAWAAN, tanggalPesan: "", perkiraanTiba: "", tanggalTiba: "", tanggalPasang: "" };
}

/**
 * Kesalahan isian komponen selain bentuk data: urutan tanggal dan tanggal yang belum terjadi.
 * `hariIni` dalam `YYYY-MM-DD` (WIB). Perkiraan tiba boleh di masa depan.
 */
export function validasiKomponen(d: DataKomponen, hariIni: string): string[] {
  const k: string[] = [];
  if (d.tanggalPesan && d.tanggalPesan > hariIni) k.push("Tanggal dipesan tidak boleh setelah hari ini.");
  if (d.tanggalTiba && d.tanggalTiba > hariIni) k.push("Tanggal tiba tidak boleh setelah hari ini.");
  if (d.tanggalPasang && d.tanggalPasang > hariIni) k.push("Tanggal dipasang tidak boleh setelah hari ini.");
  if (d.tanggalPesan && d.tanggalTiba && d.tanggalTiba < d.tanggalPesan) k.push("Tanggal tiba tidak boleh sebelum tanggal dipesan.");
  if (d.tanggalPesan && d.perkiraanTiba && d.perkiraanTiba < d.tanggalPesan) k.push("Perkiraan tiba tidak boleh sebelum tanggal dipesan.");
  if (d.tanggalTiba && d.tanggalPasang && d.tanggalPasang < d.tanggalTiba) k.push("Tanggal dipasang tidak boleh sebelum tanggal tiba.");
  if (d.pengadaan === "dipesan" && d.tanggalTiba) k.push("Komponen yang sudah tiba: ubah status pengadaan menjadi Sudah tiba.");
  if (d.pengadaan === "dipesan" && d.tanggalPasang) k.push("Komponen yang masih dipesan belum bisa dipasang.");
  return k;
}

/** Baris tabel `spare_part` dari isian yang sudah valid. Tanggal yang tidak relevan dikosongkan. */
export function barisKomponen(d: DataKomponen) {
  const dipesan = d.pengadaan === "dipesan";
  const tersedia = d.pengadaan === "tersedia";
  return {
    nama_komponen: d.nama,
    status_pengadaan: d.pengadaan,
    biaya: d.biaya,
    lama_garansi_hari: d.lamaGaransi,
    tanggal_pesan: tersedia ? null : d.tanggalPesan || null,
    estimasi_tiba: dipesan ? d.perkiraanTiba || null : null,
    tanggal_tiba: dipesan || tersedia ? null : d.tanggalTiba || null,
    tanggal_pasang: dipesan ? null : d.tanggalPasang || null,
  };
}

/** Isian form dari baris yang sudah tersimpan (untuk Ubah). */
export function isianDariBaris(b: {
  nama_komponen: string;
  status_pengadaan: string;
  biaya: number | null;
  lama_garansi_hari: number;
  tanggal_pesan: string | null;
  estimasi_tiba: string | null;
  tanggal_tiba: string | null;
  tanggal_pasang: string | null;
}): IsianKomponen {
  return {
    nama: b.nama_komponen,
    pengadaan: (STATUS_PENGADAAN as readonly string[]).includes(b.status_pengadaan) ? (b.status_pengadaan as StatusPengadaan) : "dipesan",
    biaya: b.biaya === null ? null : Number(b.biaya),
    lamaGaransi: b.lama_garansi_hari,
    tanggalPesan: b.tanggal_pesan ?? "",
    perkiraanTiba: b.estimasi_tiba ?? "",
    tanggalTiba: b.tanggal_tiba ?? "",
    tanggalPasang: b.tanggal_pasang ?? "",
  };
}

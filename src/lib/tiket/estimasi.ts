// Rincian estimasi per baris (K4, tabel `rincian_estimasi`) dan catatan pengerjaan (K7, tabel
// `catatan_pengerjaan`). Fungsi murni; dipakai form (klien) dan server action dengan aturan yang sama.
//
// Aturan dari database:
// - rincian bersifat opsional; jika ada, `tiket.estimasi_biaya` = jumlah baris dan diisi database;
// - rincian hanya bisa diubah selama keputusan pelanggan masih "menunggu" dan tiket belum final;
// - catatan pengerjaan hanya bisa ditambah (tidak diubah atau dihapus) dan tidak dikirim ke pelanggan.
import { z } from "zod";

export const JENIS_RINCIAN = ["jasa", "komponen"] as const;
export type JenisRincian = (typeof JENIS_RINCIAN)[number];

export const LABEL_JENIS_RINCIAN: Record<JenisRincian, string> = { jasa: "Jasa", komponen: "Komponen" };

export const MAKS_BIAYA = 1_000_000_000;

export const skemaRincian = z.object({
  jenis: z.enum(JENIS_RINCIAN, { error: "Pilih jenis rincian." }),
  uraian: z.string().trim().min(1, "Uraian wajib diisi.").max(120, "Uraian maksimal 120 karakter."),
  biaya: z
    .number({ error: "Isi biaya." })
    .refine((n) => !Number.isNaN(n), "Isi biaya.")
    .pipe(z.number().int("Gunakan rupiah tanpa sen.").min(0, "Biaya tidak boleh negatif.").max(MAKS_BIAYA, "Nominal terlalu besar.")),
});

export type IsianRincian = z.input<typeof skemaRincian>;

/** Total estimasi dari baris rincian; null jika belum ada rincian (total diisi langsung). */
export function totalRincian(baris: { biaya: number | string }[]): number | null {
  if (baris.length === 0) return null;
  return baris.reduce((jumlah, b) => jumlah + Number(b.biaya), 0);
}

export const skemaCatatan = z.string().trim().min(1, "Tulis isi catatan.").max(1000, "Catatan maksimal 1000 karakter.");

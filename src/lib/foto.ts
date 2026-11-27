// Foto kondisi perangkat saat penerimaan (Iterasi 2, FR-PNR-12, K9).
// Opsional, maksimal 4 per tiket. Foto diperkecil di browser lalu disimpan di bucket privat
// `foto-perangkat` dengan path `{tiket_id}/{uuid}.jpg`; barisnya dicatat di tabel `foto_perangkat`.
// Foto hanya bisa dilihat pemilik yang login, lewat signed URL yang berlaku sebentar.

export const BUCKET_FOTO = "foto-perangkat";
export const MAKS_FOTO = 4;
/** Sisi terpanjang setelah diperkecil (piksel). */
export const SISI_MAKS = 1600;
/** Batas file asli sebelum diperkecil. Batas bucket sendiri 5 MB untuk hasil akhirnya. */
export const BATAS_ASLI_MB = 25;
/** Masa berlaku signed URL untuk menampilkan foto (detik). */
export const MASA_URL_DETIK = 60 * 60;

const POLA_UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Ukuran hasil perkecil, menjaga perbandingan sisi; foto kecil tidak diperbesar. */
export function ukuranTarget(lebar: number, tinggi: number, maks = SISI_MAKS): { lebar: number; tinggi: number } {
  const skala = Math.min(1, maks / Math.max(lebar, tinggi));
  return { lebar: Math.max(1, Math.round(lebar * skala)), tinggi: Math.max(1, Math.round(tinggi * skala)) };
}

export function pathFoto(tiketId: string, fotoId: string): string {
  return `${tiketId}/${fotoId}.jpg`;
}

/** Path harus milik tiket itu sendiri dan berbentuk `{tiket_id}/{uuid}.jpg`. */
export function pathValid(tiketId: string, path: string): boolean {
  return new RegExp(`^${tiketId}/${POLA_UUID}\\.jpg$`, "i").test(path);
}

/** Kesalahan file sebelum diproses: bukan gambar, terlalu besar, atau melebihi jumlah maksimal. */
export function periksaFile(file: { type: string; size: number }, jumlahSekarang: number): string | null {
  if (jumlahSekarang >= MAKS_FOTO) return `Maksimal ${MAKS_FOTO} foto per tiket.`;
  if (!file.type.startsWith("image/")) return "File harus berupa foto (JPG, PNG, atau WebP).";
  if (file.size > BATAS_ASLI_MB * 1024 * 1024) return `Ukuran foto maksimal ${BATAS_ASLI_MB} MB.`;
  return null;
}

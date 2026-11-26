// Token link status pelanggan (keputusan K2, issue #10).
// Token 16 karakter dan PIN 4 angka dibuat database (trigger tiket_sebelum_insert);
// modul ini hanya memformat, menormalkan, dan memeriksa bentuknya di aplikasi.
// Token adalah kunci akses: jangan ditulis ke log atau dimasukkan ke analitik.

/** Pola yang sama dengan constraint `tiket_tracking_token_check` dan `portal_ambil_tiket`. */
export const POLA_TOKEN = /^[2-9a-hjkmnp-z]{16}$/;

/** Tampilkan per 4 karakter agar mudah dibaca: `k7p2-9xq4-m3nd-8tfa`. */
export function formatToken(token: string): string {
  return (token.match(/.{1,4}/g) ?? []).join("-");
}

/**
 * Terima link lengkap (`https://…/status/k7p2…`) atau token yang diketik/ditempel,
 * lalu buang spasi dan tanda hubung serta ubah ke huruf kecil.
 */
export function normalisasiToken(masukan: string): string {
  let nilai = masukan.trim();
  const iris = nilai.match(/\/status\/([^/?#\s]+)/i);
  if (iris) nilai = iris[1];
  return nilai.replace(/[\s-]/g, "").toLowerCase();
}

export function tokenValid(token: string): boolean {
  return POLA_TOKEN.test(token);
}

/** Path halaman status pelanggan untuk sebuah token. */
export function pathStatus(token: string): string {
  return `/status/${token}`;
}

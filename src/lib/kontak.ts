// Kontak toko untuk halaman pelanggan. Nomor WhatsApp toko diatur lewat NEXT_PUBLIC_WA_TOKO
// (format 62…, contoh 6281234567890). Jika belum diisi, tombol Hubungi tidak ditampilkan.

export const JAM_LAYANAN = "Senin–Sabtu, 09.00–18.00 WIB";

/** Link wa.me ke toko dengan pesan awal; null jika nomor toko belum diatur. */
export function linkWaToko(pesan: string): string | null {
  const nomor = (process.env.NEXT_PUBLIC_WA_TOKO ?? "").replace(/\D/g, "");
  if (!/^62\d{8,13}$/.test(nomor)) return null;
  return `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`;
}

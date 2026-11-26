// Tujuan setelah login (FR-AKS-02): kembali ke halaman yang tadi diminta.
// Hanya path internal aplikasi yang diterima, supaya parameter `next` tidak bisa
// dipakai untuk mengalihkan pengguna ke situs lain (open redirect).

export const TUJUAN_BAWAAN = "/dashboard";

/** Awalan rute yang boleh menjadi tujuan setelah login. */
const RUTE_INTERNAL = ["/dashboard", "/tiket", "/garansi", "/rekap"];

export function tujuanAman(next: string | null | undefined): string {
  if (!next) return TUJUAN_BAWAAN;
  const nilai = next.trim();

  // Harus path relatif satu garis miring: tolak "//situs", "/\situs", "http:", dan karakter kontrol.
  if (!nilai.startsWith("/") || nilai.startsWith("//") || nilai.includes("\\")) return TUJUAN_BAWAAN;
  if (/[\u0000-\u001f\u007f]/.test(nilai)) return TUJUAN_BAWAAN;

  let url: URL;
  try {
    url = new URL(nilai, "http://lokal.invalid");
  } catch {
    return TUJUAN_BAWAAN;
  }
  if (url.origin !== "http://lokal.invalid") return TUJUAN_BAWAAN;

  const cocok = RUTE_INTERNAL.some((r) => url.pathname === r || url.pathname.startsWith(`${r}/`));
  if (!cocok) return TUJUAN_BAWAAN;

  return url.pathname + url.search;
}

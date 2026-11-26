// Format tampilan uang, tanggal, dan nomor WhatsApp (NFR-08, perancangan §6.3).
// Semua tanggal ditampilkan dalam zona waktu Asia/Jakarta.

export const ZONA_WAKTU = "Asia/Jakarta";

const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Nilai `numeric` dari Supabase bisa datang sebagai number atau string. */
type Angka = number | string;

function keAngka(nilai: Angka): number {
  const n = typeof nilai === "string" ? Number(nilai) : nilai;
  if (!Number.isFinite(n)) throw new RangeError(`Bukan angka: ${String(nilai)}`);
  return n;
}

function titikRibuan(n: number): string {
  const bulat = Math.round(Math.abs(n));
  const teks = String(bulat).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 && bulat !== 0 ? "-" : "") + teks;
}

/** `Rp 595.000`. Pecahan dibulatkan ke rupiah terdekat. */
export function formatRupiah(nilai: Angka): string {
  const n = keAngka(nilai);
  return `${n < 0 ? "-" : ""}Rp ${titikRibuan(Math.abs(n))}`;
}

/** Bentuk ringkas untuk grafik: `675 rb`, `2,51 jt`, `950`. */
export function formatRupiahRingkas(nilai: Angka): string {
  const n = keAngka(nilai);
  const abs = Math.abs(n);
  const tanda = n < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    const jt = (Math.round((abs / 1_000_000) * 100) / 100).toString().replace(".", ",");
    return `${tanda}${jt} jt`;
  }
  if (abs >= 1_000) return `${tanda}${Math.round(abs / 1_000)} rb`;
  return `${tanda}${Math.round(abs)}`;
}

type BagianTanggal = { tahun: number; bulan: number; hari: number; jam: number; menit: number; hariKe: number };

/** Ambil komponen tanggal sesuai jam dinding Asia/Jakarta. */
export function bagianJakarta(waktu: Date | string): BagianTanggal {
  const d = typeof waktu === "string" ? new Date(waktu) : waktu;
  if (Number.isNaN(d.getTime())) throw new RangeError(`Tanggal tidak valid: ${String(waktu)}`);
  const bagian = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_WAKTU,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(d);
  const ambil = (t: Intl.DateTimeFormatPartTypes) => bagian.find((p) => p.type === t)?.value ?? "";
  const hariInggris = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    tahun: Number(ambil("year")),
    bulan: Number(ambil("month")),
    hari: Number(ambil("day")),
    jam: Number(ambil("hour")),
    menit: Number(ambil("minute")),
    hariKe: hariInggris.indexOf(ambil("weekday")),
  };
}

const dua = (n: number) => String(n).padStart(2, "0");

/** `21 Okt 2026` */
export function formatTanggal(waktu: Date | string): string {
  const b = bagianJakarta(waktu);
  return `${b.hari} ${BULAN_SINGKAT[b.bulan - 1]} ${b.tahun}`;
}

/** `21 Okt 2026, 09.30` (pemisah jam memakai titik) */
export function formatTanggalWaktu(waktu: Date | string): string {
  const b = bagianJakarta(waktu);
  return `${formatTanggal(waktu)}, ${dua(b.jam)}.${dua(b.menit)}`;
}

/** `Rabu, 21 Oktober 2026` untuk header dan subjudul. */
export function formatTanggalPanjang(waktu: Date | string): string {
  const b = bagianJakarta(waktu);
  return `${HARI[b.hariKe]}, ${b.hari} ${BULAN_PANJANG[b.bulan - 1]} ${b.tahun}`;
}

/** Tanggal kalender Jakarta sebagai `YYYY-MM-DD`, untuk dibandingkan dengan kolom `date`. */
export function tanggalJakarta(waktu: Date | string): string {
  const b = bagianJakarta(waktu);
  return `${b.tahun}-${dua(b.bulan)}-${dua(b.hari)}`;
}

/**
 * `0812-3456-7890`. Menerima format database (`6281234567890`) maupun isian (`0812 3456 7890`).
 * Nomor yang tidak dikenali dikembalikan apa adanya.
 */
export function formatNomorWa(nomor: string): string {
  let digit = nomor.replace(/\D/g, "");
  if (digit.startsWith("62")) digit = `0${digit.slice(2)}`;
  if (!digit.startsWith("0") || digit.length < 10 || digit.length > 13) return nomor;
  return [digit.slice(0, 4), digit.slice(4, 8), digit.slice(8)].join("-");
}

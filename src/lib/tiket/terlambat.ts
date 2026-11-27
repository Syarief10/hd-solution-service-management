// Perhitungan terlambat dan jatuh tempo (perancangan §3.4), dalam tanggal kalender Asia/Jakarta.
import { tanggalJakarta } from "@/lib/format";
import { isAktif } from "./status";

type TiketTenggat = { status: string; estimasi_selesai: string | null };

/** Selisih hari kalender `a - b` untuk tanggal `YYYY-MM-DD`. */
function selisihHari(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

/**
 * Jumlah hari terlambat; 0 jika tidak terlambat.
 * Terlambat = status aktif, belum Siap Diambil, estimasi terisi, dan hari ini lewat dari estimasi.
 */
export function hariTerlambat(t: TiketTenggat, hariIni: Date = new Date()): number {
  if (!isAktif(t.status) || t.status === "siap_diambil" || !t.estimasi_selesai) return 0;
  return Math.max(0, selisihHari(tanggalJakarta(hariIni), t.estimasi_selesai));
}

/** Estimasi selesai jatuh besok (untuk tiket aktif yang belum Siap Diambil). */
export function jatuhTempoBesok(t: TiketTenggat, hariIni: Date = new Date()): boolean {
  if (!isAktif(t.status) || t.status === "siap_diambil" || !t.estimasi_selesai) return false;
  return selisihHari(t.estimasi_selesai, tanggalJakarta(hariIni)) === 1;
}

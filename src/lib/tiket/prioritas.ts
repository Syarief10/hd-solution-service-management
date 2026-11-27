// Urutan prioritas Iterasi 1 dan teks alasan (issue #15, K5, perancangan §9).
// Urutan sederhana sesuai mockup: tiket terlambat dulu (terlama di atas), lalu tiket lain
// berdasarkan tanggal masuk paling awal. Data dari tabel `tiket`, bukan view `v_antrean_prioritas`.
// Skor dan label Tinggi/Sedang/Rendah baru dibuat di Iterasi 3.
import { formatTanggal } from "@/lib/format";
import { isAktif, menungguPersetujuan } from "./status";
import { hariTerlambat, jatuhTempoBesok } from "./terlambat";

export type TiketAntrean = {
  status: string;
  estimasi_selesai: string | null;
  estimasi_biaya: number | null;
  keputusan: string;
  /** Waktu tiket diterima. */
  created_at: string;
  /** Waktu tiket terakhir masuk status Siap Diambil (dari riwayat), jika ada. */
  siap_sejak?: string | null;
};

/** `12 Okt` (tanggal dan bulan singkat, zona Asia/Jakarta). */
function tanggalPendek(waktu: string): string {
  return formatTanggal(waktu).replace(/ \d{4}$/, "");
}

/** Teks alasan: aturan pertama yang cocok (perancangan §9). */
export function alasanPrioritas(t: TiketAntrean, hariIni: Date = new Date()): string {
  const telat = hariTerlambat(t, hariIni);
  if (telat > 0) return `Terlambat ${telat} hari`;
  if (jatuhTempoBesok(t, hariIni)) return "Jatuh tempo besok";
  if (t.status === "siap_diambil") return `Siap sejak ${tanggalPendek(t.siap_sejak ?? t.created_at)} · hubungi pelanggan`;
  if (menungguPersetujuan(t)) return "Estimasi dikirim, menunggu jawaban";
  if (!t.estimasi_selesai) return "Estimasi belum tersedia";
  return `Antre sejak ${tanggalPendek(t.created_at)}`;
}

export type TiketBerprioritas<T> = T & { peringkat: number; hariTerlambat: number; alasan: string };

/**
 * Antrean tiket aktif. Tiket berstatus akhir tidak masuk. Tiket tanpa estimasi tidak dihitung
 * terlambat. Keterlambatan yang sama diurutkan dari yang masuk lebih dulu.
 */
export function urutkanPrioritas<T extends TiketAntrean>(tiket: T[], hariIni: Date = new Date()): TiketBerprioritas<T>[] {
  return tiket
    .filter((t) => isAktif(t.status))
    .map((t) => ({ ...t, hariTerlambat: hariTerlambat(t, hariIni), alasan: alasanPrioritas(t, hariIni) }))
    .sort((a, b) => {
      const telatA = a.hariTerlambat > 0;
      const telatB = b.hariTerlambat > 0;
      if (telatA !== telatB) return telatA ? -1 : 1;
      if (telatA && a.hariTerlambat !== b.hariTerlambat) return b.hariTerlambat - a.hariTerlambat;
      return Date.parse(a.created_at) - Date.parse(b.created_at);
    })
    .map((t, i) => ({ ...t, peringkat: i + 1 }));
}

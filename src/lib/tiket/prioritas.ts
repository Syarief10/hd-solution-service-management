// Prioritas tiket Iterasi 3: model AHP + SAW (laporan Subbab IV.2.5, BoK Data).
// - AHP: bobot lima kriteria dari perbandingan berpasangan pemilik, dihitung di notebook Colab
//   dan disalin ke `bobot-ahp.json` (CR harus < 0,1).
// - SAW: nilai kriteria tiap tiket aktif dinormalisasi (x / maks), dikali bobot, lalu dijumlahkan.
// Teks alasan tetap memakai aturan pertama yang cocok (perancangan §9). Keputusan akhir tetap di pemilik.
import { formatTanggal, tanggalJakarta } from "@/lib/format";
import bobotAhp from "./bobot-ahp.json";
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
  /** Waktu perubahan status terakhir (riwayat terakhir), untuk kriteria status diam. */
  status_sejak?: string | null;
};

// ---------------------------------------------------------------------------
// AHP
// ---------------------------------------------------------------------------

export const KRITERIA = [
  { kode: "C1", nama: "Keterlambatan" },
  { kode: "C2", nama: "Kedekatan tenggat" },
  { kode: "C3", nama: "Status diam" },
  { kode: "C4", nama: "Nilai transaksi" },
  { kode: "C5", nama: "Menunggu diambil" },
] as const;

export type KodeKriteria = (typeof KRITERIA)[number]["kode"];

/**
 * Hasil notebook Colab (bagian 5.1). Untuk mengubah bobot: jalankan ulang notebook,
 * ganti `bobot-ahp.json`, lalu jalankan `npm run test`.
 */
export const BOBOT_NOTEBOOK = bobotAhp;

/** Perbandingan berpasangan (atas diagonal, skala Saaty 1–9). */
export const PERBANDINGAN: Record<string, number> = bobotAhp.perbandingan;

/** Random index Saaty untuk n = 0..9. */
const RI = [0, 0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45];

export type HasilAhp = { bobot: number[]; lambdaMaks: number; ci: number; cr: number; konsisten: boolean };

/** Matriks penuh n×n dari perbandingan atas diagonal (diagonal 1, bawah = kebalikan). */
export function matriksAhp(perbandingan: Record<string, number>, kode: readonly string[] = KRITERIA.map((k) => k.kode)): number[][] {
  return kode.map((a, i) =>
    kode.map((b, j) => {
      if (i === j) return 1;
      const atas = perbandingan[`${a}-${b}`];
      if (atas !== undefined) return atas;
      const bawah = perbandingan[`${b}-${a}`];
      if (bawah === undefined) throw new Error(`Perbandingan ${a}-${b} belum diisi.`);
      return 1 / bawah;
    }),
  );
}

/** Bobot dengan rata-rata geometrik baris (pendekatan vektor eigen), CI = (λ − n)/(n − 1), CR = CI/RI. */
export function hitungAhp(matriks: number[][]): HasilAhp {
  const n = matriks.length;
  const gm = matriks.map((baris) => Math.pow(baris.reduce((p, x) => p * x, 1), 1 / n));
  const total = gm.reduce((s, x) => s + x, 0);
  const bobot = gm.map((g) => g / total);
  const aw = matriks.map((baris) => baris.reduce((s, x, j) => s + x * bobot[j], 0));
  const lambdaMaks = aw.reduce((s, x, i) => s + x / bobot[i], 0) / n;
  const ci = n > 1 ? (lambdaMaks - n) / (n - 1) : 0;
  const cr = RI[n] ? ci / RI[n] : 0;
  return { bobot, lambdaMaks, ci, cr, konsisten: cr < 0.1 };
}

/** Pemeriksaan ulang di aplikasi dari matriks yang sama. */
export const AHP = hitungAhp(matriksAhp(PERBANDINGAN));

/** Bobot yang dipakai SAW (vektor eigen dari notebook), urut C1–C5. */
export const BOBOT: number[] = KRITERIA.map(({ kode }) => bobotAhp.bobot[kode]);

function selisihHari(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

/** Nilai C1–C5 satu tiket pada `hariIni` (kalender Asia/Jakarta). */
export function nilaiKriteria(t: TiketAntrean, hariIni: Date = new Date()): Record<KodeKriteria, number> {
  const hari = tanggalJakarta(hariIni);
  const siap = t.status === "siap_diambil";
  const sejak = siap ? (t.siap_sejak ?? t.status_sejak ?? t.created_at) : (t.status_sejak ?? t.created_at);
  const diam = Math.max(0, selisihHari(hari, tanggalJakarta(sejak)));
  const telat = hariTerlambat(t, hariIni);
  const sisa = t.estimasi_selesai ? selisihHari(t.estimasi_selesai, hari) : null;
  return {
    C1: telat,
    C2: isAktif(t.status) && !siap && telat === 0 && sisa !== null ? 1 / (1 + Math.max(0, sisa)) : 0,
    C3: diam,
    C4: t.estimasi_biaya ?? 0,
    C5: siap ? diam : 0,
  };
}

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

export type TiketBerprioritas<T> = T & {
  peringkat: number;
  hariTerlambat: number;
  alasan: string;
  /** Skor SAW 0–1. */
  skor: number;
  nilai: Record<KodeKriteria, number>;
};

/**
 * Antrean tiket aktif diurutkan dengan skor SAW (bobot AHP). Tiket berstatus akhir tidak masuk.
 * Semua kriteria bertipe benefit, dinormalisasi x / maks pada kumpulan tiket yang diurutkan.
 * Skor seri diurutkan dari yang masuk lebih dulu.
 */
export function urutkanPrioritas<T extends TiketAntrean>(tiket: T[], hariIni: Date = new Date(), bobot: number[] = BOBOT): TiketBerprioritas<T>[] {
  const aktif = tiket.filter((t) => isAktif(t.status)).map((t) => ({ t, nilai: nilaiKriteria(t, hariIni) }));
  const maks = KRITERIA.map(({ kode }) => Math.max(0, ...aktif.map((a) => a.nilai[kode])));
  return aktif
    .map(({ t, nilai }) => {
      const skor = KRITERIA.reduce((s, { kode }, j) => s + (maks[j] > 0 ? nilai[kode] / maks[j] : 0) * bobot[j], 0);
      return { ...t, nilai, skor: Math.round(skor * 10_000) / 10_000, hariTerlambat: nilai.C1, alasan: alasanPrioritas(t, hariIni) };
    })
    .sort((a, b) => b.skor - a.skor || Date.parse(a.created_at) - Date.parse(b.created_at))
    .map((t, i) => ({ ...t, peringkat: i + 1 }));
}

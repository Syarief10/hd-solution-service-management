// Aturan Daftar Tiket (issue #14, layar 02/02m): filter dari query string, pencarian,
// ringkasan, keterangan tiket tertutup, dan paginasi. Fungsi murni; pengambilan data ada di halaman.
import { formatTanggal, tanggalJakarta } from "@/lib/format";
import { alasanPrioritas, urutkanPrioritas, type TiketAntrean } from "./prioritas";
import { adalahStatus, isAktif } from "./status";
import { hariTerlambat } from "./terlambat";

export const PER_HALAMAN = 10;

export type Segmen = "prioritas" | "semua";
export type FilterTanggal = "" | "hari-ini" | "7-hari" | "rentang";
export type FilterTelat = "" | "terlambat" | "belum";

export type FilterDaftar = {
  segmen: Segmen;
  q: string;
  status: string;
  tanggal: FilterTanggal;
  dari: string;
  sampai: string;
  telat: FilterTelat;
  hal: number;
  /** Jumlah kartu yang ditampilkan di mobile (kelipatan PER_HALAMAN). */
  tampil: number;
};

type Param = Record<string, string | string[] | undefined>;
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function bilangan(v: string, bawaan: number): number {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? n : bawaan;
}

/** Baca filter dari query string. Nilai yang tidak dikenal diabaikan. */
export function bacaFilter(param: Param): FilterDaftar {
  const status = satu(param.status);
  const tanggal = satu(param.tanggal);
  const telat = satu(param.telat);
  const dari = satu(param.dari);
  const sampai = satu(param.sampai);
  return {
    segmen: satu(param.segmen) === "semua" ? "semua" : "prioritas",
    q: satu(param.q).trim().slice(0, 100),
    status: adalahStatus(status) ? status : "",
    tanggal: tanggal === "hari-ini" || tanggal === "7-hari" || tanggal === "rentang" ? tanggal : "",
    dari: POLA_TANGGAL.test(dari) ? dari : "",
    sampai: POLA_TANGGAL.test(sampai) ? sampai : "",
    telat: telat === "terlambat" || telat === "belum" ? telat : "",
    hal: bilangan(satu(param.hal), 1),
    tampil: Math.min(bilangan(satu(param.tampil), PER_HALAMAN), 1000),
  };
}

/** Query string untuk filter (nilai bawaan tidak ditulis). `ubah` menimpa sebagian nilai. */
export function queryFilter(f: FilterDaftar, ubah: Partial<FilterDaftar> = {}): string {
  const g = { ...f, ...ubah };
  const q = new URLSearchParams();
  if (g.segmen === "semua") q.set("segmen", "semua");
  if (g.q) q.set("q", g.q);
  if (g.status) q.set("status", g.status);
  if (g.tanggal) q.set("tanggal", g.tanggal);
  if (g.tanggal === "rentang" && g.dari) q.set("dari", g.dari);
  if (g.tanggal === "rentang" && g.sampai) q.set("sampai", g.sampai);
  if (g.telat) q.set("telat", g.telat);
  if (g.hal > 1) q.set("hal", String(g.hal));
  if (g.tampil > PER_HALAMAN) q.set("tampil", String(g.tampil));
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Ada filter atau pencarian yang aktif (selain segmen dan halaman). */
export function adaFilter(f: FilterDaftar): boolean {
  return Boolean(f.q || f.status || f.tanggal || f.telat);
}

// ---------------------------------------------------------------------------

export type TiketDaftar = TiketAntrean & {
  tiket_id: string;
  nomor_tiket: string;
  closed_at: string | null;
  /** Waktu perubahan status terakhir (untuk tiket dikembalikan/dibatalkan). */
  status_sejak: string;
  nama_pelanggan: string;
  no_whatsapp: string;
  kategori: string;
  merk_tipe: string;
  serial_number: string | null;
};

function normal(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Cocok dengan nomor tiket, nama pelanggan, atau nomor seri (tanpa peduli huruf besar dan tanda baca). */
export function cocokPencarian(t: Pick<TiketDaftar, "nomor_tiket" | "nama_pelanggan" | "serial_number">, q: string): boolean {
  const kunci = normal(q);
  if (!kunci) return true;
  return [t.nomor_tiket, t.nama_pelanggan, t.serial_number ?? ""].some((v) => normal(v).includes(kunci));
}

function dalamTanggal(t: TiketDaftar, f: FilterDaftar, hariIni: Date): boolean {
  if (!f.tanggal) return true;
  const masuk = tanggalJakarta(t.created_at);
  const hari = tanggalJakarta(hariIni);
  if (f.tanggal === "hari-ini") return masuk === hari;
  if (f.tanggal === "7-hari") {
    const batas = tanggalJakarta(new Date(Date.parse(`${hari}T00:00:00+07:00`) - 6 * 86_400_000));
    return masuk >= batas && masuk <= hari;
  }
  const [a, b] = f.dari && f.sampai && f.dari > f.sampai ? [f.sampai, f.dari] : [f.dari, f.sampai];
  return (!a || masuk >= a) && (!b || masuk <= b);
}

/** Terapkan pencarian dan filter (tanpa segmen). */
export function saringTiket<T extends TiketDaftar>(tiket: T[], f: FilterDaftar, hariIni: Date = new Date()): T[] {
  return tiket.filter((t) => {
    if (!cocokPencarian(t, f.q)) return false;
    if (f.status && t.status !== f.status) return false;
    if (!dalamTanggal(t, f, hariIni)) return false;
    const telat = hariTerlambat(t, hariIni) > 0;
    if (f.telat === "terlambat" && !telat) return false;
    if (f.telat === "belum" && telat) return false;
    return true;
  });
}

/** Keterangan di segmen Semua Tiket: alasan untuk tiket aktif, riwayat penutupan untuk tiket tertutup. */
export function keteranganTiket(t: TiketDaftar, hariIni: Date = new Date()): string {
  if (isAktif(t.status)) return alasanPrioritas(t, hariIni);
  const tgl = (w: string) => formatTanggal(w).replace(/ \d{4}$/, "");
  if (t.status === "selesai") return `Selesai · diambil ${tgl(t.closed_at ?? t.status_sejak)}`;
  if (t.status === "dikembalikan") return `Estimasi ditolak · ditutup ${tgl(t.status_sejak)}`;
  return `Dibatalkan · ${tgl(t.status_sejak)}`;
}

/** Ringkasan subjudul: tiket aktif, terlambat, dan tanpa estimasi. */
export function ringkasanDaftar(tiket: TiketDaftar[], hariIni: Date = new Date()) {
  const aktif = tiket.filter((t) => isAktif(t.status));
  return {
    aktif: aktif.length,
    terlambat: aktif.filter((t) => hariTerlambat(t, hariIni) > 0).length,
    tanpaEstimasi: aktif.filter((t) => !t.estimasi_selesai).length,
  };
}

export type BarisDaftar<T> = T & { nomor: number; hariTerlambat: number; keterangan: string };

/**
 * Susun baris untuk satu segmen. Prioritas: tiket aktif sesuai #15, tanpa paginasi.
 * Semua Tiket: terbaru di atas, dipotong per halaman (desktop) atau sampai `tampil` (mobile).
 */
export function susunDaftar<T extends TiketDaftar>(tiket: T[], f: FilterDaftar, hariIni: Date = new Date()) {
  const tersaring = saringTiket(tiket, f, hariIni);

  if (f.segmen === "prioritas") {
    const baris = urutkanPrioritas(tersaring, hariIni).map((t) => ({ ...t, nomor: t.peringkat, keterangan: t.alasan }));
    return { baris, total: baris.length, halaman: 1, jumlahHalaman: 1, mulai: baris.length ? 1 : 0, akhir: baris.length };
  }

  const urut = [...tersaring]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((t, i) => ({ ...t, nomor: i + 1, hariTerlambat: hariTerlambat(t, hariIni), keterangan: keteranganTiket(t, hariIni) }));
  const jumlahHalaman = Math.max(1, Math.ceil(urut.length / PER_HALAMAN));
  const halaman = Math.min(f.hal, jumlahHalaman);
  const mulai = (halaman - 1) * PER_HALAMAN;
  const baris = urut.slice(mulai, mulai + PER_HALAMAN);
  return { baris, semua: urut, total: urut.length, halaman, jumlahHalaman, mulai: baris.length ? mulai + 1 : 0, akhir: mulai + baris.length };
}

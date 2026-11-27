// Rekap pendapatan (layar 06, KF-16). Fungsi murni: periode, ringkasan, seri harian, dan CSV.
// Pendapatan = pembayaran yang tercatat di tabel transaksi (aturan bisnis 10), bukan laba.
// Hari tanpa transaksi yang sudah lewat ditampilkan Rp 0; hari yang belum terjadi tidak punya data.
import { formatTanggal, tanggalJakarta } from "@/lib/format";

export const JENIS_PERIODE = ["harian", "mingguan", "bulanan", "rentang"] as const;
export type JenisPeriode = (typeof JENIS_PERIODE)[number];

export type Periode = { jenis: JenisPeriode; dari: string; sampai: string; label: string };

/** Batas rentang tanggal supaya kueri tetap ringan. */
export const MAKS_HARI_RENTANG = 366;

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const POLA_BULAN = /^\d{4}-\d{2}$/;

function keUtc(t: string): number {
  return Date.parse(`${t}T00:00:00Z`);
}

function dariUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function tambahHari(t: string, n: number): string {
  return dariUtc(keUtc(t) + n * 86_400_000);
}

export function selisihHari(a: string, b: string): number {
  return Math.round((keUtc(a) - keUtc(b)) / 86_400_000);
}

function tanggalValid(t: string | undefined): t is string {
  return !!t && POLA_TANGGAL.test(t) && dariUtc(keUtc(t)) === t;
}

/** Senin pada minggu yang memuat tanggal `t`. */
export function awalMinggu(t: string): string {
  const hari = new Date(keUtc(t)).getUTCDay(); // 0 = Minggu
  return tambahHari(t, hari === 0 ? -6 : 1 - hari);
}

function akhirBulan(tahun: number, bulan: number): string {
  return dariUtc(Date.UTC(tahun, bulan, 0));
}

type Param = Record<string, string | string[] | undefined>;
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Baca periode dari query URL. Nilai yang tidak valid jatuh ke bawaan (bulan berjalan),
 * sehingga tautan yang rusak tetap menampilkan rekap alih-alih galat.
 */
export function bacaPeriode(param: Param, hariIni: Date = new Date()): Periode {
  const hari = tanggalJakarta(hariIni);
  const jenis = (JENIS_PERIODE as readonly string[]).includes(satu(param.periode) ?? "") ? (satu(param.periode) as JenisPeriode) : "bulanan";

  if (jenis === "harian") {
    const t = tanggalValid(satu(param.tanggal)) ? satu(param.tanggal)! : hari;
    return { jenis, dari: t, sampai: t, label: formatTanggal(`${t}T12:00:00+07:00`) };
  }

  if (jenis === "mingguan") {
    const awal = awalMinggu(tanggalValid(satu(param.tanggal)) ? satu(param.tanggal)! : hari);
    const akhir = tambahHari(awal, 6);
    return { jenis, dari: awal, sampai: akhir, label: `${formatTanggal(`${awal}T12:00:00+07:00`)} – ${formatTanggal(`${akhir}T12:00:00+07:00`)}` };
  }

  if (jenis === "rentang") {
    let dari = satu(param.dari);
    let sampai = satu(param.sampai);
    if (!tanggalValid(dari)) dari = tambahHari(hari, -29);
    if (!tanggalValid(sampai)) sampai = hari;
    if (dari > sampai) [dari, sampai] = [sampai, dari];
    if (selisihHari(sampai, dari) >= MAKS_HARI_RENTANG) dari = tambahHari(sampai, -(MAKS_HARI_RENTANG - 1));
    return { jenis, dari, sampai, label: `${formatTanggal(`${dari}T12:00:00+07:00`)} – ${formatTanggal(`${sampai}T12:00:00+07:00`)}` };
  }

  const b = satu(param.bulan);
  const [tahun, bulan] = b && POLA_BULAN.test(b) && Number(b.slice(5)) >= 1 && Number(b.slice(5)) <= 12
    ? [Number(b.slice(0, 4)), Number(b.slice(5))]
    : [Number(hari.slice(0, 4)), Number(hari.slice(5, 7))];
  const dari = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  return { jenis: "bulanan", dari, sampai: akhirBulan(tahun, bulan), label: `${BULAN[bulan - 1]} ${tahun}` };
}

/** Query URL untuk periode (dipakai tautan Unduh CSV dan pemilih periode). */
export function queryPeriode(p: Periode): string {
  const q = new URLSearchParams({ periode: p.jenis });
  if (p.jenis === "harian" || p.jenis === "mingguan") q.set("tanggal", p.dari);
  if (p.jenis === "bulanan") q.set("bulan", p.dari.slice(0, 7));
  if (p.jenis === "rentang") {
    q.set("dari", p.dari);
    q.set("sampai", p.sampai);
  }
  return q.toString();
}

// ---------------------------------------------------------------------------
// Ringkasan dan seri harian
// ---------------------------------------------------------------------------

export type BarisTransaksi = {
  transaksi_id: string;
  tanggal: string;
  created_at: string;
  nominal: number | string;
  jenis: string;
  metode: string | null;
  keterangan: string | null;
  nomor_tiket: string | null;
  tiket_id: string | null;
  nama_pelanggan: string | null;
};

export type Ringkasan = { total: number; jumlah: number; rataRata: number | null };

export function ringkas(transaksi: Pick<BarisTransaksi, "nominal">[]): Ringkasan {
  const total = transaksi.reduce((s, t) => s + Number(t.nominal), 0);
  const jumlah = transaksi.length;
  return { total, jumlah, rataRata: jumlah ? Math.round(total / jumlah) : null };
}

export type TitikHarian = {
  tanggal: string;
  total: number;
  jumlah: number;
  /** `ada`: ada pembayaran. `nol`: hari sudah lewat tanpa pembayaran (Rp 0). `belum`: belum terjadi. */
  keadaan: "ada" | "nol" | "belum";
};

/** Satu titik per hari dalam periode, termasuk hari tanpa transaksi. */
export function seriHarian(transaksi: Pick<BarisTransaksi, "tanggal" | "nominal">[], dari: string, sampai: string, hariIni: Date = new Date()): TitikHarian[] {
  const hari = tanggalJakarta(hariIni);
  const per = new Map<string, { total: number; jumlah: number }>();
  for (const t of transaksi) {
    const x = per.get(t.tanggal) ?? { total: 0, jumlah: 0 };
    x.total += Number(t.nominal);
    x.jumlah += 1;
    per.set(t.tanggal, x);
  }
  const hasil: TitikHarian[] = [];
  for (let t = dari; t <= sampai; t = tambahHari(t, 1)) {
    const x = per.get(t);
    hasil.push({
      tanggal: t,
      total: x?.total ?? 0,
      jumlah: x?.jumlah ?? 0,
      keadaan: x && x.jumlah > 0 ? "ada" : t > hari ? "belum" : "nol",
    });
  }
  return hasil;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

const LABEL_METODE: Record<string, string> = { tunai: "Tunai", transfer: "Transfer bank", qris: "QRIS" };

export function labelMetode(metode: string | null): string {
  return metode ? (LABEL_METODE[metode] ?? metode) : "Tidak tercatat";
}

function selCsv(nilai: string | number): string {
  const s = String(nilai);
  // Cegah formula injection di Excel dan kutip sel yang memuat pemisah, kutip, atau baris baru.
  const aman = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(aman) ? `"${aman.replace(/"/g, '""')}"` : aman;
}

/**
 * CSV dengan pemisah titik koma (sesuai Excel berbahasa Indonesia) dan BOM UTF-8.
 * Nominal ditulis sebagai angka bulat tanpa pemisah ribuan agar bisa dijumlahkan di Excel.
 */
export function keCsv(transaksi: BarisTransaksi[]): string {
  const kepala = ["Tanggal", "No. Tiket", "Pelanggan", "Jenis", "Metode", "Keterangan", "Nominal"];
  const baris = [...transaksi]
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.created_at.localeCompare(b.created_at))
    .map((t) =>
      [
        t.tanggal,
        t.nomor_tiket ?? "",
        t.nama_pelanggan ?? "",
        t.jenis === "penjualan" ? "Penjualan" : "Servis",
        labelMetode(t.metode),
        t.keterangan ?? "",
        Math.round(Number(t.nominal)),
      ].map(selCsv).join(";"),
    );
  const { total } = ringkas(transaksi);
  return `﻿${[kepala.join(";"), ...baris, ["Total", "", "", "", "", "", Math.round(total)].join(";")].join("\r\n")}\r\n`;
}

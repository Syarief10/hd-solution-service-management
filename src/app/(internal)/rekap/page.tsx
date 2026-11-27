// 06 Rekap Pendapatan (Iterasi 3, KF-16): harian, mingguan, bulanan, rentang tanggal, dan unduh CSV.
// Pendapatan = pembayaran yang tercatat saat pengambilan unit, bukan laba.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { GrafikPendapatan } from "@/components/dashboard/GrafikPendapatan";
import { Card, CardHeader, cx, EmptyState, kelasTombol, SkeletonTable } from "@/components/ui";
import { ambilTransaksi } from "@/lib/transaksi";
import { formatRupiah, formatTanggal, formatTanggalWaktu, tanggalJakarta } from "@/lib/format";
import { bacaPeriode, JENIS_PERIODE, labelMetode, queryPeriode, ringkas, seriHarian, type JenisPeriode, type Periode } from "@/lib/rekap";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rekap Pendapatan | HD Solution Computer" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const LABEL_JENIS: Record<JenisPeriode, string> = { harian: "Harian", mingguan: "Mingguan", bulanan: "Bulanan", rentang: "Rentang tanggal" };
const KELAS_INPUT = "h-10 rounded-[10px] border border-border bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-2 focus:outline-primary/30";

function PemilihPeriode({ p }: { p: Periode }) {
  return (
    <Card className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:p-5">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink">Periode</span>
        <nav aria-label="Jenis periode" className="flex flex-wrap gap-1 rounded-[10px] bg-slate-100 p-1">
          {JENIS_PERIODE.map((j) => (
            <Link
              key={j}
              href={`/rekap?periode=${j}`}
              aria-current={p.jenis === j ? "page" : undefined}
              className={cx("rounded-lg px-3 py-1.5 text-[13px] font-semibold", p.jenis === j ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-ink")}
            >
              {LABEL_JENIS[j]}
            </Link>
          ))}
        </nav>
      </div>
      <form action="/rekap" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="periode" value={p.jenis} />
        {p.jenis === "bulanan" && (
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
            Bulan
            <input type="month" name="bulan" defaultValue={p.dari.slice(0, 7)} className={KELAS_INPUT} required />
          </label>
        )}
        {(p.jenis === "harian" || p.jenis === "mingguan") && (
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
            {p.jenis === "harian" ? "Tanggal" : "Tanggal dalam minggu"}
            <input type="date" name="tanggal" defaultValue={p.dari} className={KELAS_INPUT} required />
          </label>
        )}
        {p.jenis === "rentang" && (
          <>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
              Dari
              <input type="date" name="dari" defaultValue={p.dari} className={KELAS_INPUT} required />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
              Sampai
              <input type="date" name="sampai" defaultValue={p.sampai} className={KELAS_INPUT} required />
            </label>
          </>
        )}
        <button type="submit" className={kelasTombol({ varian: "sekunder" })}>
          Tampilkan
        </button>
      </form>
    </Card>
  );
}

async function IsiRekap({ searchParams }: Props) {
  await connection();
  const sekarang = new Date();
  const p = bacaPeriode(await searchParams, sekarang);
  const db = await createClient();
  const transaksi = await ambilTransaksi(db, p.dari, p.sampai);
  const r = ringkas(transaksi);
  const seri = seriHarian(transaksi, p.dari, p.sampai, sekarang);
  const hariIni = tanggalJakarta(sekarang);
  const belumSelesai = p.sampai > hariIni && p.dari <= hariIni;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink md:text-[26px]">Rekap Pendapatan</h1>
          <p className="text-[13px] text-muted">Pendapatan = pembayaran servis yang tercatat saat pengambilan unit. Bukan laba.</p>
        </div>
        <a href={`/rekap/unduh?${queryPeriode(p)}`} className={kelasTombol({ varian: "sekunder" })} download>
          Unduh CSV
        </a>
      </div>

      <PemilihPeriode p={p} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="flex flex-col gap-1.5 p-5">
          <h2 className="text-[13px] font-semibold text-ink">Total pendapatan tercatat</h2>
          <p className="text-[28px] leading-tight font-bold tabular-nums">{formatRupiah(r.total)}</p>
          <p className="text-[13px] text-muted">
            {p.label}
            {belumSelesai && ` (s.d. ${formatTanggal(sekarang)})`}
          </p>
        </Card>
        <Card className="flex flex-col gap-1.5 p-5">
          <h2 className="text-[13px] font-semibold text-ink">Jumlah transaksi</h2>
          <p className="text-[28px] leading-tight font-bold tabular-nums">{r.jumlah}</p>
          <p className="text-[13px] text-muted">Pembayaran tercatat</p>
        </Card>
        <Card className="flex flex-col gap-1.5 p-5">
          <h2 className="text-[13px] font-semibold text-ink">Rata-rata per transaksi</h2>
          <p className="text-[28px] leading-tight font-bold tabular-nums">{r.rataRata === null ? "Tidak tersedia" : formatRupiah(r.rataRata)}</p>
          <p className="text-[13px] text-muted">Total ÷ jumlah transaksi</p>
        </Card>
      </div>

      {p.jenis !== "harian" && (
        <Card>
          <CardHeader judul="Grafik Pendapatan" keterangan={`Per hari · ${p.label}`} />
          <div className="px-5 pb-5">
            <GrafikPendapatan seri={seri} hariIni={hariIni} ringkas={seri.length > 14} />
          </div>
        </Card>
      )}

      <Card>
        <CardHeader judul="Daftar Transaksi" aksi={<span className="text-[13px] text-muted">{r.jumlah} transaksi</span>} />
        {transaksi.length === 0 ? (
          <EmptyState varian="tanpa-hasil" ikon="cash" judul="Belum ada transaksi pada periode ini" keterangan="Pendapatan tercatat saat tiket ditutup lewat Terima Pembayaran & Tutup Tiket." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <caption className="sr-only">Daftar transaksi {p.label}</caption>
              <thead className="border-y border-border bg-slate-50 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Tanggal transaksi</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">No. Tiket</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Pelanggan</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Keterangan</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {transaksi.map((t) => (
                  <tr key={t.transaksi_id} className="border-b border-border">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatTanggalWaktu(t.created_at)}</td>
                    <td className="px-3 py-3">
                      {t.tiket_id ? (
                        <Link href={`/tiket/${t.tiket_id}`} className="font-semibold whitespace-nowrap text-primary tabular-nums hover:underline">
                          {t.nomor_tiket}
                        </Link>
                      ) : (
                        <span className="text-muted">Penjualan</span>
                      )}
                    </td>
                    <td className="px-3 py-3">{t.nama_pelanggan ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className="block">{t.keterangan ?? "—"}</span>
                      <span className="block text-xs text-muted">{labelMetode(t.metode)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">{formatRupiah(t.nominal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={4} className="px-4 py-3 text-left font-bold">
                    Total
                  </th>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap tabular-nums">{formatRupiah(r.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

export default function Page(props: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-5 md:gap-5 md:px-8 md:py-7">
      <Suspense fallback={<SkeletonTable baris={6} label="Memuat rekap…" />}>
        <IsiRekap {...props} />
      </Suspense>
    </div>
  );
}

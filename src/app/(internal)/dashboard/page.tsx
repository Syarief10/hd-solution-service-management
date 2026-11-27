// 01 / 01m Dasbor Iterasi 1 (issue #22): kartu ringkasan, Prioritas Pengerjaan (6 teratas, #15),
// Tiket per Status, Aktivitas Terbaru, serta kartu dan grafik pendapatan 7 hari (Iterasi 3). Garansi menyusul di Iterasi 2.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { Badge, ButtonLink, Card, CardHeader, cx, EmptyState, Ikon, SkeletonTable, StatusBadge, type NamaIkon } from "@/components/ui";
import { GrafikPendapatan } from "@/components/dashboard/GrafikPendapatan";
import { PemberitahuanGagal } from "@/components/dashboard/PemberitahuanGagal";
import { kartuDasbor, labelWaktu, MAKS_AKTIVITAS, susunAktivitas, tiketPerStatus, type Aktivitas } from "@/lib/dasbor";
import { bagianJakarta, formatRupiah, formatTanggal, formatTanggalPanjang, tanggalJakarta } from "@/lib/format";
import { ringkas, seriHarian, tambahHari } from "@/lib/rekap";
import { createClient } from "@/lib/supabase/server";
import { ambilTiketDaftar } from "@/lib/tiket/ambil-daftar";
import { urutkanPrioritas } from "@/lib/tiket/prioritas";
import { STATUS, STATUS_AKHIR, tampilanStatus } from "@/lib/tiket/status";
import { ambilTransaksi } from "@/lib/transaksi";

export const metadata: Metadata = { title: "Dasbor | HD Solution Computer" };

const BARIS_PRIORITAS = 6;
const tgl = (w: string) => formatTanggal(w.length === 10 ? `${w}T12:00:00+07:00` : w);
const tglPendek = (w: string) => tgl(w).replace(/ \d{4}$/, "");

function Kartu({ judul, nilai, keterangan, ikon, bahaya = false, className }: { judul: string; nilai: ReactNode; keterangan: ReactNode; ikon: NamaIkon; bahaya?: boolean; className?: string }) {
  return (
    <Card className={cx("flex flex-col gap-1.5 p-4 md:p-5", bahaya && "border-red-300", className)}>
      <div className="flex items-start justify-between gap-2">
        <h2 className={cx("inline-flex items-center gap-1.5 text-[13px] font-semibold", bahaya ? "text-red-800" : "text-ink")}>
          {bahaya && <Ikon nama="alert" className="md:hidden" />}
          {judul}
        </h2>
        <span aria-hidden="true" className={cx("hidden size-8 items-center justify-center rounded-lg md:flex", bahaya ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary")}>
          <Ikon nama={ikon} />
        </span>
      </div>
      <p className={cx("text-[28px] leading-tight font-bold tabular-nums", bahaya ? "text-red-700" : "text-ink")}>{nilai}</p>
      <p className="text-[13px] text-muted">{keterangan}</p>
    </Card>
  );
}

const IKON_AKTIVITAS: Record<Aktivitas["jenis"], NamaIkon> = { "tiket-baru": "inbox", status: "pulse", pembayaran: "cash" };

async function ambilAktivitas() {
  const db = await createClient();
  const [riwayat, transaksi] = await Promise.all([
    db
      .from("riwayat_status")
      .select("status, created_at, tiket_id, tiket ( nomor_tiket, perangkat ( merk_tipe, pelanggan ( nama ) ) )")
      .order("created_at", { ascending: false })
      .limit(MAKS_AKTIVITAS),
    db.from("transaksi").select("nominal, created_at, tiket_id, tiket ( nomor_tiket )").order("created_at", { ascending: false }).limit(MAKS_AKTIVITAS),
  ]);
  if (riwayat.error) throw new Error(riwayat.error.message);
  if (transaksi.error) throw new Error(transaksi.error.message);
  return susunAktivitas(
    (riwayat.data ?? []).map((r) => ({
      status: r.status,
      created_at: r.created_at,
      tiket_id: r.tiket_id,
      nomor_tiket: r.tiket?.nomor_tiket ?? "",
      nama_pelanggan: r.tiket?.perangkat?.pelanggan?.nama ?? null,
      perangkat: r.tiket?.perangkat?.merk_tipe ?? null,
    })),
    (transaksi.data ?? []).map((t) => ({ nominal: t.nominal, created_at: t.created_at, tiket_id: t.tiket_id, nomor_tiket: t.tiket?.nomor_tiket ?? null })),
  );
}

async function AktivitasTerbaru() {
  await connection();
  const sekarang = new Date();
  const aktivitas = await ambilAktivitas();
  if (aktivitas.length === 0) return <p className="px-5 pb-5 text-[13px] text-muted">Belum ada aktivitas.</p>;
  return (
    <ol className="flex flex-col px-5 pb-3">
      {aktivitas.map((a, i) => (
        <li key={i} className="flex gap-3 border-b border-border py-3 last:border-b-0">
          <span aria-hidden="true" className={cx("flex size-8 shrink-0 items-center justify-center rounded-full", a.jenis === "pembayaran" ? "bg-teal-50 text-teal" : "bg-slate-100 text-muted")}>
            <Ikon nama={a.status ? STATUS[a.status as keyof typeof STATUS]?.ikon ?? IKON_AKTIVITAS[a.jenis] : IKON_AKTIVITAS[a.jenis]} />
          </span>
          <div className="min-w-0 text-[13px]">
            <p className="text-ink">
              {a.tiket_id && a.nomor_tiket ? (
                <Link href={`/tiket/${a.tiket_id}`} className="font-semibold text-primary tabular-nums hover:underline">
                  {a.nomor_tiket}
                </Link>
              ) : (
                <strong>Penjualan</strong>
              )}{" "}
              {a.teks}
            </p>
            <p className="text-xs text-muted">{labelWaktu(a.waktu, sekarang)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

async function IsiDasbor() {
  await connection();
  const sekarang = new Date();
  const db = await createClient();
  const hari = tanggalJakarta(sekarang);
  const dari7 = tambahHari(hari, -6);
  const [tiket, transaksi7] = await Promise.all([ambilTiketDaftar(db, { hanyaAktif: true, statusAkhir: STATUS_AKHIR }), ambilTransaksi(db, dari7, hari)]);
  const pendapatanHariIni = ringkas(transaksi7.filter((t) => t.tanggal === hari));
  const seri7 = seriHarian(transaksi7, dari7, hari, sekarang);
  const k = kartuDasbor(tiket, sekarang);
  const antrean = urutkanPrioritas(tiket, sekarang).slice(0, BARIS_PRIORITAS);
  const perStatus = tiketPerStatus(tiket);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kartu judul="Tiket Aktif" ikon="ticket" nilai={k.aktif} keterangan={`${k.masukHariIni} tiket masuk hari ini`} />
        <Kartu
          judul="Tiket Terlambat"
          ikon="alert"
          bahaya
          nilai={k.terlambat}
          keterangan={
            <>
              Melewati estimasi selesai ·{" "}
              <Link href="/tiket?telat=terlambat" className="font-semibold text-primary hover:underline">
                Lihat antrean
              </Link>
            </>
          }
        />
        <Kartu judul="Siap Diambil" ikon="box" nilai={k.siapDiambil} keterangan="Pelanggan perlu dihubungi" />
        <Kartu
          judul="Pendapatan Hari Ini"
          ikon="cash"
          nilai={formatRupiah(pendapatanHariIni.total)}
          keterangan={
            <>
              {pendapatanHariIni.jumlah} transaksi ·{" "}
              <Link href="/rekap" className="font-semibold text-primary hover:underline">
                Lihat rekap
              </Link>
            </>
          }
        />
      </div>

      <Card>
        <CardHeader
          judul="Pendapatan 7 Hari Terakhir"
          keterangan={`Total ${formatRupiah(ringkas(transaksi7).total)}`}
          aksi={
            <Link href="/rekap?periode=mingguan" className="text-[13px] font-semibold text-primary hover:underline">
              Rekap lengkap
            </Link>
          }
        />
        <div className="px-5 pb-5">
          <GrafikPendapatan seri={seri7} hariIni={hari} />
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <CardHeader
            judul="Prioritas Pengerjaan"
            keterangan="Diurutkan dengan skor AHP-SAW: tenggat, keterlambatan, status diam, nilai servis, dan lama menunggu diambil"
            aksi={
              <Link href="/tiket" className="text-[13px] font-semibold text-primary hover:underline">
                Lihat semua antrean
              </Link>
            }
          />
          {antrean.length === 0 ? (
            <EmptyState
              varian="belum-ada-data"
              judul="Tidak ada tiket aktif"
              keterangan="Tiket baru akan muncul di antrean setelah dicatat."
              aksi={
                <ButtonLink href="/tiket/baru" ikon="plus">
                  Tiket Baru
                </ButtonLink>
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <caption className="sr-only">Enam tiket teratas di antrean prioritas</caption>
                  <thead className="border-y border-border bg-slate-50 text-xs text-muted">
                    <tr>
                      <th scope="col" className="pl-4 pr-2 py-2.5 font-semibold">No. Tiket</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Pelanggan</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Perangkat</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Masuk</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Estimasi</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {antrean.map((t) => (
                      <tr key={t.tiket_id} className={cx("border-b border-border last:border-b-0", t.hariTerlambat > 0 && "bg-red-50/60")}>
                        <td className="px-4 py-3">
                          <Link href={`/tiket/${t.tiket_id}`} className="font-semibold whitespace-nowrap text-primary tabular-nums hover:underline">
                            {t.nomor_tiket}
                          </Link>
                        </td>
                        <td className="px-3 py-3">{t.nama_pelanggan}</td>
                        <td className="px-3 py-3">{t.merk_tipe}</td>
                        <td className="px-3 py-3">
                          <StatusBadge tampilan={tampilanStatus(t.status)} />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap tabular-nums">{tglPendek(t.created_at)}</td>
                        <td className="px-3 py-3 whitespace-nowrap tabular-nums">{t.estimasi_selesai ? tglPendek(t.estimasi_selesai) : "—"}</td>
                        <td className="px-4 py-3">
                          {t.hariTerlambat > 0 ? (
                            <Badge nada="bahaya" ikon="alert">
                              {t.alasan}
                            </Badge>
                          ) : (
                            t.alasan
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ol className="flex flex-col gap-2.5 px-3 pb-3 md:hidden">
                {antrean.map((t) => (
                  <li key={t.tiket_id}>
                    <Link href={`/tiket/${t.tiket_id}`} className={cx("flex flex-col gap-1.5 rounded-card border p-3.5", t.hariTerlambat > 0 ? "border-red-300" : "border-border")}>
                      <span className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-bold whitespace-nowrap text-primary tabular-nums">{t.nomor_tiket}</span>
                        <Badge nada={t.hariTerlambat > 0 ? "bahaya" : "info"} ikon={t.hariTerlambat > 0 ? "alert" : "clock"} className="whitespace-normal">
                          {t.alasan}
                        </Badge>
                      </span>
                      <span className="text-[13px]">
                        <strong className="text-ink">{t.nama_pelanggan}</strong> · {t.merk_tipe}
                      </span>
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <StatusBadge tampilan={tampilanStatus(t.status)} />
                        <span className="text-xs text-muted tabular-nums">
                          Masuk {tglPendek(t.created_at)} · Est. {t.estimasi_selesai ? tglPendek(t.estimasi_selesai) : "—"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader judul="Tiket per Status" keterangan={`${k.aktif} tiket aktif`} />
            <ul className="hidden flex-col gap-3 px-5 pb-5 md:flex">
              {perStatus.map(({ status, jumlah, persen }) => (
                <li key={status} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: STATUS[status].teks }}>
                      <Ikon nama={STATUS[status].ikon} /> {STATUS[status].label}
                    </span>
                    <span className="font-semibold tabular-nums">{jumlah}</span>
                  </div>
                  <span aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full" style={{ width: `${persen}%`, background: STATUS[status].teks }} />
                  </span>
                </li>
              ))}
            </ul>
            <ul className="flex flex-wrap gap-2 px-4 pb-4 md:hidden">
              {perStatus.map(({ status, jumlah }) => (
                <li key={status} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: STATUS[status].latar, color: STATUS[status].teks }}>
                  <Ikon nama={STATUS[status].ikon} /> {STATUS[status].label} <span className="tabular-nums">{jumlah}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader judul="Aktivitas Terbaru" />
            <Suspense fallback={null}>
              <PemberitahuanGagal />
            </Suspense>
            <Suspense fallback={<SkeletonTable baris={4} kolom={2} label="Memuat aktivitas…" />}>
              <AktivitasTerbaru />
            </Suspense>
          </Card>
        </div>
      </div>
    </>
  );
}

async function Subjudul() {
  await connection();
  const sekarang = new Date();
  const b = bagianJakarta(sekarang);
  return (
    <>
      Ringkasan operasional servis per {formatTanggalPanjang(sekarang)} pukul {String(b.jam).padStart(2, "0")}.{String(b.menit).padStart(2, "0")} WIB
    </>
  );
}

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-5 md:gap-5 md:px-8 md:py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink md:text-[26px]">Dasbor</h1>
          <p className="text-[13px] text-muted">
            <Suspense fallback="Ringkasan operasional servis">
              <Subjudul />
            </Suspense>
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/tiket" varian="sekunder">
            Lihat Semua Tiket
          </ButtonLink>
          <span className="hidden md:inline-flex">
            <ButtonLink href="/tiket/baru" ikon="plus">
              Tiket Baru
            </ButtonLink>
          </span>
        </div>
      </div>
      <Suspense fallback={<SkeletonTable baris={6} label="Memuat dasbor…" />}>
        <IsiDasbor />
      </Suspense>
    </div>
  );
}

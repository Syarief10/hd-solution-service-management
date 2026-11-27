// 02 / 02m Daftar Tiket Servis (issue #14): segmen Prioritas Pengerjaan (#15) dan Semua Tiket,
// pencarian, filter di query string, paginasi, dan versi mobile berupa kartu bernomor.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { FilterTiket } from "./filter-tiket";
import { Badge, ButtonLink, Card, cx, EmptyState, Ikon, kelasTombol, SkeletonTable, StatusBadge } from "@/components/ui";
import { formatNomorWa, formatTanggal } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ambilTiketDaftar } from "@/lib/tiket/ambil-daftar";
import { bacaFilter, PER_HALAMAN, queryFilter, ringkasanDaftar, susunDaftar, type FilterDaftar, type TiketDaftar } from "@/lib/tiket/daftar";
import { menungguPersetujuan, STATUS_AKHIR, tampilanStatus } from "@/lib/tiket/status";

export const metadata: Metadata = { title: "Tiket Servis | HD Solution Computer" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Baris = TiketDaftar & { nomor: number; hariTerlambat: number; keterangan: string };

const tgl = (w: string) => formatTanggal(w.length === 10 ? `${w}T12:00:00+07:00` : w);
const tglPendek = (w: string) => tgl(w).replace(/ \d{4}$/, "");

function Keterangan({ t }: { t: Baris }) {
  if (t.hariTerlambat > 0) {
    return (
      <Badge nada="bahaya" ikon="alert">
        {t.keterangan}
      </Badge>
    );
  }
  if (t.keterangan === "Estimasi belum tersedia") {
    return (
      <Badge nada="netral" ikon="clock">
        {t.keterangan}
      </Badge>
    );
  }
  return <span className="text-[13px] text-ink">{t.keterangan}</span>;
}

function Perangkat({ t }: { t: TiketDaftar }) {
  return (
    <>
      <span className="block">{t.merk_tipe || "—"}</span>
      <span className="block text-xs text-muted">
        {[t.kategori, t.serial_number ? `SN ${t.serial_number}` : null].filter(Boolean).join(" · ")}
      </span>
    </>
  );
}

function TabelDesktop({ baris, segmen }: { baris: Baris[]; segmen: FilterDaftar["segmen"] }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[960px] text-left text-[13px]">
        <caption className="sr-only">{segmen === "prioritas" ? "Antrean prioritas pengerjaan" : "Semua tiket servis"}</caption>
        <thead className="border-b border-border bg-slate-50 text-xs text-muted">
          <tr>
            <th scope="col" className="w-10 px-4 py-2.5 font-semibold">#</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">No. Tiket</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Pelanggan</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Perangkat</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Masuk</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Estimasi Selesai</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">{segmen === "prioritas" ? "Alasan prioritas" : "Keterangan"}</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {baris.map((t) => (
            <tr key={t.tiket_id} className={cx("border-b border-border last:border-b-0", t.hariTerlambat > 0 && "bg-red-50/60")}>
              <td className="px-4 py-3 font-semibold text-muted tabular-nums">{t.nomor}</td>
              <td className="px-3 py-3 font-semibold whitespace-nowrap tabular-nums">{t.nomor_tiket}</td>
              <td className="px-3 py-3">
                <span className="block font-medium">{t.nama_pelanggan}</span>
                {t.no_whatsapp && <span className="block text-xs whitespace-nowrap text-muted tabular-nums">{formatNomorWa(t.no_whatsapp)}</span>}
              </td>
              <td className="px-3 py-3">
                <Perangkat t={t} />
              </td>
              <td className="px-3 py-3 whitespace-nowrap tabular-nums">{tgl(t.created_at)}</td>
              <td className="px-3 py-3 whitespace-nowrap tabular-nums">{t.estimasi_selesai ? tgl(t.estimasi_selesai) : "—"}</td>
              <td className="px-3 py-3">
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge tampilan={tampilanStatus(t.status)} />
                  {menungguPersetujuan(t) && <Badge nada="peringatan">Menunggu persetujuan</Badge>}
                </div>
              </td>
              <td className="px-3 py-3">
                <Keterangan t={t} />
              </td>
              <td className="px-4 py-3">
                <ButtonLink href={`/tiket/${t.tiket_id}`} varian="sekunder" ukuran="kecil" aria-label={`Lihat detail ${t.nomor_tiket}`}>
                  Lihat Detail
                </ButtonLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KartuMobile({ baris }: { baris: Baris[] }) {
  return (
    <ol className="flex flex-col gap-3 p-3 md:hidden">
      {baris.map((t) => (
        <li key={t.tiket_id}>
          <Link
            href={`/tiket/${t.tiket_id}`}
            className={cx("flex flex-col gap-1.5 rounded-card border bg-surface p-4", t.hariTerlambat > 0 ? "border-red-300" : "border-border")}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-[15px] font-bold text-primary tabular-nums">
                <span className="mr-1.5 text-muted">#{t.nomor}</span>
                {t.nomor_tiket}
              </span>
              <StatusBadge tampilan={tampilanStatus(t.status)} />
            </span>
            <span className="font-semibold text-ink">{t.nama_pelanggan}</span>
            <span className="text-[13px] text-muted">{t.merk_tipe}</span>
            <span className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted">
              <span className="tabular-nums">
                Masuk {tglPendek(t.created_at)} · Est. {t.estimasi_selesai ? tglPendek(t.estimasi_selesai) : "—"}
              </span>
              {t.hariTerlambat > 0 || t.keterangan === "Estimasi belum tersedia" ? (
                <Keterangan t={t} />
              ) : (
                <span className="inline-flex items-center gap-0.5 font-semibold text-ink">
                  Lihat Detail <Ikon nama="chevronRight" />
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

async function IsiDaftar({ f }: { f: FilterDaftar }) {
  await connection();
  const sekarang = new Date();
  const db = await createClient();
  const semua = await ambilTiketDaftar(db);
  const d = susunDaftar(semua, f, sekarang);
  const tampilMobile = Math.max(f.tampil, PER_HALAMAN);
  const sumberMobile = (f.segmen === "prioritas" ? d.baris : (d.semua ?? d.baris)) as Baris[];
  const mobile = sumberMobile.slice(0, tampilMobile);
  const sisa = sumberMobile.length - mobile.length;

  if (semua.length === 0) {
    return (
      <Card>
        <EmptyState
          varian="belum-ada-data"
          judul="Belum ada tiket servis"
          keterangan="Catat unit pertama yang masuk agar antrean dan riwayat servis mulai terbentuk."
          aksi={
            <ButtonLink href="/tiket/baru" ikon="plus">
              Catat Unit Pertama
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  if (d.total === 0) {
    return (
      <Card>
        <EmptyState
          varian="tanpa-hasil"
          judul="Tidak ada tiket yang cocok"
          keterangan={f.q ? `Tidak ada tiket untuk “${f.q}”. Periksa ejaan atau hapus filter yang aktif.` : "Periksa ejaan atau hapus filter yang aktif."}
          aksi={
            <ButtonLink href={`/tiket${queryFilter(bacaFilter({}), { segmen: f.segmen })}`} varian="sekunder" ikon="retry">
              Atur Ulang Filter
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <TabelDesktop baris={d.baris as Baris[]} segmen={f.segmen} />
      <KartuMobile baris={mobile} />

      {sisa > 0 && (
        <div className="p-3 pt-0 md:hidden">
          <Link href={`/tiket${queryFilter(f, { tampil: tampilMobile + PER_HALAMAN })}`} scroll={false} className={kelasTombol({ varian: "sekunder", className: "w-full" })}>
            {f.segmen === "prioritas" ? `Tampilkan ${Math.min(sisa, PER_HALAMAN)} tiket lagi` : "Muat tiket lebih lama"}
          </Link>
        </div>
      )}

      <div className="hidden flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] text-muted md:flex">
        <span>
          {f.segmen === "prioritas" ? `Menampilkan ${d.total} dari ${d.total} tiket terbuka` : `Menampilkan ${d.mulai}–${d.akhir} dari ${d.total} tiket`}
        </span>
        {f.segmen === "semua" && d.jumlahHalaman > 1 && (
          <nav aria-label="Halaman" className="flex gap-2">
            {d.halaman > 1 ? (
              <Link href={`/tiket${queryFilter(f, { hal: d.halaman - 1 })}`} className={kelasTombol({ varian: "sekunder" })}>
                Sebelumnya
              </Link>
            ) : (
              <span aria-disabled="true" className={kelasTombol({ varian: "sekunder", className: "pointer-events-none opacity-50" })}>
                Sebelumnya
              </span>
            )}
            {d.halaman < d.jumlahHalaman ? (
              <Link href={`/tiket${queryFilter(f, { hal: d.halaman + 1 })}`} className={kelasTombol({ varian: "sekunder" })}>
                Berikutnya
              </Link>
            ) : (
              <span aria-disabled="true" className={kelasTombol({ varian: "sekunder", className: "pointer-events-none opacity-50" })}>
                Berikutnya
              </span>
            )}
          </nav>
        )}
      </div>
    </Card>
  );
}

async function Ringkasan() {
  await connection();
  const db = await createClient();
  const r = ringkasanDaftar(await ambilTiketDaftar(db, { hanyaAktif: true, statusAkhir: STATUS_AKHIR }), new Date());
  return (
    <>
      {r.aktif} tiket aktif · {r.terlambat} terlambat · {r.tanpaEstimasi} tanpa estimasi
    </>
  );
}

async function Isi({ searchParams }: Props) {
  const f = bacaFilter(await searchParams);
  const kunci = queryFilter(f, { hal: 1, tampil: 0 });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink md:text-[26px]">Tiket Servis</h1>
          <p className="text-[13px] text-muted">
            <Suspense fallback="Menghitung tiket…">
              <Ringkasan />
            </Suspense>
          </p>
        </div>
        <div className="hidden md:block">
          <ButtonLink href="/tiket/baru" ikon="plus">
            Tiket Baru
          </ButtonLink>
        </div>
      </div>

      <Card className="flex flex-col gap-4 p-4 md:p-5">
        <FilterTiket key={kunci} awal={f} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <nav aria-label="Segmen daftar tiket" className="flex gap-1 rounded-[10px] bg-slate-100 p-1">
            {(["prioritas", "semua"] as const).map((s) => (
              <Link
                key={s}
                href={`/tiket${queryFilter(f, { segmen: s, hal: 1, tampil: 0, status: s === "prioritas" && f.status && ["selesai", "dikembalikan", "dibatalkan"].includes(f.status) ? "" : f.status })}`}
                aria-current={f.segmen === s ? "page" : undefined}
                className={cx("rounded-lg px-3 py-1.5 text-[13px] font-semibold", f.segmen === s ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-ink")}
              >
                {s === "prioritas" ? "Prioritas Pengerjaan" : "Semua Tiket"}
              </Link>
            ))}
          </nav>
          <span className="text-[13px] text-muted">{f.segmen === "prioritas" ? "Tiket terbuka, diurutkan otomatis" : "Semua tiket, terbaru di atas"}</span>
        </div>
      </Card>

      {f.segmen === "prioritas" && (
        <div role="note" className="flex gap-2.5 rounded-card border border-blue-200 bg-primary-soft p-4 text-[13px] leading-relaxed text-blue-900">
          <Ikon nama="info" className="mt-0.5 shrink-0" />
          <p>
            Urutan ini adalah <strong>saran</strong> untuk membantu Anda menentukan tindakan. Tiket terbuka diurutkan dengan skor AHP-SAW
            dari lima hal: kedekatan tenggat, keterlambatan, lama status tidak berubah, nilai servis, dan lama menunggu diambil. Bobotnya
            berasal dari penilaian pemilik. Tiket tanpa estimasi tidak dihitung sebagai terlambat.
          </p>
        </div>
      )}

      <Suspense key={queryFilter(f)} fallback={<Card><SkeletonTable baris={6} kolom={6} label="Memuat tiket…" /></Card>}>
        <IsiDaftar f={f} />
      </Suspense>
    </>
  );
}

export default function Page(props: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-5 md:gap-5 md:px-8 md:py-7">
      <Suspense fallback={<SkeletonTable baris={6} label="Memuat tiket…" />}>
        <Isi {...props} />
      </Suspense>
    </div>
  );
}

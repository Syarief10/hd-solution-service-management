// 05 Garansi Komponen (Iterasi 2, FR-GAR-02/03): filter Semua/Aktif/Akan Berakhir/Berakhir dengan
// jumlahnya, pencarian, dan tabel (kartu di mobile). Filter dan kata kunci disimpan di query string.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Badge, ButtonLink, Card, cx, EmptyState, Ikon, SkeletonTable, type NadaLencana } from "@/components/ui";
import { formatTanggal } from "@/lib/format";
import { bacaFilter, cocokCari, FILTER_GARANSI, jumlahPerFilter, labelLama, saringGaransi, sisaMasa, type BarisGaransi, type FilterGaransi } from "@/lib/garansi";
import { createClient } from "@/lib/supabase/server";
import type { NamaIkon } from "@/components/ui";

export const metadata: Metadata = { title: "Garansi Komponen | HD Solution Computer" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const KOLOM = "sparepart_id, tiket_id, nomor_tiket, nama_pelanggan, merk_tipe, nama_komponen, tanggal_pasang, lama_garansi_hari, garansi_mulai, garansi_berakhir, sisa_hari, status_garansi";

const tgl = (d: string) => formatTanggal(`${d}T12:00:00+07:00`);

const TAMPILAN_STATUS: Record<string, { label: string; nada: NadaLencana; ikon: NamaIkon; warnaSisa: string; warnaBilah: string }> = {
  aktif: { label: "Aktif", nada: "sukses", ikon: "checkCircle", warnaSisa: "text-teal", warnaBilah: "bg-teal" },
  akan_berakhir: { label: "Akan Berakhir", nada: "peringatan", ikon: "clock", warnaSisa: "text-orange-800", warnaBilah: "bg-orange-700" },
  berakhir: { label: "Berakhir", nada: "bahaya", ikon: "alert", warnaSisa: "text-red-700", warnaBilah: "bg-red-600" },
  belum_dimulai: { label: "Belum dimulai", nada: "netral", ikon: "clock", warnaSisa: "text-slate-600", warnaBilah: "bg-slate-300" },
};

function tampilan(status: string) {
  return TAMPILAN_STATUS[status] ?? TAMPILAN_STATUS.belum_dimulai;
}

function Sisa({ b }: { b: BarisGaransi }) {
  const s = sisaMasa(b);
  const t = tampilan(b.status_garansi);
  return (
    <span className="flex min-w-[110px] flex-col gap-1">
      <span className={cx("font-semibold", t.warnaSisa)}>{s.teks}</span>
      <span aria-hidden="true" className="block h-1.5 w-full rounded-full bg-slate-100">
        <span className={cx("block h-full rounded-full", t.warnaBilah)} style={{ width: `${s.persen}%` }} />
      </span>
    </span>
  );
}

function LencanaStatus({ status }: { status: string }) {
  const t = tampilan(status);
  return (
    <Badge nada={t.nada} ikon={t.ikon}>
      {t.label}
    </Badge>
  );
}

function hrefFilter(filter: FilterGaransi, q: string) {
  const p = new URLSearchParams();
  if (filter !== "semua") p.set("status", filter);
  if (q.trim()) p.set("q", q.trim());
  const s = p.toString();
  return s ? `/garansi?${s}` : "/garansi";
}

async function IsiGaransi({ searchParams }: Props) {
  await connection();
  const sp = await searchParams;
  const filter = bacaFilter(sp.status);
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";

  const db = await createClient();
  const { data, error } = await db.from("v_garansi").select(KOLOM);
  if (error) throw new Error(error.message);
  const semua = (data ?? []) as BarisGaransi[];
  const hasilCari = semua.filter((b) => cocokCari(b, q));
  const jumlah = jumlahPerFilter(hasilCari);
  const baris = saringGaransi(semua, filter, q);

  return (
    <>
      <Card className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between md:p-4">
        <nav aria-label="Filter status garansi" className="-mx-1 flex gap-1 overflow-x-auto px-1">
          <div className="inline-flex shrink-0 rounded-lg bg-slate-100 p-1">
            {FILTER_GARANSI.map((f) => {
              const aktif = f.kode === filter;
              return (
                <Link
                  key={f.kode}
                  href={hrefFilter(f.kode, q)}
                  aria-current={aktif ? "page" : undefined}
                  className={cx(
                    "flex min-h-11 items-center rounded-md px-3 text-[13px] font-semibold whitespace-nowrap md:min-h-9",
                    aktif ? "bg-surface text-primary shadow-sm" : "text-slate-600 hover:text-ink",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  )}
                >
                  {f.label} <span className="ml-1 tabular-nums">({jumlah[f.kode]})</span>
                </Link>
              );
            })}
          </div>
        </nav>
        <form action="/garansi" method="get" role="search" className="relative w-full md:max-w-[380px]">
          {filter !== "semua" && <input type="hidden" name="status" value={filter} />}
          <label htmlFor="cari-garansi" className="sr-only">
            Cari garansi
          </label>
          <Ikon nama="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            id="cari-garansi"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Cari komponen, pelanggan, atau no. tiket"
            className="block min-h-11 w-full rounded-lg border border-slate-300 bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none md:min-h-[42px]"
          />
        </form>
      </Card>

      {semua.length === 0 ? (
        <Card>
          <EmptyState
            varian="belum-ada-data"
            ikon="shield"
            judul="Belum ada garansi komponen"
            keterangan="Garansi muncul di sini setelah komponen bergaransi dicatat di tab Komponen pada Detail Tiket."
          />
        </Card>
      ) : baris.length === 0 ? (
        <Card>
          <EmptyState
            varian="tanpa-hasil"
            ikon="search"
            judul="Tidak ada garansi yang cocok"
            keterangan={q ? `Tidak ada hasil untuk “${q}” pada filter ini.` : "Tidak ada garansi dengan status ini."}
            aksi={
              <ButtonLink href="/garansi" varian="sekunder">
                Tampilkan semua
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop: tabel (mockup 05). */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left text-[13px]">
              <caption className="sr-only">Daftar garansi komponen</caption>
              <thead className="border-b border-border bg-slate-50 text-xs text-muted">
                <tr>
                  {["Komponen", "Pelanggan & perangkat", "Tiket", "Dipasang", "Mulai garansi", "Akhir garansi", "Sisa masa", "Status"].map((k) => (
                    <th key={k} scope="col" className="px-4 py-2.5 font-semibold">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {baris.map((b) => (
                  <tr key={b.sparepart_id} className="align-middle">
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-ink">{b.nama_komponen}</span>
                      <span className="block text-xs text-muted">{labelLama(b.lama_garansi_hari)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-ink">{b.nama_pelanggan}</span>
                      <span className="block text-xs text-muted">{b.merk_tipe ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/tiket/${b.tiket_id}?tab=komponen`} className="font-semibold whitespace-nowrap text-primary tabular-nums hover:underline">
                        {b.nomor_tiket}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{b.tanggal_pasang ? tgl(b.tanggal_pasang) : "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{b.garansi_mulai ? tgl(b.garansi_mulai) : "Saat unit diserahkan"}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{b.garansi_berakhir ? tgl(b.garansi_berakhir) : "—"}</td>
                    <td className="px-4 py-3">
                      <Sisa b={b} />
                    </td>
                    <td className="px-4 py-3">
                      <LencanaStatus status={b.status_garansi} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: kartu. */}
          <ul className="flex flex-col divide-y divide-border md:hidden">
            {baris.map((b) => (
              <li key={b.sparepart_id} className="flex flex-col gap-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold break-words text-ink">{b.nama_komponen}</p>
                    <p className="text-xs text-muted">{labelLama(b.lama_garansi_hari)}</p>
                  </div>
                  <LencanaStatus status={b.status_garansi} />
                </div>
                <p className="text-[13px] text-slate-700">
                  {b.nama_pelanggan} · {b.merk_tipe ?? "—"} ·{" "}
                  <Link href={`/tiket/${b.tiket_id}?tab=komponen`} className="inline-flex min-h-11 items-center font-semibold text-primary tabular-nums hover:underline">
                    {b.nomor_tiket}
                  </Link>
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                  <dt className="text-muted">Mulai</dt>
                  <dd className="tabular-nums">{b.garansi_mulai ? tgl(b.garansi_mulai) : "Saat unit diserahkan"}</dd>
                  <dt className="text-muted">Berakhir</dt>
                  <dd className="tabular-nums">{b.garansi_berakhir ? tgl(b.garansi_berakhir) : "—"}</dd>
                </dl>
                <Sisa b={b} />
              </li>
            ))}
          </ul>

          <p className="border-t border-border px-4 py-3 text-xs text-muted">
            Garansi dimulai saat unit diserahkan ke pelanggan. Komponen pada tiket yang belum ditutup berstatus “Belum dimulai”.
          </p>
        </Card>
      )}
    </>
  );
}

export default function Page(props: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-5 md:gap-5 md:px-8 md:py-7">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink md:text-[26px]">Garansi Komponen</h1>
        <p className="mt-1 text-sm text-muted">Komponen pengganti yang terpasang lewat tiket servis. “Akan berakhir” = sisa 14 hari atau kurang.</p>
      </div>
      <Suspense fallback={<SkeletonTable baris={6} label="Memuat garansi…" />}>
        <IsiGaransi {...props} />
      </Suspense>
    </div>
  );
}

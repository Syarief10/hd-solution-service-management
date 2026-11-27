// 08 Detail Progres Pelanggan (hanya-baca, tanpa login; K2, FR-PLG-01..06).
// Data hanya dari `portal_ambil_tiket(token)`: nama disamarkan, WhatsApp disensor, tanpa PIN dan alamat.
// Token adalah kunci akses: tidak ditulis ke log, dan halaman tidak mengirim Referer ke situs lain.
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { KartuBantuan, KerangkaPelanggan, TombolHubungi } from "../bagian";
import { FormCekStatus } from "../form-cek-status";
import { cx, ErrorBanner, Ikon, SkeletonTable } from "@/components/ui";
import { formatRupiah, formatTanggal, formatTanggalPanjang, formatTanggalWaktu } from "@/lib/format";
import {
  bacaPortal,
  formatWaTersensor,
  labelPelanggan,
  langkahBerikutnya,
  ringkasRincian,
  susunProgres,
  teksGaransi,
  type DataPortal,
} from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { normalisasiToken, tokenValid } from "@/lib/tiket/kode-akses";
import { tampilanStatus } from "@/lib/tiket/status";

export const metadata: Metadata = {
  title: "Status Servis | HD Solution Computer",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const CARA: Record<string, string> = { whatsapp: "via WhatsApp", telepon: "via telepon", datang: "di toko" };

function Kartu({ judul, children, className }: { judul?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("flex flex-col gap-3 rounded-card border border-border bg-surface p-4 md:p-5", className)}>
      {judul && <h2 className="text-base font-bold text-ink">{judul}</h2>}
      {children}
    </section>
  );
}

function TidakBerlaku() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Cek Status Servis</h1>
        <p className="mt-1.5 text-[15px] text-slate-700">Masukkan kode cek status yang tertera di tanda terima.</p>
      </div>
      <FormCekStatus gagalAwal />
      <KartuBantuan />
    </>
  );
}

function DetailProgres({ d }: { d: DataPortal }) {
  const status = tampilanStatus(d.status);
  const terakhir = d.linimasa.at(-1)?.waktu ?? d.created_at;
  const langkah = langkahBerikutnya(d);
  const progres = susunProgres(d);
  const rincian = ringkasRincian(d.rincian_estimasi);

  return (
    <>
      <Kartu>
        <p className="text-[13px] text-muted tabular-nums">Tiket {d.nomor_tiket}</p>
        <h1 className="-mt-2 text-xl font-bold tracking-tight text-ink">{d.merk_tipe ?? "Perangkat Anda"}</h1>
        <p className="-mt-1.5 text-sm text-slate-700">
          {d.kategori ?? "Perangkat"} · atas nama {d.nama_pelanggan ?? "—"} · WA <span className="tabular-nums">{formatWaTersensor(d.no_whatsapp)}</span>
        </p>
        <div className="flex flex-col gap-1.5 rounded-lg border p-3.5" style={{ backgroundColor: status.latar, borderColor: status.latar }}>
          <p className="text-xs font-semibold" style={{ color: status.teks }}>
            Status terkini
          </p>
          <p className="flex items-center gap-2 text-xl font-bold" style={{ color: status.teks }}>
            <Ikon nama={status.ikon} className="size-5" />
            {labelPelanggan(d.status)}
          </p>
          <p className="text-xs" style={{ color: status.teks }}>
            Diperbarui {formatTanggalPanjang(terakhir)} pukul {formatTanggalWaktu(terakhir).split(", ")[1]}
          </p>
        </div>
      </Kartu>

      <section className={cx("flex items-start gap-3 rounded-card border p-4", langkah.perluTindakan ? "border-amber-300 bg-amber-50" : "border-blue-200 bg-primary-soft")}>
        <Ikon nama={langkah.perluTindakan ? "alert" : "info"} className={cx("mt-0.5 size-5", langkah.perluTindakan ? "text-amber-700" : "text-primary")} />
        <div>
          <h2 className="font-bold text-ink">Langkah berikutnya</h2>
          <p className="mt-0.5 text-sm text-slate-700">{langkah.teks}</p>
        </div>
      </section>

      <Kartu judul="Progres Servis">
        <ol className="flex flex-col">
          {progres.map((l, i) => (
            <li key={l.kunci} className="relative flex gap-3 pb-4 last:pb-0">
              {i < progres.length - 1 && (
                <span aria-hidden="true" className={cx("absolute top-6 left-[11px] h-[calc(100%-12px)] w-0.5", l.keadaan === "menunggu" ? "bg-slate-200" : "bg-primary")} />
              )}
              <span
                aria-hidden="true"
                className={cx(
                  "relative flex size-6 shrink-0 items-center justify-center rounded-full",
                  l.keadaan === "selesai" && "bg-primary text-white",
                  l.keadaan === "sekarang" && "border-2 border-cyan-600 bg-cyan-50 text-cyan-700",
                  l.keadaan === "menunggu" && "border border-slate-300 bg-surface text-slate-400",
                )}
              >
                <Ikon nama={l.keadaan === "selesai" ? "check" : l.keadaan === "sekarang" ? "pulse" : "clock"} className="size-3.5" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className={cx("font-semibold", l.keadaan === "menunggu" ? "text-slate-500" : l.keadaan === "sekarang" ? "text-cyan-800" : "text-ink")}>
                  {l.label}
                  {l.keadaan === "sekarang" && <span className="sr-only"> (tahap saat ini)</span>}
                </span>
                <span className="text-xs text-muted tabular-nums">{l.waktu ? formatTanggalWaktu(l.waktu) : "Menunggu"}</span>
                <span className="text-sm text-slate-700">{l.penjelasan}</span>
              </div>
            </li>
          ))}
        </ol>
      </Kartu>

      {(d.estimasi_biaya !== null || d.estimasi_selesai) && (
        <Kartu judul="Estimasi & Persetujuan">
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted">Estimasi biaya</dt>
            <dd className="font-bold tabular-nums">{d.estimasi_biaya === null ? "Belum tersedia" : formatRupiah(d.estimasi_biaya)}</dd>
            {rincian && (
              <>
                <dt className="text-muted">Rincian</dt>
                <dd className="break-words">{rincian}</dd>
              </>
            )}
            <dt className="text-muted">Estimasi selesai</dt>
            <dd className="tabular-nums">{d.estimasi_selesai ? formatTanggal(d.estimasi_selesai) : "Belum tersedia"}</dd>
            <dt className="text-muted">Persetujuan</dt>
            <dd>
              {d.keputusan === "disetujui" ? (
                <span className="text-teal">
                  <strong>✓ Disetujui</strong>
                  {d.keputusan_at && ` ${formatTanggalWaktu(d.keputusan_at)}`} {CARA[d.keputusan_cara ?? ""] ?? ""}
                </span>
              ) : d.keputusan === "ditolak" ? (
                <strong className="text-red-700">Tidak dilanjutkan</strong>
              ) : d.estimasi_biaya !== null ? (
                <strong className="text-amber-800">Menunggu jawaban Anda</strong>
              ) : (
                "—"
              )}
            </dd>
            {Number(d.biaya) > 0 && (
              <>
                <dt className="text-muted">Biaya akhir</dt>
                <dd className="font-bold tabular-nums">{formatRupiah(Number(d.biaya))}</dd>
              </>
            )}
          </dl>
        </Kartu>
      )}

      {d.garansi.length > 0 && (
        <Kartu judul="Garansi Komponen">
          <ul className="flex flex-col gap-2">
            {d.garansi.map((g) => (
              <li key={g.komponen} className="flex items-start gap-2.5 rounded-lg border border-border bg-slate-50 p-3">
                <Ikon nama="shield" className="mt-0.5 text-teal" />
                <div className="text-sm">
                  <p className="font-semibold text-ink">{g.komponen}</p>
                  <p className="text-slate-700">{teksGaransi(g)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Kartu>
      )}

      <TombolHubungi utama pesan={`Halo HD Solution Computer, saya ingin menanyakan servis ${d.nomor_tiket}.`} label="Hubungi HD Solution Computer" />

      <p className="text-center text-xs text-muted">
        Halaman ini hanya menampilkan tiket Anda. Jangan bagikan link ini kepada orang lain.
        {d.token_berakhir && ` Link berlaku sampai ${formatTanggal(d.token_berakhir)}.`}
      </p>
    </>
  );
}

async function IsiStatus({ params }: { params: Promise<{ kode: string }> }) {
  await connection();
  const { kode } = await params;
  const token = normalisasiToken(decodeURIComponent(kode));
  if (!tokenValid(token)) return <TidakBerlaku />;

  const db = await createClient();
  const { data, error } = await db.rpc("portal_ambil_tiket", { p_token: token });
  if (error) {
    // Token tidak ikut dicatat.
    console.error(`[status pelanggan] gagal memuat: ${error.code ?? "-"} ${error.message}`);
    return (
      <ErrorBanner
        judul="Status belum dapat dimuat"
        keterangan="Koneksi ke server terputus. Muat ulang halaman ini beberapa saat lagi."
      />
    );
  }
  const d = bacaPortal(data);
  return d ? <DetailProgres d={d} /> : <TidakBerlaku />;
}

export default function Page({ params }: { params: Promise<{ kode: string }> }) {
  return (
    <KerangkaPelanggan keluar>
      <Suspense fallback={<SkeletonTable baris={6} label="Memuat status servis…" />}>
        <IsiStatus params={params} />
      </Suspense>
    </KerangkaPelanggan>
  );
}

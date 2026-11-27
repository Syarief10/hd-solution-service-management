// Bagian tampilan Detail Tiket (server). Mutasi ada di aksi-klien.tsx.
import type { ReactNode } from "react";

import {
  FormCatatan,
  FormDiagnosis,
  FormEstimasi,
  FormKeputusan,
  FormPengambilan,
  FormRincian,
  FormUbahBiaya,
  TombolBuatUlangAkses,
  TombolBukaUlang,
  TombolHapusRincian,
  TombolSalin,
} from "./aksi-klien";
import { AksiKomponen, PilihanPakaiKomponen, TambahKomponen } from "./komponen-klien";
import { PerbaruiStatus } from "./perbarui-status";
import { Badge, ButtonLink, Card, cx, Ikon, StatusBadge } from "@/components/ui";
import { formatNomorWa, formatRupiah, formatTanggal, formatTanggalWaktu } from "@/lib/format";
import {
  nomorTahap,
  pembaruanTerakhir,
  susunLintasan,
  waktuDiagnosis,
  type DetailTiket,
} from "@/lib/tiket/detail";
import { LABEL_JENIS_RINCIAN, type JenisRincian } from "@/lib/tiket/estimasi";
import { formatToken, pathStatus } from "@/lib/tiket/kode-akses";
import { hitungGaransi, isianDariBaris, labelLamaGaransi, tampilanPengadaan, type Garansi } from "@/lib/tiket/komponen";
import { isAktif, menungguPersetujuan, STATUS, tampilanStatus } from "@/lib/tiket/status";
import { hariTerlambat, jatuhTempoBesok } from "@/lib/tiket/terlambat";

const CARA: Record<string, string> = { whatsapp: "WhatsApp", telepon: "Telepon", datang: "Datang ke toko" };
const METODE: Record<string, string> = { tunai: "Tunai", transfer: "Transfer bank", qris: "QRIS" };

function JudulBagian({ children }: { children: ReactNode }) {
  return <h3 className="text-[15px] font-bold text-ink">{children}</h3>;
}

function Baris({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

const KELAS_DL = "grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px] sm:grid-cols-[140px_minmax(0,1fr)]";

// ---------------------------------------------------------------------------
// Header dan lintasan
// ---------------------------------------------------------------------------

export function HeaderTiket({ t, sekarang }: { t: DetailTiket; sekarang: Date }) {
  const terlambat = hariTerlambat(t, sekarang);
  const besok = jatuhTempoBesok(t, sekarang);
  const tertutup = !isAktif(t.status);
  const p = t.perangkat;

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold tracking-tight text-ink tabular-nums md:text-[26px]">{t.nomor_tiket}</h1>
            <StatusBadge tampilan={tampilanStatus(t.status)} />
            {menungguPersetujuan(t) && (
              <Badge nada="peringatan" ikon="hourglass">
                Menunggu persetujuan
              </Badge>
            )}
            {terlambat > 0 && (
              <Badge nada="bahaya" ikon="alert">
                Terlambat {terlambat} hari
              </Badge>
            )}
            {besok && (
              <Badge nada="info" ikon="clock">
                Jatuh tempo besok
              </Badge>
            )}
            {tertutup && (
              <Badge nada="terkunci" ikon="lock">
                Ditutup
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-700">
            <strong className="text-ink">{p?.merk_tipe ?? "Perangkat"}</strong> · {p?.pelanggan?.nama ?? "—"} · <span className="line-clamp-1 inline">{t.keluhan}</span>
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
            <span>
              Diterima <strong className="text-ink tabular-nums">{formatTanggalWaktu(t.created_at)}</strong>
            </span>
            <span>
              Estimasi selesai <strong className="text-ink tabular-nums">{t.estimasi_selesai ? formatTanggal(t.estimasi_selesai) : "Belum tersedia"}</strong>
            </span>
            <span>
              Pembaruan terakhir <strong className="text-ink tabular-nums">{formatTanggalWaktu(pembaruanTerakhir(t))}</strong>
            </span>
          </div>
        </div>
        {!tertutup && (
          <PerbaruiStatus
            tiketId={t.tiket_id}
            nomorTiket={t.nomor_tiket}
            status={t.status}
            keputusan={t.keputusan}
            biaya={Number(t.biaya)}
            estimasi_biaya={t.estimasi_biaya === null ? null : Number(t.estimasi_biaya)}
          />
        )}
      </div>

      {tertutup && (
        <p className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-[13px] text-slate-700">
          <Ikon nama="lock" className="size-3.5" />
          Tiket ditutup {formatTanggalWaktu(t.closed_at ?? pembaruanTerakhir(t))} · tidak dapat diperbarui.
        </p>
      )}

      <Lintasan t={t} />
    </Card>
  );
}

function Lintasan({ t }: { t: DetailTiket }) {
  const langkah = susunLintasan(t);
  const n = nomorTahap(t.status);
  return (
    <>
      {/* Mobile: bilah ringkas "Tahap n dari 6" (mockup 04m). */}
      <div className="flex flex-col gap-1.5 md:hidden">
        <div className="flex gap-1" aria-hidden="true">
          {langkah.map((l) => (
            <span key={l.tahap} className={cx("h-1.5 flex-1 rounded-full", l.keadaan === "selesai" ? "bg-primary" : l.keadaan === "sekarang" ? "bg-cyan-600" : "bg-slate-200")} />
          ))}
        </div>
        <p className="text-xs text-muted">
          Tahap {n} dari 6 · diperbarui {formatTanggalWaktu(pembaruanTerakhir(t))}
        </p>
      </div>

      {/* Desktop: enam tahap beserta waktunya. */}
      <ol aria-label="Tahapan servis" className="hidden grid-cols-6 gap-2 md:grid">
        {langkah.map((l) => (
          <li key={l.tahap} aria-current={l.keadaan === "sekarang" ? "step" : undefined} className="flex flex-col gap-1.5">
            <span className={cx("h-1.5 rounded-full", l.keadaan === "selesai" ? "bg-primary" : l.keadaan === "sekarang" ? "bg-cyan-600" : "bg-slate-200")} />
            <span className={cx("flex items-center gap-1.5 text-[13px]", l.keadaan === "belum" ? "text-muted" : "font-semibold text-ink")}>
              <Ikon nama={l.keadaan === "selesai" ? "checkCircle" : l.keadaan === "sekarang" ? STATUS[l.tahap].ikon : "clock"} className="size-3.5" />
              {STATUS[l.tahap].label}
            </span>
            <span className="text-xs text-muted tabular-nums">
              {l.catatan && <span className="block">{l.catatan}</span>}
              {l.waktu ? formatTanggalWaktu(l.waktu).replace(/ \d{4},/, ",") : "—"}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab Informasi Unit (#16)
// ---------------------------------------------------------------------------

export function TabInformasi({ t, alamat }: { t: DetailTiket; alamat: string }) {
  const p = t.perangkat;
  const pl = p?.pelanggan;
  const aktif = isAktif(t.status);
  const link = `${alamat}${pathStatus(t.tracking_token)}`;
  const diterima = t.kelengkapan_unit.filter((k) => k.is_checked_in);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-4 md:p-5">
          <JudulBagian>Pelanggan</JudulBagian>
          <dl className={KELAS_DL}>
            <Baris label="Nama">{pl?.nama ?? "—"}</Baris>
            <Baris label="WhatsApp">
              <span className="tabular-nums">{pl ? formatNomorWa(pl.no_whatsapp) : "—"}</span>
            </Baris>
            <Baris label="Link status">
              <span className="flex flex-col gap-1.5">
                <span className="font-mono text-xs break-all">{link}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <TombolSalin teks={link} label="Salin link" />
                  <span className="text-xs text-muted">Kode {formatToken(t.tracking_token)}</span>
                </span>
              </span>
            </Baris>
            <Baris label="PIN pengambilan">
              <span className="font-bold tracking-[0.2em] tabular-nums">{t.pin_pengambilan}</span>
            </Baris>
            {t.token_berakhir && <Baris label="Link berlaku s.d.">{formatTanggal(t.token_berakhir)}</Baris>}
          </dl>
          {aktif && <TombolBuatUlangAkses tiketId={t.tiket_id} />}
        </Card>

        <Card className="flex flex-col gap-3 p-4 md:p-5">
          <JudulBagian>Identitas Perangkat</JudulBagian>
          <dl className={KELAS_DL}>
            <Baris label="Jenis">{p?.kategori ?? "—"}</Baris>
            <Baris label="Merek / model">{p?.merk_tipe ?? "—"}</Baris>
            <Baris label="Nomor seri">
              <span className="tabular-nums">{p?.serial_number || "—"}</span>
            </Baris>
            {p?.warna && <Baris label="Warna">{p.warna}</Baris>}
          </dl>
        </Card>

        <Card className="flex flex-col gap-2 p-4 md:p-5">
          <JudulBagian>Keluhan</JudulBagian>
          <p className="text-[13px] leading-relaxed whitespace-pre-line text-slate-700">{t.keluhan}</p>
        </Card>

        <Card className="flex flex-col gap-2 p-4 md:p-5">
          <JudulBagian>Kondisi Fisik Awal</JudulBagian>
          {t.kondisi_fisik ? (
            <p className="text-[13px] leading-relaxed whitespace-pre-line text-slate-700">{t.kondisi_fisik}</p>
          ) : (
            <p className="text-[13px] text-muted">Tidak tercatat. Tiket ini dibuat sebelum kondisi fisik awal disimpan sistem.</p>
          )}
        </Card>
      </div>

      <Card className="flex flex-col gap-3 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <JudulBagian>Checklist Kelengkapan saat Diterima</JudulBagian>
          <ButtonLink href={`/tiket/${t.tiket_id}/tanda-terima`} varian="sekunder" ukuran="kecil" ikon="ticket" className="min-h-11 md:min-h-9">
            Cetak ulang tanda terima
          </ButtonLink>
        </div>
        {diterima.length === 0 ? (
          <p className="text-[13px] text-muted">Tidak ada kelengkapan yang diserahkan.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {diterima.map((k) => (
              <li key={k.kelengkapan_id} className="flex items-start gap-2.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-[13px]">
                <Ikon nama="check" className="mt-0.5 size-3.5 text-teal" />
                <span className="flex flex-col">
                  <span className="font-semibold text-ink">{k.nama_item}</span>
                  {k.is_checked_out && <span className="text-xs text-muted">Sudah dikembalikan</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Progres & Pemeriksaan (#17)
// ---------------------------------------------------------------------------

export function TabProgres({ t }: { t: DetailTiket }) {
  const aktif = isAktif(t.status);
  const waktu = waktuDiagnosis(t);
  const riwayat = [...t.riwayat_status].reverse();

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3 p-4 md:p-5">
          <div>
            <JudulBagian>Hasil Diagnosis</JudulBagian>
            {waktu && <p className="mt-0.5 text-xs text-muted">Pemeriksaan dimulai {formatTanggalWaktu(waktu)}</p>}
          </div>
          {aktif ? (
            <FormDiagnosis tiketId={t.tiket_id} awal={t.diagnosis ?? ""} />
          ) : (
            <p className="text-[13px] leading-relaxed whitespace-pre-line text-slate-700">{t.diagnosis || "Tidak ada catatan diagnosis."}</p>
          )}
        </Card>
        <Card className="flex flex-col gap-3 p-4 md:p-5">
          <JudulBagian>Catatan Pengerjaan</JudulBagian>
          {t.catatan_pengerjaan.length === 0 ? (
            <p className="text-[13px] text-muted">{aktif ? "Belum ada catatan. Catat langkah kerja tanpa mengubah status." : "Tidak ada catatan pengerjaan."}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-[13px]">
              {t.catatan_pengerjaan.map((c) => (
                <li key={c.catatan_id} className="flex flex-col gap-0.5 border-l-2 border-slate-200 pl-3">
                  <span className="text-xs text-muted tabular-nums">{formatTanggalWaktu(c.created_at)}</span>
                  <span className="break-words whitespace-pre-line text-slate-700">{c.isi}</span>
                </li>
              ))}
            </ul>
          )}
          {aktif && <FormCatatan tiketId={t.tiket_id} />}
        </Card>
      </div>

      <Card className="flex flex-col gap-3 p-4 md:p-5">
        <JudulBagian>Riwayat Status</JudulBagian>
        <ol className="flex flex-col">
          {riwayat.map((r, i) => {
            const s = tampilanStatus(r.status);
            return (
              <li key={r.riwayat_id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < riwayat.length - 1 && <span aria-hidden="true" className="absolute top-3.5 left-[5px] h-full w-px bg-slate-200" />}
                <span aria-hidden="true" className="relative mt-1 size-[11px] shrink-0 rounded-full border-2 border-surface" style={{ backgroundColor: s.teks }} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13px]">
                    <strong style={{ color: s.teks }}>{s.label}</strong> <span className="text-muted tabular-nums">· {formatTanggalWaktu(r.created_at)}</span>
                  </span>
                  {r.catatan_teknis && <span className="text-[13px] break-words text-slate-700">{r.catatan_teknis}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Estimasi & Persetujuan (#19, K4)
// ---------------------------------------------------------------------------

export function TabEstimasi({ t }: { t: DetailTiket }) {
  const aktif = isAktif(t.status);
  const menunggu = t.keputusan === "menunggu";
  const bisaBukaUlang = aktif && !menunggu && ["diterima", "didiagnosis"].includes(t.status);
  const bisaUbah = aktif && menunggu;
  const rincian = t.rincian_estimasi;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card className="flex flex-col gap-3 p-4 md:p-5">
        <JudulBagian>Estimasi Biaya</JudulBagian>

        {rincian.length > 0 && (
          <ul aria-label="Rincian estimasi" className="flex flex-col text-[13px]">
            {rincian.map((r) => (
              <li key={r.rincian_id} className="flex items-center gap-3 border-b border-border py-2.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="break-words text-ink">{r.uraian}</span>
                  <span className="text-xs text-muted">{LABEL_JENIS_RINCIAN[r.jenis as JenisRincian] ?? r.jenis}</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatRupiah(r.biaya)}</span>
                {bisaUbah && <TombolHapusRincian tiketId={t.tiket_id} rincianId={r.rincian_id} uraian={r.uraian} />}
              </li>
            ))}
          </ul>
        )}

        {(rincian.length > 0 || !bisaUbah) && (
          <p className="flex items-baseline justify-between gap-3 text-[13px] font-semibold">
            Total estimasi
            <strong className="text-lg tabular-nums">{t.estimasi_biaya === null ? "Belum diisi" : formatRupiah(t.estimasi_biaya)}</strong>
          </p>
        )}

        {bisaUbah && <FormRincian tiketId={t.tiket_id} />}

        {bisaUbah ? (
          <FormEstimasi tiketId={t.tiket_id} biaya={t.estimasi_biaya} selesai={t.estimasi_selesai} adaRincian={rincian.length > 0} />
        ) : (
          <dl className={KELAS_DL}>
            <Baris label="Perkiraan selesai">{t.estimasi_selesai ? formatTanggal(t.estimasi_selesai) : "Belum diisi"}</Baris>
          </dl>
        )}
      </Card>

      <Card className="flex flex-col gap-3 p-4 md:p-5">
        <JudulBagian>Keputusan Pelanggan</JudulBagian>
        {menunggu ? (
          <>
            <Badge nada="peringatan" ikon="hourglass" className="self-start">
              Menunggu konfirmasi
            </Badge>
            {aktif ? <FormKeputusan tiketId={t.tiket_id} adaEstimasi={t.estimasi_biaya !== null} /> : <p className="text-[13px] text-muted">Tidak ada keputusan tercatat.</p>}
          </>
        ) : (
          <>
            <Badge nada={t.keputusan === "disetujui" ? "sukses" : "bahaya"} ikon={t.keputusan === "disetujui" ? "check" : "x"} className="self-start">
              {t.keputusan === "disetujui" ? "Disetujui" : "Ditolak"}
            </Badge>
            <dl className={KELAS_DL}>
              <Baris label="Waktu konfirmasi">{t.keputusan_at ? formatTanggalWaktu(t.keputusan_at) : "—"}</Baris>
              <Baris label="Cara konfirmasi">{CARA[t.keputusan_cara ?? ""] ?? "—"}</Baris>
              {t.keputusan === "disetujui" && (
                <Baris label="Nominal disetujui">
                  <span className="tabular-nums">{t.estimasi_biaya === null ? "—" : formatRupiah(t.estimasi_biaya)}</span>
                </Baris>
              )}
              {t.keputusan === "ditolak" && <Baris label="Alasan">{t.keputusan_alasan ?? "—"}</Baris>}
            </dl>
            {t.keputusan === "ditolak" && aktif && (
              <p className="rounded-lg bg-red-50 p-3 text-[13px] text-red-800">
                Unit dikembalikan tanpa perbaikan: status berikutnya <strong>Siap Diambil (tanpa perbaikan)</strong>, lalu diakhiri sebagai <strong>Dikembalikan</strong>.
              </p>
            )}
            {bisaBukaUlang && <TombolBukaUlang tiketId={t.tiket_id} />}
          </>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Komponen & Garansi (Iterasi 2)
// ---------------------------------------------------------------------------

const NADA_GARANSI = { aktif: "sukses", akan_berakhir: "peringatan", berakhir: "netral" } as const;

function TeksGaransi({ g, lama }: { g: Garansi; lama: number }) {
  if (g.status === "tanpa_garansi") return <>Tanpa garansi</>;
  if (g.status === "tidak_berlaku") return <>Tidak berlaku (unit tidak diperbaiki)</>;
  if (g.status === "belum_dimulai") return <>{lama} hari setelah penyerahan</>;
  return (
    <span className="flex flex-col items-start gap-1">
      <span className="tabular-nums">{formatTanggal(g.berakhir!)}</span>
      <Badge nada={NADA_GARANSI[g.status]}>
        {g.status === "berakhir" ? `Berakhir ${Math.abs(g.sisaHari!)} hari lalu` : g.status === "akan_berakhir" ? `Akan berakhir · sisa ${g.sisaHari} hari` : `Aktif · sisa ${g.sisaHari} hari`}
      </Badge>
    </span>
  );
}

function keteranganPengadaan(k: DetailTiket["spare_part"][number]): string | null {
  const bagian: string[] = [];
  if (k.tanggal_pesan) bagian.push(`Dipesan ${formatTanggal(k.tanggal_pesan)}`);
  if (k.tanggal_tiba) bagian.push(`tiba ${formatTanggal(k.tanggal_tiba)}`);
  else if (k.estimasi_tiba) bagian.push(`perkiraan tiba ${formatTanggal(k.estimasi_tiba)}`);
  return bagian.length ? bagian.join(" · ") : null;
}

export function TabKomponen({ t, sekarang }: { t: DetailTiket; sekarang: Date }) {
  const aktif = isAktif(t.status);
  const komponen = t.spare_part;
  const tanpa = t.pakai_komponen === false;

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <JudulBagian>Komponen Pengganti</JudulBagian>
        {aktif && <PilihanPakaiKomponen tiketId={t.tiket_id} pakai={t.pakai_komponen} jumlahKomponen={komponen.length} />}
      </div>

      {komponen.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
          <Ikon nama="box" className="size-6 text-slate-500" />
          <p className="text-sm font-semibold text-ink">{tanpa ? "Tidak menggunakan komponen pengganti" : aktif ? "Belum ada komponen tercatat" : "Tidak ada komponen pengganti"}</p>
          <p className="max-w-md text-[13px] text-muted">
            {tanpa
              ? "Servis ini hanya berupa jasa. Tidak ada garansi komponen yang tercatat untuk tiket ini."
              : aktif
                ? "Catat komponen yang diganti beserta lama garansinya, atau pilih Tanpa komponen jika servis hanya berupa jasa."
                : "Tidak ada komponen yang dicatat untuk tiket ini."}
          </p>
          {aktif && !tanpa && <TambahKomponen tiketId={t.tiket_id} />}
        </div>
      ) : (
        <ul aria-label="Daftar komponen" className="flex flex-col gap-3">
          {komponen.map((k) => {
            const g = hitungGaransi(k.lama_garansi_hari, t, sekarang);
            const pengadaan = tampilanPengadaan(k);
            const ket = keteranganPengadaan(k);
            return (
              <li key={k.sparepart_id} className="flex flex-col gap-3 rounded-lg border border-border p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-semibold break-words text-ink">{k.nama_komponen}</span>
                    <span className="text-xs text-muted">{k.lama_garansi_hari > 0 ? `Garansi ${labelLamaGaransi(k.lama_garansi_hari)}` : "Tanpa garansi"}</span>
                  </div>
                  {aktif && <AksiKomponen tiketId={t.tiket_id} komponenId={k.sparepart_id} nama={k.nama_komponen} awal={isianDariBaris(k)} />}
                </div>
                <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px] md:grid-cols-5 md:gap-y-1">
                  <dt className="text-muted md:order-1">Pengadaan</dt>
                  <dd className="flex flex-col items-start gap-1 md:order-6">
                    <Badge nada={pengadaan.nada}>{pengadaan.label}</Badge>
                    {ket && <span className="text-xs text-muted">{ket}</span>}
                  </dd>
                  <dt className="text-muted md:order-2">Biaya</dt>
                  <dd className="tabular-nums md:order-7">{k.biaya === null ? "—" : formatRupiah(k.biaya)}</dd>
                  <dt className="text-muted md:order-3">Dipasang</dt>
                  <dd className="tabular-nums md:order-8">{k.tanggal_pasang ? formatTanggal(k.tanggal_pasang) : "—"}</dd>
                  <dt className="text-muted md:order-4">Awal garansi</dt>
                  <dd className="md:order-9">{g.mulai ? <span className="tabular-nums">{formatTanggal(g.mulai)}</span> : g.status === "belum_dimulai" ? "Saat unit diserahkan" : "—"}</dd>
                  <dt className="text-muted md:order-5">Akhir garansi</dt>
                  <dd className="md:order-10">
                    <TeksGaransi g={g} lama={k.lama_garansi_hari} />
                  </dd>
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      {komponen.some((k) => k.lama_garansi_hari > 0) && (
        <p className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700">
          Keterangan garansi: berlaku untuk kerusakan komponen yang sama. Tidak berlaku untuk kerusakan akibat cairan, jatuh, atau segel rusak.
        </p>
      )}

      {aktif && komponen.length > 0 && <TambahKomponen tiketId={t.tiket_id} />}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab Transaksi & Pengambilan (#20, K3)
// ---------------------------------------------------------------------------

export function TabTransaksi({ t }: { t: DetailTiket }) {
  const aktif = isAktif(t.status);
  const bayar = t.transaksi.find((x) => x.jenis === "servis");

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="flex flex-col gap-3 p-4 md:p-5">
        <JudulBagian>Biaya</JudulBagian>
        <dl className={KELAS_DL}>
          <Baris label="Estimasi disetujui">
            <span className="tabular-nums">{t.keputusan === "disetujui" && t.estimasi_biaya !== null ? formatRupiah(t.estimasi_biaya) : "—"}</span>
          </Baris>
          <Baris label="Biaya akhir">
            <strong className="text-base tabular-nums">{t.biaya > 0 ? formatRupiah(t.biaya) : "Belum diisi"}</strong>
          </Baris>
        </dl>
        {aktif && t.biaya > 0 && <FormUbahBiaya tiketId={t.tiket_id} biaya={t.biaya} />}
        {aktif && !(t.biaya > 0) && <p className="text-xs text-muted">Biaya akhir diisi saat status diperbarui ke Siap Diambil.</p>}
      </Card>

      <Card className="flex flex-col gap-3 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <JudulBagian>Pembayaran &amp; Pengambilan</JudulBagian>
          {bayar ? (
            <Badge nada="sukses" ikon="check">
              Pembayaran tercatat
            </Badge>
          ) : (
            <Badge nada="netral">Belum tercatat</Badge>
          )}
        </div>

        {bayar ? (
          <dl className={KELAS_DL}>
            <Baris label="Nominal">
              <strong className="tabular-nums">{formatRupiah(bayar.nominal)}</strong>
            </Baris>
            <Baris label="Metode">{METODE[bayar.metode ?? ""] ?? "—"}</Baris>
            <Baris label="Dicatat">{formatTanggalWaktu(bayar.created_at)}</Baris>
            <Baris label="Unit diserahkan">{t.closed_at ? formatTanggalWaktu(t.closed_at) : "—"}</Baris>
          </dl>
        ) : aktif && t.status === "siap_diambil" ? (
          <FormPengambilan tiketId={t.tiket_id} status={t.status} keputusan={t.keputusan} biaya={t.biaya} kelengkapan={t.kelengkapan_unit} />
        ) : aktif ? (
          <p className="flex items-start gap-1.5 text-[13px] text-muted">
            <Ikon nama="info" className="mt-0.5 size-3.5" />
            Pemeriksaan kelengkapan, pembayaran, dan penutupan tiket dibuka setelah status Siap Diambil.
          </p>
        ) : (
          <p className="text-[13px] text-muted">
            {t.status === "dikembalikan" ? "Unit dikembalikan tanpa perbaikan; tidak ada pembayaran yang dicatat." : "Tidak ada pembayaran yang dicatat."}
          </p>
        )}
      </Card>
    </div>
  );
}

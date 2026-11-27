"use client";

import { useEffect, useRef, useState } from "react";

import { Badge, Button, ButtonLink, Card, cx, Ikon } from "@/components/ui";
import { unggahDanCatat, type FotoDipilih } from "../[id]/foto-klien";
import { formatTanggalWaktu } from "@/lib/format";
import type { TiketTersimpan } from "@/lib/penerimaan/simpan";
import { formatToken, pathStatus } from "@/lib/tiket/kode-akses";
import { pesanTandaTerima } from "@/lib/whatsapp";
import { TombolKirimWa } from "../[id]/pemberitahuan-klien";

/** Layar berhasil setelah tiket disimpan (issue #12, mockup 03b). */
export function KartuBerhasil({
  tiket,
  pelanggan,
  foto,
  onBuatLagi,
}: {
  tiket: TiketTersimpan;
  /** Untuk pesan Kirim Bukti via WhatsApp (diambil dari isian form). */
  pelanggan: { nama: string; whatsapp: string; perangkat: string };
  /** Foto kondisi yang dipilih di form; diunggah setelah tiket tersimpan. */
  foto: FotoDipilih[];
  onBuatLagi: () => void;
}) {
  const [unggah, setUnggah] = useState<{ selesai: number; gagal: string | null; berjalan: boolean }>({ selesai: 0, gagal: null, berjalan: foto.length > 0 });
  const sudahMulai = useRef(false);

  useEffect(() => {
    if (sudahMulai.current || foto.length === 0) return;
    sudahMulai.current = true;
    (async () => {
      let selesai = 0;
      for (const f of foto) {
        const h = await unggahDanCatat(tiket.tiketId, f.blob);
        if (!h.ok) {
          setUnggah({ selesai, gagal: h.pesan, berjalan: false });
          return;
        }
        selesai += 1;
        setUnggah({ selesai, gagal: null, berjalan: true });
      }
      setUnggah({ selesai, gagal: null, berjalan: false });
    })();
  }, [foto, tiket.tiketId]);
  const judul = useRef<HTMLHeadingElement>(null);
  // Kartu ini hanya dirender di klien (setelah simpan), jadi window selalu tersedia.
  const [asal] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [tersalin, setTersalin] = useState(false);

  useEffect(() => {
    judul.current?.focus();
  }, []);

  const link = `${asal}${pathStatus(tiket.token)}`;

  async function salin() {
    try {
      await navigator.clipboard.writeText(link);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2500);
    } catch {
      // Clipboard ditolak browser: biarkan pengguna menyalin manual dari teks yang tampil.
    }
  }

  return (
    <Card className="flex flex-col gap-5 border-teal-200 p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal">
          <Ikon nama="check" className="size-5" />
        </span>
        <div>
          <h2 ref={judul} tabIndex={-1} className="text-lg font-bold text-ink focus:outline-none">
            Tiket berhasil disimpan
          </h2>
          <p className="mt-0.5 text-sm text-muted">Berikan link cek status dan PIN pengambilan kepada pelanggan.</p>
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-slate-50 p-3.5">
          <dt className="text-xs font-semibold text-muted">Nomor tiket (otomatis)</dt>
          <dd className="mt-1 text-xl font-bold tracking-tight text-ink tabular-nums">{tiket.nomorTiket}</dd>
        </div>
        <div className="rounded-lg border border-border bg-slate-50 p-3.5">
          <dt className="text-xs font-semibold text-muted">PIN pengambilan</dt>
          <dd className="mt-1 text-xl font-bold tracking-[0.2em] text-ink tabular-nums">{tiket.pin}</dd>
        </div>
        <div className="rounded-lg border border-border bg-slate-50 p-3.5 sm:col-span-2">
          <dt className="text-xs font-semibold text-muted">Link cek status pelanggan</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <span className="min-w-0 font-mono text-sm break-all text-ink">{asal ? link : formatToken(tiket.token)}</span>
            <Button varian="sekunder" ukuran="kecil" ikon={tersalin ? "check" : undefined} onClick={salin} className="min-h-11 md:min-h-9">
              {tersalin ? "Tersalin" : "Salin"}
            </Button>
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-slate-50 p-3.5">
          <dt className="text-xs font-semibold text-muted">Waktu penerimaan</dt>
          <dd className="mt-1 text-sm text-ink tabular-nums">{formatTanggalWaktu(tiket.dibuatPada)} WIB</dd>
        </div>
        <div className="rounded-lg border border-border bg-slate-50 p-3.5">
          <dt className="text-xs font-semibold text-muted">Status awal</dt>
          <dd className="mt-1">
            <Badge nada="netral" ikon="inbox">
              Diterima
            </Badge>
          </dd>
        </div>
      </dl>

      {foto.length > 0 && (
        <p
          role="status"
          className={cx(
            "flex items-start gap-2 rounded-lg p-3 text-[13px]",
            unggah.gagal ? "bg-danger-soft text-red-800" : unggah.berjalan ? "bg-slate-50 text-slate-700" : "bg-teal-50 text-teal",
          )}
        >
          <Ikon
            nama={unggah.gagal ? "alert" : unggah.berjalan ? "spinner" : "check"}
            className={cx("mt-0.5", unggah.berjalan && "animate-spin motion-reduce:animate-none")}
          />
          {unggah.gagal
            ? `${unggah.selesai} dari ${foto.length} foto tersimpan. ${unggah.gagal} Tambahkan sisanya dari Detail Tiket.`
            : unggah.berjalan
              ? `Mengunggah foto ${Math.min(unggah.selesai + 1, foto.length)} dari ${foto.length}…`
              : `${foto.length} foto kondisi tersimpan.`}
        </p>
      )}

      {tiket.ulang && (
        <p className="flex items-start gap-2 rounded-lg bg-primary-soft p-3 text-[13px] text-primary">
          <Ikon nama="info" className="mt-0.5" />
          Tiket ini sudah tersimpan pada percobaan sebelumnya, jadi tidak dibuat ulang.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {asal && (
          <TombolKirimWa
            tiketId={tiket.tiketId}
            jenis="tanda_terima"
            nomorWa={pelanggan.whatsapp}
            pesan={pesanTandaTerima({ nama: pelanggan.nama, nomorTiket: tiket.nomorTiket, perangkat: pelanggan.perangkat, link })}
            label="Kirim Bukti via WhatsApp"
          />
        )}
        <ButtonLink href={`/tiket/${tiket.tiketId}/tanda-terima`} ikon="ticket">
          Cetak Tanda Terima
        </ButtonLink>
        <ButtonLink href={`/tiket/${tiket.tiketId}`} varian="sekunder">
          Lihat Detail Tiket
        </ButtonLink>
        <Button varian="sekunder" ikon="plus" onClick={onBuatLagi}>
          Buat Tiket Lain
        </Button>
      </div>
    </Card>
  );
}

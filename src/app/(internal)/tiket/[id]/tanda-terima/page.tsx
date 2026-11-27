// Tanda terima siap cetak (FR-PNR-11, issue #12). Data dibaca dari database, jadi bisa dicetak ulang.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { Suspense } from "react";

import { TombolCetak } from "./tombol-cetak";
import { ButtonLink, SkeletonTable } from "@/components/ui";
import { formatNomorWa, formatTanggalWaktu } from "@/lib/format";
import { formatToken, pathStatus } from "@/lib/tiket/kode-akses";
import { alamatAplikasi } from "@/lib/alamat";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tanda Terima | HD Solution Computer" };

const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function IsiTandaTerima({ params }: { params: Promise<{ id: string }> }) {
  // Klien Supabase memakai Date.now() untuk sesi; tandai sebagai data per permintaan.
  await connection();
  const { id } = await params;
  if (!POLA_UUID.test(id)) notFound();

  const db = await createClient();
  const { data: t } = await db
    .from("tiket")
    .select(
      "nomor_tiket, tracking_token, pin_pengambilan, keluhan, created_at, perangkat ( kategori, merk_tipe, serial_number, pelanggan ( nama, no_whatsapp ) ), kelengkapan_unit ( nama_item, is_checked_in )",
    )
    .eq("tiket_id", id)
    .maybeSingle();
  if (!t || !t.perangkat) notFound();

  const pelanggan = t.perangkat.pelanggan;
  const link = `${await alamatAplikasi()}${pathStatus(t.tracking_token)}`;
  const qr = await QRCode.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  const kelengkapan = t.kelengkapan_unit.filter((k) => k.is_checked_in).map((k) => k.nama_item);

  return (
    <article className="tanda-terima mx-auto w-full max-w-[560px] rounded-card border border-border bg-surface p-6 text-[13px] text-ink print:max-w-none print:rounded-none print:border-0 print:p-0">
      <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-base font-bold">HD Solution Computer</p>
          <p className="text-muted">Servis laptop, PC &amp; printer</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Tanda Terima Servis</p>
          <p className="text-lg font-bold tabular-nums">{t.nomor_tiket}</p>
          <p className="text-muted tabular-nums">{formatTanggalWaktu(t.created_at)} WIB</p>
        </div>
      </header>

      <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-border py-4">
        <dt className="text-muted">Pelanggan</dt>
        <dd className="font-semibold">{pelanggan?.nama ?? "—"}</dd>
        <dt className="text-muted">WhatsApp</dt>
        <dd className="tabular-nums">{pelanggan ? formatNomorWa(pelanggan.no_whatsapp) : "—"}</dd>
        <dt className="text-muted">Perangkat</dt>
        <dd>
          {t.perangkat.kategori} · {t.perangkat.merk_tipe}
        </dd>
        <dt className="text-muted">Nomor seri</dt>
        <dd className="tabular-nums">{t.perangkat.serial_number || "—"}</dd>
        <dt className="text-muted">Keluhan</dt>
        <dd className="whitespace-pre-line">{t.keluhan}</dd>
        <dt className="text-muted">Kelengkapan</dt>
        <dd>{kelengkapan.length ? kelengkapan.join(", ") : "Tidak ada yang diserahkan"}</dd>
      </dl>

      <section className="flex items-center gap-4 border-b border-border py-4">
        <div className="size-28 shrink-0 [&_svg]:size-full" role="img" aria-label="QR code link cek status" dangerouslySetInnerHTML={{ __html: qr }} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="font-semibold">Cek progres servis</p>
          <p className="text-muted">Pindai QR code atau buka link berikut. Link ini bersifat pribadi.</p>
          <p className="font-mono text-xs break-all">{link}</p>
          <p className="text-muted">
            Kode: <span className="font-mono tabular-nums">{formatToken(t.tracking_token)}</span>
          </p>
        </div>
      </section>

      <section className="flex items-center justify-between gap-4 py-4">
        <div>
          <p className="font-semibold">PIN pengambilan</p>
          <p className="text-muted">Tunjukkan saat mengambil unit. Jangan bagikan.</p>
        </div>
        <p className="rounded-lg border-2 border-ink px-4 py-1.5 text-2xl font-bold tracking-[0.3em] tabular-nums">{t.pin_pengambilan}</p>
      </section>

      <footer className="border-t border-border pt-4 text-xs text-muted">
        Unit diterima dalam kondisi yang telah ditinjau bersama pelanggan. Simpan tanda terima ini sampai unit diambil.
      </footer>
    </article>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-5 md:px-8 md:py-7 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden!">
        <ButtonLink href="/tiket" varian="hantu" ikon="chevronLeft" className="-ml-2 px-2 text-muted">
          Tiket Servis
        </ButtonLink>
        <TombolCetak />
      </div>
      <Suspense fallback={<SkeletonTable baris={6} label="Memuat tanda terima…" className="mx-auto w-full max-w-[560px]" />}>
        <IsiTandaTerima params={params} />
      </Suspense>
    </div>
  );
}

"use client";

// Pemberitahuan WhatsApp (Iterasi 2, K6, mockup 04/04i/04j). Pesan dikirim lewat wa.me yang dibuka
// pemilik; setiap kiriman dicatat "menunggu", lalu pemilik menjawab "Sudah terkirim?".
import { useRouter } from "next/navigation";
import { useState } from "react";

import { catatPemberitahuan, catatTindakLanjut, tandaiPemberitahuan } from "./actions";
import { KELAS_INPUT, KELAS_LABEL, PesanGagal, useAksi } from "./aksi-klien";
import { Button, cx, Ikon } from "@/components/ui";
import { formatNomorWa, formatTanggalWaktu } from "@/lib/format";
import { LABEL_TINDAK_LANJUT, labelHasil, labelJenis, linkWa, perluTindakLanjut, TINDAK_LANJUT, type BarisPemberitahuan } from "@/lib/whatsapp";

const KELAS_TOMBOL_WA =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

/**
 * Tombol yang membuka WhatsApp (link biasa, jadi tidak diblokir browser) dan sekaligus mencatat
 * pemberitahuan berhasil dibuka dengan hasil "menunggu".
 */
export function TombolKirimWa({
  tiketId,
  jenis,
  nomorWa,
  pesan,
  label = "Kirim WhatsApp",
  varian = "utama",
  setelah,
  className,
}: {
  tiketId: string;
  jenis: string;
  nomorWa: string;
  pesan: string;
  label?: string;
  varian?: "utama" | "sekunder";
  setelah?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [galat, setGalat] = useState<string | null>(null);
  const href = linkWa(nomorWa, pesan);
  if (!href) return <p className="text-[13px] text-red-700">Nomor WhatsApp pelanggan tidak valid.</p>;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          setGalat(null);
          catatPemberitahuan(tiketId, jenis)
            .then((h) => {
              if (!h.ok) setGalat(`WhatsApp terbuka, tetapi pengiriman belum tercatat: ${h.pesan}`);
              setelah?.();
              router.refresh();
            })
            .catch(() => setGalat("WhatsApp terbuka, tetapi pengiriman belum tercatat. Periksa koneksi."));
        }}
        className={cx(KELAS_TOMBOL_WA, varian === "utama" ? "bg-teal text-white hover:opacity-90" : "border border-slate-300 bg-surface text-teal hover:bg-slate-50")}
      >
        <Ikon nama="chat" />
        {label}
      </a>
      <PesanGagal id={`galat-wa-${jenis}`} pesan={galat} />
    </div>
  );
}

function TombolSalinPesan({ pesan }: { pesan: string }) {
  const [tersalin, setTersalin] = useState(false);
  return (
    <Button
      varian="sekunder"
      ikon={tersalin ? "check" : undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(pesan);
          setTersalin(true);
          setTimeout(() => setTersalin(false), 2500);
        } catch {
          // Clipboard ditolak: pesan tetap tampil di pratinjau untuk disalin manual.
        }
      }}
    >
      {tersalin ? "Tersalin" : "Salin Pesan"}
    </Button>
  );
}

function KonfirmasiTerkirim({ tiketId, p }: { tiketId: string; p: BarisPemberitahuan }) {
  const { jalankan, memproses, galat } = useAksi();
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3.5" role="group" aria-labelledby={`tanya-${p.pemberitahuan_id}`}>
      <p id={`tanya-${p.pemberitahuan_id}`} className="text-[13px] text-amber-900">
        <strong>Sudah terkirim?</strong> {labelJenis(p.jenis)} · dibuka {formatTanggalWaktu(p.dikirim_at)}. WhatsApp tidak memberi tahu status pengiriman, jadi tandai sendiri.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button ikon="check" disabled={memproses} onClick={() => jalankan(() => tandaiPemberitahuan(tiketId, p.pemberitahuan_id, true))}>
          Ya, terkirim
        </Button>
        <Button varian="sekunder" disabled={memproses} onClick={() => jalankan(() => tandaiPemberitahuan(tiketId, p.pemberitahuan_id, false))}>
          Belum
        </Button>
      </div>
      <PesanGagal id={`galat-konfirmasi-${p.pemberitahuan_id}`} pesan={galat} />
    </div>
  );
}

function TindakLanjutGagal({ tiketId, p, nomorWa, pesan }: { tiketId: string; p: BarisPemberitahuan; nomorWa: string; pesan: string }) {
  const [pilihan, setPilihan] = useState<string>("kirim_manual");
  const [catatan, setCatatan] = useState("");
  const { jalankan, memproses, galat } = useAksi();
  const id = (n: string) => `${n}-${p.pemberitahuan_id}`;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-danger-soft p-3.5">
      <p className="flex items-start gap-2 text-[13px] text-red-800">
        <Ikon nama="alert" className="mt-0.5" />
        <span>
          <strong>Gagal terkirim · {formatTanggalWaktu(p.diperbarui_at ?? p.dikirim_at)}</strong>
          <br />
          {labelJenis(p.jenis)} belum diterima pelanggan. Kirim ulang, atau catat cara lain yang sudah dilakukan.
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <TombolKirimWa tiketId={tiketId} jenis={p.jenis} nomorWa={nomorWa} pesan={pesan} label="Coba Kirim Ulang" varian="sekunder" />
        <TombolSalinPesan pesan={pesan} />
      </div>
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          jalankan(() => catatTindakLanjut(tiketId, p.pemberitahuan_id, pilihan, catatan));
        }}
      >
        <div>
          <label htmlFor={id("tindak-lanjut")} className={KELAS_LABEL}>
            Catat tindak lanjut
          </label>
          <select id={id("tindak-lanjut")} value={pilihan} onChange={(e) => setPilihan(e.target.value)} className={KELAS_INPUT}>
            {TINDAK_LANJUT.map((t) => (
              <option key={t} value={t}>
                {LABEL_TINDAK_LANJUT[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id("catatan-tindak")} className={KELAS_LABEL}>
            Catatan (opsional)
          </label>
          <input id={id("catatan-tindak")} value={catatan} maxLength={300} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: Nomor tidak aktif di WhatsApp" className={KELAS_INPUT} />
        </div>
        <PesanGagal id={id("galat-tindak")} pesan={galat} />
        <Button type="submit" className="self-start" disabled={memproses}>
          {memproses ? "Menyimpan…" : "Simpan Tindak Lanjut"}
        </Button>
      </form>
    </div>
  );
}

/** Panel kanan Detail Tiket: pratinjau pesan, kirim, konfirmasi, tindak lanjut, dan riwayat. */
export function PanelPemberitahuan({
  tiketId,
  nomorWa,
  jenis,
  pesan,
  pesanPerJenis,
  riwayat,
  bisaKirim,
}: {
  tiketId: string;
  nomorWa: string;
  /** Jenis pesan pratinjau (status tiket sekarang). */
  jenis: string;
  pesan: string;
  /** Pesan untuk kirim ulang pemberitahuan lama per jenis. */
  pesanPerJenis: Record<string, string>;
  /** Terbaru di atas. */
  riwayat: BarisPemberitahuan[];
  bisaKirim: boolean;
}) {
  const menunggu = riwayat.find((p) => p.hasil === "menunggu");
  const gagal = riwayat.find(perluTindakLanjut);

  return (
    <section aria-labelledby="judul-pemberitahuan" className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-4 md:p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal">
          <Ikon nama="chat" />
        </span>
        <div>
          <h2 id="judul-pemberitahuan" className="font-bold text-ink">
            Pemberitahuan Pelanggan
          </h2>
          <p className="text-xs text-muted tabular-nums">WhatsApp · {formatNomorWa(nomorWa)}</p>
        </div>
      </div>

      {bisaKirim && (
        <>
          <div className="rounded-lg bg-[#ECE5DD] p-3">
            <p aria-label="Pratinjau pesan" className="rounded-md bg-surface p-3 text-[13px] leading-relaxed break-words whitespace-pre-line text-ink shadow-sm">
              {pesan}
            </p>
          </div>
          {!gagal && <TombolKirimWa tiketId={tiketId} jenis={jenis} nomorWa={nomorWa} pesan={pesan} />}
        </>
      )}

      {menunggu && <KonfirmasiTerkirim tiketId={tiketId} p={menunggu} />}
      {gagal && <TindakLanjutGagal tiketId={tiketId} p={gagal} nomorWa={nomorWa} pesan={pesanPerJenis[gagal.jenis] ?? pesan} />}

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <h3 className="text-[13px] font-bold text-ink">Riwayat pemberitahuan</h3>
        {riwayat.length === 0 ? (
          <p className="text-[13px] text-muted">Belum ada pemberitahuan yang dikirim.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {riwayat.map((p) => (
              <li key={p.pemberitahuan_id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-slate-700">{labelJenis(p.jenis)}</span>
                <span className={cx("tabular-nums", p.hasil === "terkirim" ? "text-teal" : p.hasil === "gagal" ? "text-red-700" : "text-amber-800")}>
                  {labelHasil(p)} · {formatTanggalWaktu(p.diperbarui_at ?? p.dikirim_at).replace(/ \d{4},/, ",")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

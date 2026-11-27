"use client";

// Foto kondisi perangkat (Iterasi 2, K9): unggah dari Form Penerimaan dan kelola di Detail Tiket.
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { catatFoto, hapusFoto } from "./actions";
import { PesanGagal } from "./aksi-klien";
import { Button, cx, Ikon } from "@/components/ui";
import { MAKS_FOTO, periksaFile } from "@/lib/foto";
import { GagalFoto, hapusDariStorage, perkecilFoto, unggahKeStorage } from "@/lib/foto-klien";

/** Unggah satu foto yang sudah diperkecil lalu catat barisnya. Berkas dihapus lagi jika pencatatan gagal. */
export async function unggahDanCatat(tiketId: string, foto: Blob): Promise<{ ok: true } | { ok: false; pesan: string }> {
  try {
    const path = await unggahKeStorage(tiketId, foto);
    const hasil = await catatFoto(tiketId, path);
    if (!hasil.ok) {
      await hapusDariStorage(path).catch(() => {});
      return { ok: false, pesan: hasil.pesan };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, pesan: e instanceof GagalFoto ? e.message : "Foto belum terunggah. Periksa koneksi lalu coba lagi." };
  }
}

export type FotoDipilih = { kunci: string; blob: Blob; url: string };

/**
 * Pilih foto (kamera HP atau galeri). Foto langsung diperkecil di browser; hasilnya dipegang
 * pemanggil. Dipakai Form Penerimaan (sebelum tiket tersimpan) dan Detail Tiket (tambah foto).
 */
export function PilihFoto({
  jumlahSekarang,
  tambah,
  label = "Tambah Foto",
  id = "pilih-foto",
}: {
  jumlahSekarang: number;
  tambah: (foto: FotoDipilih[]) => void;
  label?: string;
  id?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const sisa = MAKS_FOTO - jumlahSekarang;

  async function pilih(files: FileList | null) {
    if (!files?.length) return;
    setGalat(null);
    setMemproses(true);
    const hasil: FotoDipilih[] = [];
    try {
      for (const file of Array.from(files)) {
        const salah = periksaFile(file, jumlahSekarang + hasil.length);
        if (salah) {
          setGalat(salah);
          break;
        }
        try {
          const blob = await perkecilFoto(file);
          hasil.push({ kunci: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
        } catch (e) {
          setGalat(e instanceof GagalFoto ? e.message : "Foto tidak bisa diproses.");
          break;
        }
      }
      if (hasil.length) tambah(hasil);
    } finally {
      setMemproses(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple className="sr-only" onChange={(e) => void pilih(e.target.files)} disabled={sisa <= 0 || memproses} aria-describedby={`${id}-petunjuk`} />
      <label
        htmlFor={id}
        className={cx(
          "inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-lg border border-slate-300 bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-slate-50 has-[:focus-visible]:ring-2 md:min-h-[42px]",
          (sisa <= 0 || memproses) && "pointer-events-none opacity-50",
        )}
      >
        <Ikon nama={memproses ? "spinner" : "plus"} className={memproses ? "animate-spin motion-reduce:animate-none" : undefined} />
        {memproses ? "Memproses foto…" : label}
      </label>
      <p id={`${id}-petunjuk`} className="text-xs text-muted">
        Opsional, maksimal {MAKS_FOTO} foto. Foto diperkecil otomatis sebelum diunggah. {sisa > 0 ? `Sisa ${sisa}.` : "Jumlah maksimal tercapai."}
      </p>
      <PesanGagal id={`${id}-galat`} pesan={galat} />
    </div>
  );
}

/** Kisi foto kecil dengan tombol hapus (Form Penerimaan, sebelum disimpan). */
export function PratinjauFoto({ foto, hapus }: { foto: FotoDipilih[]; hapus: (kunci: string) => void }) {
  if (!foto.length) return null;
  return (
    <ul aria-label="Foto yang akan diunggah" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {foto.map((f, i) => (
        <li key={f.kunci} className="relative overflow-hidden rounded-lg border border-border bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob lokal, bukan aset statis */}
          <img src={f.url} alt={`Foto kondisi ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
          <button
            type="button"
            aria-label={`Hapus foto ${i + 1}`}
            onClick={() => hapus(f.kunci)}
            className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:size-9"
          >
            <Ikon nama="x" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Kartu foto di Detail Tiket: lihat, tambah, dan hapus (selama tiket aktif). */
export function KelolaFoto({ tiketId, foto, bisaUbah }: { tiketId: string; foto: { foto_id: string; url: string | null }[]; bisaUbah: boolean }) {
  const router = useRouter();
  const [memproses, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<string | null>(null);

  function tambah(dipilih: FotoDipilih[]) {
    setGalat(null);
    mulai(async () => {
      for (const f of dipilih) {
        const h = await unggahDanCatat(tiketId, f.blob);
        URL.revokeObjectURL(f.url);
        if (!h.ok) {
          setGalat(h.pesan);
          break;
        }
      }
      router.refresh();
    });
  }

  function hapus(fotoId: string) {
    setGalat(null);
    mulai(async () => {
      const h = await hapusFoto(tiketId, fotoId).catch(() => ({ ok: false as const, pesan: "Foto belum terhapus. Periksa koneksi lalu coba lagi." }));
      if (!h.ok) setGalat(h.pesan);
      setKonfirmasi(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {foto.length === 0 ? (
        <p className="text-[13px] text-muted">Tidak ada foto kondisi.</p>
      ) : (
        <ul aria-label="Foto kondisi perangkat" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {foto.map((f, i) => (
            <li key={f.foto_id} className="flex flex-col gap-1.5">
              {f.url ? (
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-border bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL privat yang berlaku sebentar */}
                  <img src={f.url} alt={`Foto kondisi ${i + 1} (buka ukuran penuh)`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                </a>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-border bg-slate-100 text-xs text-muted">Foto tidak dapat dimuat</div>
              )}
              {bisaUbah &&
                (konfirmasi === f.foto_id ? (
                  <div className="flex gap-1">
                    <Button varian="bahaya" ukuran="kecil" className="min-h-11 flex-1 md:min-h-9" disabled={memproses} onClick={() => hapus(f.foto_id)}>
                      Ya, hapus
                    </Button>
                    <Button varian="sekunder" ukuran="kecil" className="min-h-11 md:min-h-9" disabled={memproses} onClick={() => setKonfirmasi(null)}>
                      Batal
                    </Button>
                  </div>
                ) : (
                  <Button varian="hantu" ukuran="kecil" className="min-h-11 text-red-700 hover:bg-red-50 md:min-h-9" aria-label={`Hapus foto ${i + 1}`} onClick={() => setKonfirmasi(f.foto_id)}>
                    Hapus
                  </Button>
                ))}
            </li>
          ))}
        </ul>
      )}
      {bisaUbah && foto.length < MAKS_FOTO && <PilihFoto jumlahSekarang={foto.length} tambah={tambah} id="tambah-foto-detail" />}
      {memproses && <p className="text-xs text-muted">Menyimpan foto…</p>}
      <PesanGagal id="galat-foto" pesan={galat} />
    </div>
  );
}

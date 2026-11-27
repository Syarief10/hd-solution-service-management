"use client";

// Interaksi tab Komponen & Garansi (Iterasi 2, FR-GAR-01, mockup 04e/04f).
import { useState, type FormEvent } from "react";

import { hapusKomponen, pilihPakaiKomponen, simpanKomponen } from "./actions";
import { angka, formatIsian, KELAS_INPUT, KELAS_LABEL, PesanGagal, useAksi } from "./aksi-klien";
import { Button, cx, Ikon } from "@/components/ui";
import {
  isianKomponenKosong,
  LABEL_PENGADAAN,
  labelLamaGaransi,
  PILIHAN_GARANSI,
  STATUS_PENGADAAN,
  type IsianKomponen,
  type StatusPengadaan,
} from "@/lib/tiket/komponen";

/** Pilihan Ada komponen / Tanpa komponen (segmen di kanan judul). */
export function PilihanPakaiKomponen({ tiketId, pakai, jumlahKomponen }: { tiketId: string; pakai: boolean | null; jumlahKomponen: number }) {
  const { jalankan, memproses, galat } = useAksi();
  const pilihan = [
    { nilai: true, label: "Ada komponen" },
    { nilai: false, label: "Tanpa komponen" },
  ];
  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <div role="radiogroup" aria-label="Komponen pengganti" className="inline-flex rounded-lg bg-slate-100 p-1">
        {pilihan.map((p) => {
          const dipilih = pakai === p.nilai;
          const terkunci = p.nilai === false && jumlahKomponen > 0;
          return (
            <button
              key={p.label}
              type="button"
              role="radio"
              aria-checked={dipilih}
              disabled={memproses || dipilih || terkunci}
              title={terkunci ? "Hapus komponen yang tercatat dulu" : undefined}
              onClick={() => jalankan(() => pilihPakaiKomponen(tiketId, p.nilai))}
              className={cx(
                "min-h-11 rounded-md px-3 text-[13px] font-semibold md:min-h-9",
                dipilih ? "bg-surface text-primary shadow-sm" : "text-slate-600 hover:text-ink",
                terkunci && "cursor-not-allowed opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <PesanGagal id="galat-pakai-komponen" pesan={galat} />
    </div>
  );
}

function Tanggal({ id, label, nilai, ubah, petunjuk }: { id: string; label: string; nilai: string; ubah: (v: string) => void; petunjuk?: string }) {
  return (
    <div>
      <label htmlFor={id} className={KELAS_LABEL}>
        {label}
      </label>
      <input id={id} type="date" value={nilai} onChange={(e) => ubah(e.target.value)} className={KELAS_INPUT} aria-describedby={petunjuk ? `${id}-petunjuk` : undefined} />
      {petunjuk && (
        <p id={`${id}-petunjuk`} className="mt-1 text-xs text-muted">
          {petunjuk}
        </p>
      )}
    </div>
  );
}

/** Form tambah atau ubah komponen. */
function FormKomponen({ tiketId, komponenId, awal, selesai }: { tiketId: string; komponenId: string | null; awal: IsianKomponen; selesai: () => void }) {
  const [isian, setIsian] = useState<IsianKomponen>(awal);
  const [biaya, setBiaya] = useState(formatIsian(awal.biaya ?? null));
  const { jalankan, memproses, galat } = useAksi();
  const ubah = (sebagian: Partial<IsianKomponen>) => setIsian((i) => ({ ...i, ...sebagian }));
  const p = isian.pengadaan;
  const idf = (nama: string) => `${nama}-${komponenId ?? "baru"}`;

  function kirim(e: FormEvent) {
    e.preventDefault();
    const n = angka(biaya);
    jalankan(() => simpanKomponen(tiketId, komponenId, { ...isian, biaya: Number.isNaN(n) ? null : n }), selesai);
  }

  return (
    <form onSubmit={kirim} aria-label={komponenId ? "Ubah komponen" : "Tambah komponen"} className="flex flex-col gap-3.5 rounded-lg border border-slate-300 bg-slate-50 p-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={idf("nama-komponen")} className={KELAS_LABEL}>
            Nama komponen
            <span aria-hidden="true" className="text-red-700">
              {" "}
              *
            </span>
          </label>
          <input id={idf("nama-komponen")} value={isian.nama} maxLength={120} onChange={(e) => ubah({ nama: e.target.value })} placeholder="IC Charging BQ24780S" className={KELAS_INPUT} />
        </div>
        <div>
          <label htmlFor={idf("pengadaan")} className={KELAS_LABEL}>
            Pengadaan
          </label>
          <select id={idf("pengadaan")} value={p} onChange={(e) => ubah({ pengadaan: e.target.value as StatusPengadaan })} className={KELAS_INPUT}>
            {STATUS_PENGADAAN.map((s) => (
              <option key={s} value={s}>
                {LABEL_PENGADAAN[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={idf("biaya-komponen")} className={KELAS_LABEL}>
            Biaya
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">Rp</span>
            <input
              id={idf("biaya-komponen")}
              inputMode="numeric"
              value={biaya}
              onChange={(e) => setBiaya(formatIsian(angka(e.target.value)))}
              placeholder="245.000"
              className={cx(KELAS_INPUT, "pl-9 tabular-nums")}
            />
          </div>
        </div>
        {p !== "tersedia" && <Tanggal id={idf("tanggal-pesan")} label="Tanggal dipesan" nilai={isian.tanggalPesan ?? ""} ubah={(v) => ubah({ tanggalPesan: v })} />}
        {p === "dipesan" && <Tanggal id={idf("perkiraan-tiba-komponen")} label="Perkiraan tiba" nilai={isian.perkiraanTiba ?? ""} ubah={(v) => ubah({ perkiraanTiba: v })} />}
        {p === "tiba" && <Tanggal id={idf("tanggal-tiba")} label="Tanggal tiba" nilai={isian.tanggalTiba ?? ""} ubah={(v) => ubah({ tanggalTiba: v })} />}
        {p !== "dipesan" && <Tanggal id={idf("tanggal-pasang")} label="Tanggal dipasang" nilai={isian.tanggalPasang ?? ""} ubah={(v) => ubah({ tanggalPasang: v })} />}
        <div>
          <label htmlFor={idf("lama-garansi")} className={KELAS_LABEL}>
            Lama garansi
          </label>
          <select id={idf("lama-garansi")} value={isian.lamaGaransi} onChange={(e) => ubah({ lamaGaransi: Number(e.target.value) })} aria-describedby={idf("garansi-petunjuk")} className={KELAS_INPUT}>
            {[...new Set([...PILIHAN_GARANSI, isian.lamaGaransi])]
              .sort((a, b) => a - b)
              .map((h) => (
                <option key={h} value={h}>
                  {labelLamaGaransi(h)}
                </option>
              ))}
          </select>
          <p id={idf("garansi-petunjuk")} className="mt-1 text-xs text-muted">
            Dihitung sejak unit diserahkan ke pelanggan.
          </p>
        </div>
      </div>
      <PesanGagal id={idf("galat-komponen")} pesan={galat} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={memproses}>
          {memproses ? "Menyimpan…" : komponenId ? "Simpan Perubahan" : "Simpan Komponen"}
        </Button>
        <Button varian="sekunder" disabled={memproses} onClick={selesai}>
          Batal
        </Button>
      </div>
    </form>
  );
}

/** Tombol Tambah Komponen yang membuka form di tempat. */
export function TambahKomponen({ tiketId, varian = "sekunder" }: { tiketId: string; varian?: "sekunder" | "primer" }) {
  const [buka, setBuka] = useState(false);
  if (buka) return <FormKomponen tiketId={tiketId} komponenId={null} awal={isianKomponenKosong()} selesai={() => setBuka(false)} />;
  return (
    <Button varian={varian} ikon="plus" className="self-start" onClick={() => setBuka(true)}>
      Tambah Komponen
    </Button>
  );
}

/** Aksi per komponen: Ubah (membuka form di bawah baris) dan Hapus (dengan konfirmasi di tempat). */
export function AksiKomponen({ tiketId, komponenId, nama, awal }: { tiketId: string; komponenId: string; nama: string; awal: IsianKomponen }) {
  const [mode, setMode] = useState<"diam" | "ubah" | "hapus">("diam");
  const { jalankan, memproses, galat } = useAksi();

  if (mode === "ubah") return <FormKomponen tiketId={tiketId} komponenId={komponenId} awal={awal} selesai={() => setMode("diam")} />;

  return (
    <div className="flex flex-col gap-1.5">
      {mode === "hapus" ? (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-red-800">Hapus {nama}?</span>
          <Button varian="bahaya" ukuran="kecil" className="min-h-11 md:min-h-9" disabled={memproses} onClick={() => jalankan(() => hapusKomponen(tiketId, komponenId))}>
            {memproses ? "Menghapus…" : "Ya, hapus"}
          </Button>
          <Button varian="sekunder" ukuran="kecil" className="min-h-11 md:min-h-9" disabled={memproses} onClick={() => setMode("diam")}>
            Batal
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          <Button varian="hantu" ukuran="kecil" className="min-h-11 px-2 md:min-h-9" aria-label={`Ubah ${nama}`} onClick={() => setMode("ubah")}>
            Ubah
          </Button>
          <Button varian="hantu" ukuran="kecil" className="min-h-11 px-2 text-red-700 hover:bg-red-50 md:min-h-9" aria-label={`Hapus ${nama}`} onClick={() => setMode("hapus")}>
            <Ikon nama="x" className="size-3.5" />
            Hapus
          </Button>
        </div>
      )}
      <PesanGagal id={`galat-hapus-${komponenId}`} pesan={galat} />
    </div>
  );
}

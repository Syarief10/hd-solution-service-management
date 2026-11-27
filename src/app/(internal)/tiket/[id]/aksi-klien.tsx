"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import {
  bukaUlangKeputusan,
  buatUlangAkses,
  catatKeputusan,
  simpanDiagnosis,
  simpanEstimasi,
  tandaiKelengkapan,
  tutupTiket,
  ubahBiaya,
  type HasilAksi,
} from "./actions";
import { Button, cx, FieldError, Ikon, useToast } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { syaratTutupTiket } from "@/lib/tiket/detail";

const KELAS_INPUT =
  "block min-h-11 w-full rounded-lg border border-slate-300 bg-surface px-3 text-sm text-ink placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:min-h-[42px]";
const KELAS_LABEL = "mb-1.5 block text-[13px] font-semibold text-slate-700";

/** Jalankan server action, tampilkan toast, lalu muat ulang data halaman. */
function useAksi() {
  const router = useRouter();
  const toast = useToast();
  const [memproses, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);

  const jalankan = (aksi: () => Promise<HasilAksi>, setelah?: () => void) => {
    setGalat(null);
    mulai(async () => {
      let hasil: HasilAksi;
      try {
        hasil = await aksi();
      } catch {
        hasil = { ok: false, pesan: "Perubahan belum tersimpan. Periksa koneksi lalu coba lagi." };
      }
      if (hasil.ok) {
        if (hasil.pesan) toast({ judul: hasil.pesan });
        setelah?.();
        router.refresh();
      } else {
        setGalat(hasil.pesan);
      }
    });
  };
  return { jalankan, memproses, galat };
}

function PesanGagal({ id, pesan }: { id: string; pesan: string | null }) {
  if (!pesan) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-[13px] text-red-700">
      <Ikon nama="alert" className="mt-0.5 size-3.5" />
      {pesan}
    </p>
  );
}

/** Angka rupiah dari isian bebas: "595.000", "Rp 595000" → 595000. */
function angka(teks: string): number {
  const d = teks.replace(/\D/g, "");
  return d ? Number(d) : NaN;
}

const formatIsian = (n: number | null) => (n === null || Number.isNaN(n) ? "" : n.toLocaleString("id-ID"));

// ---------------------------------------------------------------------------
// Informasi Unit
// ---------------------------------------------------------------------------

export function TombolSalin({ teks, label = "Salin" }: { teks: string; label?: string }) {
  const [tersalin, setTersalin] = useState(false);
  return (
    <Button
      varian="sekunder"
      ukuran="kecil"
      ikon={tersalin ? "check" : undefined}
      className="min-h-11 md:min-h-9"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(teks);
          setTersalin(true);
          setTimeout(() => setTersalin(false), 2500);
        } catch {
          // Clipboard ditolak: teks tetap tampil untuk disalin manual.
        }
      }}
    >
      {tersalin ? "Tersalin" : label}
    </Button>
  );
}

export function TombolBuatUlangAkses({ tiketId }: { tiketId: string }) {
  const { jalankan, memproses, galat } = useAksi();
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        varian="hantu"
        ukuran="kecil"
        ikon="retry"
        className="min-h-11 self-start px-2 text-muted md:min-h-9"
        disabled={memproses}
        onClick={() => {
          if (!window.confirm("Buat link status dan PIN baru? Link dan PIN lama langsung tidak berlaku.")) return;
          jalankan(() => buatUlangAkses(tiketId));
        }}
      >
        {memproses ? "Membuat…" : "Buat ulang akses"}
      </Button>
      <PesanGagal id="galat-akses" pesan={galat} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progres & Pemeriksaan
// ---------------------------------------------------------------------------

export function FormDiagnosis({ tiketId, awal }: { tiketId: string; awal: string }) {
  const [isi, setIsi] = useState(awal);
  const { jalankan, memproses, galat } = useAksi();
  const berubah = isi.trim() !== awal.trim();
  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => simpanDiagnosis(tiketId, isi));
      }}
    >
      <label htmlFor="diagnosis" className="sr-only">
        Hasil diagnosis
      </label>
      <textarea
        id="diagnosis"
        rows={4}
        value={isi}
        onChange={(e) => setIsi(e.target.value)}
        aria-describedby={galat ? "galat-diagnosis" : undefined}
        placeholder="Contoh: IC charging BQ24780S short akibat lonjakan arus. Komponen lain normal."
        className={cx(KELAS_INPUT, "py-2.5")}
      />
      <PesanGagal id="galat-diagnosis" pesan={galat} />
      <Button type="submit" className="self-start" disabled={memproses || !berubah}>
        {memproses ? "Menyimpan…" : "Simpan Diagnosis"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Estimasi & Persetujuan
// ---------------------------------------------------------------------------

export function FormEstimasi({ tiketId, biaya, selesai }: { tiketId: string; biaya: number | null; selesai: string | null }) {
  const [nominal, setNominal] = useState(formatIsian(biaya));
  const [tanggal, setTanggal] = useState(selesai ?? "");
  const { jalankan, memproses, galat } = useAksi();

  function kirim(e: FormEvent) {
    e.preventDefault();
    jalankan(() => simpanEstimasi(tiketId, { biaya: angka(nominal), selesai: tanggal }));
  }

  return (
    <form onSubmit={kirim} className="flex flex-col gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label htmlFor="estimasi-biaya" className={KELAS_LABEL}>
            Total estimasi biaya
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">Rp</span>
            <input
              id="estimasi-biaya"
              inputMode="numeric"
              value={nominal}
              onChange={(e) => setNominal(formatIsian(angka(e.target.value)))}
              placeholder="595.000"
              className={cx(KELAS_INPUT, "pl-9 tabular-nums")}
            />
          </div>
        </div>
        <div>
          <label htmlFor="estimasi-selesai" className={KELAS_LABEL}>
            Perkiraan selesai
          </label>
          <input id="estimasi-selesai" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={KELAS_INPUT} />
        </div>
      </div>
      <p className="text-xs text-muted">Rincian per baris jasa dan komponen belum tersedia (menunggu pembaruan database). Tulis rinciannya di hasil diagnosis bila perlu.</p>
      <PesanGagal id="galat-estimasi" pesan={galat} />
      <Button type="submit" className="self-start" disabled={memproses}>
        {memproses ? "Menyimpan…" : "Simpan Estimasi"}
      </Button>
    </form>
  );
}

function waktuSekarangLokal(): string {
  // Waktu WIB untuk <input type="datetime-local">, contoh 2026-10-15T11:05.
  const wib = new Date(Date.now() + 7 * 3_600_000).toISOString();
  return wib.slice(0, 16);
}

export function FormKeputusan({ tiketId, adaEstimasi }: { tiketId: string; adaEstimasi: boolean }) {
  const [cara, setCara] = useState("whatsapp");
  const [waktu, setWaktu] = useState(waktuSekarangLokal);
  const [alasan, setAlasan] = useState("");
  const [tolak, setTolak] = useState(false);
  const { jalankan, memproses, galat } = useAksi();

  if (!adaEstimasi) {
    return <p className="text-[13px] text-muted">Isi dan simpan estimasi terlebih dahulu, lalu catat jawaban pelanggan di sini.</p>;
  }

  const catat = (keputusan: "disetujui" | "ditolak") => jalankan(() => catatKeputusan(tiketId, { keputusan, cara: cara as "whatsapp", waktu, alasan }));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label htmlFor="cara-konfirmasi" className={KELAS_LABEL}>
            Cara konfirmasi
          </label>
          <select id="cara-konfirmasi" value={cara} onChange={(e) => setCara(e.target.value)} className={KELAS_INPUT}>
            <option value="whatsapp">WhatsApp</option>
            <option value="telepon">Telepon</option>
            <option value="datang">Datang ke toko</option>
          </select>
        </div>
        <div>
          <label htmlFor="waktu-konfirmasi" className={KELAS_LABEL}>
            Waktu konfirmasi (WIB)
          </label>
          <input id="waktu-konfirmasi" type="datetime-local" value={waktu} onChange={(e) => setWaktu(e.target.value)} className={KELAS_INPUT} />
        </div>
      </div>

      {tolak && (
        <div>
          <label htmlFor="alasan-tolak" className={KELAS_LABEL}>
            Alasan penolakan
            <span aria-hidden="true" className="text-red-700">
              {" "}
              *
            </span>
          </label>
          <textarea
            id="alasan-tolak"
            rows={2}
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Contoh: Biaya di atas anggaran pelanggan."
            className={cx(KELAS_INPUT, "py-2.5")}
          />
          <FieldError idKolom="alasan-tolak" pesan={galat?.includes("Alasan") ? galat : null} />
        </div>
      )}
      <PesanGagal id="galat-keputusan" pesan={galat?.includes("Alasan") ? null : galat} />

      <div className="flex flex-wrap gap-2">
        {!tolak ? (
          <>
            <Button ikon="check" disabled={memproses} onClick={() => catat("disetujui")}>
              Catat Disetujui
            </Button>
            <Button varian="sekunder" disabled={memproses} onClick={() => setTolak(true)}>
              Catat Ditolak
            </Button>
          </>
        ) : (
          <>
            <Button varian="bahaya" disabled={memproses} onClick={() => catat("ditolak")}>
              {memproses ? "Menyimpan…" : "Simpan Penolakan"}
            </Button>
            <Button varian="sekunder" disabled={memproses} onClick={() => setTolak(false)}>
              Batal
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function TombolBukaUlang({ tiketId }: { tiketId: string }) {
  const { jalankan, memproses, galat } = useAksi();
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        varian="sekunder"
        ukuran="kecil"
        className="min-h-11 self-start md:min-h-9"
        disabled={memproses}
        onClick={() => {
          if (!window.confirm("Buka ulang keputusan? Keputusan yang tercatat akan dikosongkan dan estimasi bisa diubah lagi.")) return;
          jalankan(() => bukaUlangKeputusan(tiketId));
        }}
      >
        Ubah estimasi atau keputusan
      </Button>
      <PesanGagal id="galat-buka-ulang" pesan={galat} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transaksi & Pengambilan
// ---------------------------------------------------------------------------

export function FormUbahBiaya({ tiketId, biaya }: { tiketId: string; biaya: number }) {
  const [buka, setBuka] = useState(false);
  const [nominal, setNominal] = useState(formatIsian(biaya));
  const [alasan, setAlasan] = useState("");
  const { jalankan, memproses, galat } = useAksi();

  if (!buka) {
    return (
      <Button varian="sekunder" ukuran="kecil" className="min-h-11 self-start md:min-h-9" onClick={() => setBuka(true)}>
        Ubah biaya
      </Button>
    );
  }
  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border bg-slate-50 p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        jalankan(() => ubahBiaya(tiketId, angka(nominal), alasan), () => setBuka(false));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="biaya-baru" className={KELAS_LABEL}>
            Biaya akhir baru
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">Rp</span>
            <input id="biaya-baru" inputMode="numeric" value={nominal} onChange={(e) => setNominal(formatIsian(angka(e.target.value)))} className={cx(KELAS_INPUT, "pl-9 tabular-nums")} />
          </div>
        </div>
        <div>
          <label htmlFor="alasan-biaya" className={KELAS_LABEL}>
            Alasan perubahan
          </label>
          <input id="alasan-biaya" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: tambahan pasta termal" className={KELAS_INPUT} />
        </div>
      </div>
      <p className="text-xs text-muted">Perubahan biaya tercatat di riwayat status beserta alasannya.</p>
      <PesanGagal id="galat-biaya" pesan={galat} />
      <div className="flex gap-2">
        <Button type="submit" disabled={memproses}>
          {memproses ? "Menyimpan…" : "Simpan Biaya"}
        </Button>
        <Button varian="sekunder" onClick={() => setBuka(false)} disabled={memproses}>
          Batal
        </Button>
      </div>
    </form>
  );
}

type ItemKelengkapan = { kelengkapan_id: string; nama_item: string; is_checked_in: boolean; is_checked_out: boolean };

export function FormPengambilan({
  tiketId,
  status,
  keputusan,
  biaya,
  kelengkapan,
}: {
  tiketId: string;
  status: string;
  keputusan: string;
  biaya: number;
  kelengkapan: ItemKelengkapan[];
}) {
  const [metode, setMetode] = useState("");
  const [pin, setPin] = useState("");
  const centang = useAksi();
  const tutup = useAksi();
  const diterima = kelengkapan.filter((k) => k.is_checked_in);
  const kurang = syaratTutupTiket({ status, keputusan, biaya, kelengkapan, metode });

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-semibold text-slate-700">Pemeriksaan saat pengembalian</legend>
        {diterima.length === 0 && <p className="text-[13px] text-muted">Tidak ada kelengkapan yang diserahkan saat penerimaan.</p>}
        {diterima.map((k) => (
          <label key={k.kelengkapan_id} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 text-sm">
            <input
              type="checkbox"
              checked={k.is_checked_out}
              disabled={centang.memproses}
              onChange={(e) => centang.jalankan(() => tandaiKelengkapan(tiketId, k.kelengkapan_id, e.target.checked))}
              className="size-5 accent-primary"
            />
            {k.nama_item} dikembalikan
          </label>
        ))}
        <PesanGagal id="galat-kelengkapan" pesan={centang.galat} />
      </fieldset>

      <div className="grid gap-3.5 sm:grid-cols-3">
        <div>
          <label htmlFor="metode" className={KELAS_LABEL}>
            Metode pembayaran
          </label>
          <select id="metode" value={metode} onChange={(e) => setMetode(e.target.value)} className={KELAS_INPUT}>
            <option value="">Pilih metode</option>
            <option value="tunai">Tunai</option>
            <option value="transfer">Transfer bank</option>
            <option value="qris">QRIS</option>
          </select>
        </div>
        <div>
          <span className={KELAS_LABEL}>Nominal diterima</span>
          <p className="flex min-h-11 items-center rounded-lg border border-border bg-slate-50 px-3 text-sm font-semibold tabular-nums md:min-h-[42px]">{formatRupiah(biaya)}</p>
        </div>
        <div>
          <label htmlFor="pin" className={KELAS_LABEL}>
            PIN pengambilan (opsional)
          </label>
          <input
            id="pin"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="4 angka"
            className={cx(KELAS_INPUT, "tracking-[0.3em] tabular-nums")}
          />
        </div>
      </div>
      <p className="text-xs text-muted">Nominal sama dengan biaya akhir. Jika pelanggan membayar nominal lain, ubah biaya dulu beserta alasannya. Tanpa PIN, riwayat mencatat &quot;tanpa pencocokan PIN&quot;.</p>

      <div className="flex flex-col gap-2">
        <Button
          ikon="cash"
          className="self-start"
          disabled={kurang.length > 0 || tutup.memproses}
          aria-describedby={kurang.length ? "syarat-tutup" : undefined}
          onClick={() => {
            if (!window.confirm(`Terima pembayaran ${formatRupiah(biaya)} dan tutup tiket? Tiket yang ditutup tidak bisa diubah lagi.`)) return;
            tutup.jalankan(() => tutupTiket(tiketId, metode, pin));
          }}
        >
          {tutup.memproses ? "Menutup tiket…" : "Terima Pembayaran & Tutup Tiket"}
        </Button>
        {kurang.length > 0 && (
          <ul id="syarat-tutup" className="flex flex-col gap-1 text-[13px] text-muted">
            {kurang.map((k) => (
              <li key={k} className="flex items-start gap-1.5">
                <Ikon nama="info" className="mt-0.5 size-3.5" />
                {k}
              </li>
            ))}
          </ul>
        )}
        <PesanGagal id="galat-tutup" pesan={tutup.galat} />
      </div>
    </div>
  );
}

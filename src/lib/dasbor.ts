// Aturan Dasbor Iterasi 1 (issue #22, layar 01/01m): ringkasan kartu, tiket per status,
// dan Aktivitas Terbaru. Fungsi murni; pengambilan data ada di halaman.
import { formatRupiah, formatTanggal, formatTanggalWaktu, tanggalJakarta } from "@/lib/format";
import type { TiketDaftar } from "@/lib/tiket/daftar";
import { DAFTAR_STATUS, isAktif, STATUS, type KodeStatus } from "@/lib/tiket/status";
import { hariTerlambat } from "@/lib/tiket/terlambat";

export const MAKS_AKTIVITAS = 6;

/** Angka kartu Tiket Aktif, Tiket Terlambat, dan Siap Diambil. */
export function kartuDasbor(tiket: TiketDaftar[], hariIni: Date = new Date()) {
  const aktif = tiket.filter((t) => isAktif(t.status));
  const hari = tanggalJakarta(hariIni);
  return {
    aktif: aktif.length,
    masukHariIni: aktif.filter((t) => tanggalJakarta(t.created_at) === hari).length,
    terlambat: aktif.filter((t) => hariTerlambat(t, hariIni) > 0).length,
    siapDiambil: aktif.filter((t) => t.status === "siap_diambil").length,
  };
}

/** Jumlah per status aktif (urutan sesuai DAFTAR_STATUS) dan panjang batang relatif terhadap yang terbanyak. */
export function tiketPerStatus(tiket: Pick<TiketDaftar, "status">[]) {
  const daftar = DAFTAR_STATUS.filter(isAktif).map((status: KodeStatus) => ({ status, jumlah: tiket.filter((t) => t.status === status).length }));
  const maks = Math.max(1, ...daftar.map((d) => d.jumlah));
  return daftar.map((d) => ({ ...d, persen: Math.round((d.jumlah / maks) * 100) }));
}

// ---------------------------------------------------------------------------
// Aktivitas Terbaru
// ---------------------------------------------------------------------------

export type RiwayatAktivitas = {
  status: string;
  created_at: string;
  tiket_id: string;
  nomor_tiket: string;
  nama_pelanggan: string | null;
  perangkat: string | null;
};

export type TransaksiAktivitas = {
  nominal: number | string;
  created_at: string;
  tiket_id: string | null;
  nomor_tiket: string | null;
};

export type Aktivitas = {
  jenis: "tiket-baru" | "status" | "pembayaran";
  waktu: string;
  tiket_id: string | null;
  nomor_tiket: string | null;
  teks: string;
  status?: string;
};

/** Gabungkan riwayat status dan transaksi menjadi daftar aktivitas terbaru (maks. 6). */
export function susunAktivitas(riwayat: RiwayatAktivitas[], transaksi: TransaksiAktivitas[], maks = MAKS_AKTIVITAS): Aktivitas[] {
  const dariRiwayat: Aktivitas[] = riwayat.map((r) =>
    r.status === "diterima"
      ? {
          jenis: "tiket-baru",
          waktu: r.created_at,
          tiket_id: r.tiket_id,
          nomor_tiket: r.nomor_tiket,
          teks: `tiket baru${[r.nama_pelanggan, r.perangkat].some(Boolean) ? ` — ${[r.nama_pelanggan, r.perangkat].filter(Boolean).join(", ")}` : ""}`,
        }
      : {
          jenis: "status",
          waktu: r.created_at,
          tiket_id: r.tiket_id,
          nomor_tiket: r.nomor_tiket,
          status: r.status,
          teks: `status diperbarui ke ${STATUS[r.status as KodeStatus]?.label ?? r.status}`,
        },
  );
  const dariTransaksi: Aktivitas[] = transaksi.map((t) => ({
    jenis: "pembayaran",
    waktu: t.created_at,
    tiket_id: t.tiket_id,
    nomor_tiket: t.nomor_tiket,
    teks: `pembayaran ${formatRupiah(t.nominal)} dicatat${t.tiket_id ? ", unit diserahkan" : ""}`,
  }));
  return [...dariRiwayat, ...dariTransaksi].sort((a, b) => b.waktu.localeCompare(a.waktu)).slice(0, maks);
}

/** "Hari ini, 11.45", "Kemarin, 16.06", atau "19 Okt 2026, 09.30". */
export function labelWaktu(waktu: string, hariIni: Date = new Date()): string {
  const jam = formatTanggalWaktu(waktu).split(", ")[1];
  const hari = tanggalJakarta(hariIni);
  const tgl = tanggalJakarta(waktu);
  if (tgl === hari) return `Hari ini, ${jam}`;
  const kemarin = tanggalJakarta(new Date(Date.parse(`${hari}T12:00:00+07:00`) - 86_400_000));
  if (tgl === kemarin) return `Kemarin, ${jam}`;
  return `${formatTanggal(waktu)}, ${jam}`;
}

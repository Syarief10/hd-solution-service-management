// Pengambilan data untuk Daftar Tiket dan Dasbor (hanya membaca tabel `tiket`, K5).
import type { SupabaseClient } from "@supabase/supabase-js";

import type { TiketDaftar } from "./daftar";
import type { Database } from "@/types/database";

type Klien = SupabaseClient<Database>;

const KOLOM = `
  tiket_id, nomor_tiket, status, estimasi_selesai, estimasi_biaya, keputusan, created_at, closed_at,
  perangkat ( kategori, merk_tipe, serial_number, pelanggan ( nama, no_whatsapp ) ),
  riwayat_status ( status, created_at )
`;

/**
 * Semua tiket beserta data yang dibutuhkan daftar, prioritas, dan filter.
 * `hanyaAktif` membatasi ke tiket berstatus aktif (untuk dasbor).
 */
export async function ambilTiketDaftar(db: Klien, { hanyaAktif = false, statusAkhir = [] as string[] } = {}): Promise<TiketDaftar[]> {
  let kueri = db.from("tiket").select(KOLOM).order("created_at", { ascending: false });
  if (hanyaAktif && statusAkhir.length) kueri = kueri.not("status", "in", `(${statusAkhir.join(",")})`);
  const { data, error } = await kueri;
  if (error) throw new Error(error.message);

  return (data ?? []).map((t) => {
    const riwayat = [...t.riwayat_status].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const siap = riwayat.filter((r) => r.status === "siap_diambil").at(-1);
    return {
      tiket_id: t.tiket_id,
      nomor_tiket: t.nomor_tiket,
      status: t.status,
      estimasi_selesai: t.estimasi_selesai,
      estimasi_biaya: t.estimasi_biaya === null ? null : Number(t.estimasi_biaya),
      keputusan: t.keputusan,
      created_at: t.created_at,
      closed_at: t.closed_at,
      siap_sejak: siap?.created_at ?? null,
      status_sejak: riwayat.at(-1)?.created_at ?? t.created_at,
      nama_pelanggan: t.perangkat?.pelanggan?.nama ?? "—",
      no_whatsapp: t.perangkat?.pelanggan?.no_whatsapp ?? "",
      kategori: t.perangkat?.kategori ?? "",
      merk_tipe: t.perangkat?.merk_tipe ?? "",
      serial_number: t.perangkat?.serial_number ?? null,
    };
  });
}

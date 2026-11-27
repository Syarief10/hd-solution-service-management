// Penyimpanan tiket baru (issue #12, keputusan K14).
//
// Semua langkah dijalankan fungsi database `simpan_penerimaan` dalam SATU transaksi:
//   1. pelanggan dipakai ulang menurut nomor WhatsApp (nama lama tidak ditimpa);
//   2. perangkat dipakai ulang menurut jenis, merek/model, dan nomor seri;
//   3. kiriman ulang (Coba Lagi) untuk unit dan keluhan yang sama dalam 15 menit
//      mengembalikan tiket yang sudah ada, sehingga tidak ada tiket ganda;
//   4. kondisi fisik awal dan kelengkapan ikut tersimpan.
// Nomor tiket, token, PIN, status awal, dan riwayat pertama diisi database.
import type { SupabaseClient } from "@supabase/supabase-js";

import { gabungMerkTipe, namaItemKelengkapan, whatsAppDatabase, type DataPenerimaan } from "./skema";
import type { Database } from "@/types/database";

type Klien = SupabaseClient<Database>;

export type TiketTersimpan = {
  tiketId: string;
  nomorTiket: string;
  token: string;
  pin: string;
  dibuatPada: string;
  /** true jika tiket sudah ada dari kiriman sebelumnya (Coba Lagi). */
  ulang: boolean;
};

export class GagalSimpan extends Error {
  constructor(
    pesan: string,
    /** Kode galat Postgres/PostgREST, contoh "P0001" untuk pesan dari fungsi database. */
    readonly kode: string | null = null,
  ) {
    super(pesan);
  }
}

/** Argumen fungsi `simpan_penerimaan` dari data form yang sudah divalidasi. */
export function argumenPenerimaan(data: DataPenerimaan): Database["public"]["Functions"]["simpan_penerimaan"]["Args"] {
  return {
    p_nama: data.nama,
    p_whatsapp: data.whatsapp,
    p_kategori: data.jenis,
    p_merk_tipe: gabungMerkTipe(data.merek, data.model),
    p_serial: data.nomorSeri,
    p_keluhan: data.keluhan,
    p_kondisi_fisik: data.kondisiFisik,
    p_kelengkapan: data.kelengkapan.filter((k) => k.diserahkan).map((k) => namaItemKelengkapan(k.nama, k.keterangan)),
  };
}

type HasilFungsi = {
  tiket_id: string;
  nomor_tiket: string;
  tracking_token: string;
  pin_pengambilan: string;
  created_at: string;
  ulang: boolean;
};

export async function simpanPenerimaan(db: Klien, data: DataPenerimaan): Promise<TiketTersimpan> {
  const { data: hasil, error } = await db.rpc("simpan_penerimaan", argumenPenerimaan(data));
  if (error) throw new GagalSimpan(error.message, error.code ?? null);
  const t = hasil as HasilFungsi | null;
  if (!t?.tiket_id) throw new GagalSimpan("Fungsi simpan_penerimaan tidak mengembalikan tiket.");
  return {
    tiketId: t.tiket_id,
    nomorTiket: t.nomor_tiket,
    token: t.tracking_token,
    pin: t.pin_pengambilan,
    dibuatPada: t.created_at,
    ulang: Boolean(t.ulang),
  };
}

/** Nama pelanggan terdaftar untuk nomor WhatsApp tertentu (FR-PNR-13). Hanya membaca. */
export async function cariNamaPelanggan(db: Klien, whatsapp: string): Promise<string | null> {
  const hasil = await db.from("pelanggan").select("nama").eq("no_whatsapp", whatsAppDatabase(whatsapp)).maybeSingle();
  return hasil.error ? null : (hasil.data?.nama ?? null);
}

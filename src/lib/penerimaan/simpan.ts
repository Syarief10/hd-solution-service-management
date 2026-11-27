// Penyimpanan tiket baru (issue #12, keputusan K14).
//
// Belum ada fungsi database yang menyimpan semuanya dalam satu transaksi, jadi langkahnya:
//   1. pelanggan: cari berdasarkan nomor WhatsApp (unik), buat jika belum ada;
//   2. perangkat: pakai unit yang sama milik pelanggan itu (merk_tipe + nomor seri), buat jika belum ada;
//   3. tiket: jika unit itu sudah punya tiket "diterima" dengan keluhan sama dalam 15 menit terakhir,
//      anggap ini kiriman ulang (Coba Lagi) dan pakai tiket itu, bukan membuat tiket ganda;
//   4. kelengkapan: dibuat hanya jika tiket belum punya baris kelengkapan.
// Nomor tiket, token, PIN, status awal, dan riwayat pertama diisi trigger database.
// Fungsi ini hanya memakai tabel dan kolom yang sudah ada; skema tidak diubah.
import type { SupabaseClient } from "@supabase/supabase-js";

import { gabungMerkTipe, namaItemKelengkapan, whatsAppDatabase, type DataPenerimaan } from "./skema";
import type { Database } from "@/types/database";

type Klien = SupabaseClient<Database>;

export const JENDELA_ULANG_MENIT = 15;

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
    readonly tahap: "pelanggan" | "perangkat" | "tiket" | "kelengkapan",
    pesan: string,
  ) {
    super(pesan);
  }
}

async function pastikanPelanggan(db: Klien, nama: string, whatsapp: string): Promise<string> {
  const noWa = whatsAppDatabase(whatsapp);
  const ada = await db.from("pelanggan").select("pelanggan_id").eq("no_whatsapp", noWa).maybeSingle();
  if (ada.error) throw new GagalSimpan("pelanggan", ada.error.message);
  if (ada.data) return ada.data.pelanggan_id;

  const baru = await db.from("pelanggan").insert({ nama, no_whatsapp: noWa }).select("pelanggan_id").single();
  if (!baru.error) return baru.data.pelanggan_id;

  // 23505: nomor yang sama baru saja disimpan permintaan lain; ambil barisnya.
  if (baru.error.code === "23505") {
    const lagi = await db.from("pelanggan").select("pelanggan_id").eq("no_whatsapp", noWa).single();
    if (!lagi.error) return lagi.data.pelanggan_id;
  }
  throw new GagalSimpan("pelanggan", baru.error.message);
}

async function pastikanPerangkat(db: Klien, pelangganId: string, data: DataPenerimaan): Promise<string> {
  const merkTipe = gabungMerkTipe(data.merek, data.model);
  const ada = await db
    .from("perangkat")
    .select("perangkat_id")
    .eq("pelanggan_id", pelangganId)
    .eq("kategori", data.jenis)
    .eq("merk_tipe", merkTipe)
    .eq("serial_number", data.nomorSeri)
    .limit(1)
    .maybeSingle();
  if (ada.error) throw new GagalSimpan("perangkat", ada.error.message);
  if (ada.data) return ada.data.perangkat_id;

  const baru = await db
    .from("perangkat")
    .insert({ pelanggan_id: pelangganId, kategori: data.jenis, merk_tipe: merkTipe, serial_number: data.nomorSeri })
    .select("perangkat_id")
    .single();
  if (baru.error) throw new GagalSimpan("perangkat", baru.error.message);
  return baru.data.perangkat_id;
}

const KOLOM_TIKET = "tiket_id, nomor_tiket, tracking_token, pin_pengambilan, created_at" as const;

async function pastikanTiket(db: Klien, perangkatId: string, keluhan: string, sekarang: Date) {
  const batas = new Date(sekarang.getTime() - JENDELA_ULANG_MENIT * 60_000).toISOString();
  const ada = await db
    .from("tiket")
    .select(KOLOM_TIKET)
    .eq("perangkat_id", perangkatId)
    .eq("keluhan", keluhan)
    .eq("status", "diterima")
    .gte("created_at", batas)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ada.error) throw new GagalSimpan("tiket", ada.error.message);
  if (ada.data) return { baris: ada.data, ulang: true };

  const baru = await db.from("tiket").insert({ perangkat_id: perangkatId, keluhan }).select(KOLOM_TIKET).single();
  if (baru.error) throw new GagalSimpan("tiket", baru.error.message);
  return { baris: baru.data, ulang: false };
}

async function pastikanKelengkapan(db: Klien, tiketId: string, data: DataPenerimaan) {
  const item = data.kelengkapan
    .filter((k) => k.diserahkan)
    .map((k) => ({ tiket_id: tiketId, nama_item: namaItemKelengkapan(k.nama, k.keterangan), is_checked_in: true }));
  if (item.length === 0) return;

  const ada = await db.from("kelengkapan_unit").select("kelengkapan_id", { count: "exact", head: true }).eq("tiket_id", tiketId);
  if (ada.error) throw new GagalSimpan("kelengkapan", ada.error.message);
  if ((ada.count ?? 0) > 0) return;

  const hasil = await db.from("kelengkapan_unit").insert(item);
  if (hasil.error) throw new GagalSimpan("kelengkapan", hasil.error.message);
}

export async function simpanPenerimaan(db: Klien, data: DataPenerimaan, sekarang = new Date()): Promise<TiketTersimpan> {
  const pelangganId = await pastikanPelanggan(db, data.nama, data.whatsapp);
  const perangkatId = await pastikanPerangkat(db, pelangganId, data);
  const { baris, ulang } = await pastikanTiket(db, perangkatId, data.keluhan, sekarang);
  await pastikanKelengkapan(db, baris.tiket_id, data);
  return {
    tiketId: baris.tiket_id,
    nomorTiket: baris.nomor_tiket,
    token: baris.tracking_token,
    pin: baris.pin_pengambilan,
    dibuatPada: baris.created_at,
    ulang,
  };
}

/** Nama pelanggan terdaftar untuk nomor WhatsApp tertentu (FR-PNR-13). Hanya membaca. */
export async function cariNamaPelanggan(db: Klien, whatsapp: string): Promise<string | null> {
  const hasil = await db.from("pelanggan").select("nama").eq("no_whatsapp", whatsAppDatabase(whatsapp)).maybeSingle();
  return hasil.error ? null : (hasil.data?.nama ?? null);
}

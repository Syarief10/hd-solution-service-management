// Pengambilan transaksi untuk Rekap Pendapatan (layar 06) dan kartu pendapatan Dasbor. Hanya membaca.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { BarisTransaksi } from "@/lib/rekap";
import type { Database } from "@/types/database";

type Klien = SupabaseClient<Database>;

/** Transaksi dalam rentang tanggal (inklusif), diratakan untuk tabel, grafik, dan CSV. */
export async function ambilTransaksi(db: Klien, dari: string, sampai: string): Promise<BarisTransaksi[]> {
  const { data, error } = await db
    .from("transaksi")
    .select(
      `transaksi_id, tanggal, created_at, nominal, jenis, metode, keterangan, tiket_id,
       tiket ( nomor_tiket, keluhan, perangkat ( pelanggan ( nama ) ) )`,
    )
    .gte("tanggal", dari)
    .lte("tanggal", sampai)
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => ({
    transaksi_id: t.transaksi_id,
    tanggal: t.tanggal,
    created_at: t.created_at,
    nominal: Number(t.nominal),
    jenis: t.jenis,
    metode: t.metode,
    keterangan: t.keterangan ?? t.tiket?.keluhan ?? null,
    tiket_id: t.tiket_id,
    nomor_tiket: t.tiket?.nomor_tiket ?? null,
    nama_pelanggan: t.tiket?.perangkat?.pelanggan?.nama ?? null,
  }));
}

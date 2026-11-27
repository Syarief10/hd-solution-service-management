"use server";

import { cariNamaPelanggan, GagalSimpan, simpanPenerimaan, type TiketTersimpan } from "@/lib/penerimaan/simpan";
import { digitWhatsApp, validasiPenerimaan, type KesalahanPenerimaan } from "@/lib/penerimaan/skema";
import { createClient } from "@/lib/supabase/server";

const KETERANGAN_KONEKSI = "Semua isian Anda tetap ada di formulir ini. Periksa koneksi internet, lalu coba lagi.";

export type HasilSimpan =
  | { status: "berhasil"; tiket: TiketTersimpan }
  | { status: "tidak-valid"; kesalahan: KesalahanPenerimaan }
  | { status: "gagal"; pesan: string; keterangan: string };

/** Simpan tiket baru. Validasi diulang di server dengan skema yang sama seperti di form. */
export async function simpanTiket(isian: unknown): Promise<HasilSimpan> {
  const hasil = validasiPenerimaan(isian);
  if (!hasil.ok) return { status: "tidak-valid", kesalahan: hasil.kesalahan };

  const db = await createClient();
  const { data: sesi } = await db.auth.getClaims();
  if (!sesi?.claims) {
    return {
      status: "gagal",
      pesan: "Tiket belum tersimpan — sesi login berakhir",
      keterangan: "Masuk lagi di tab baru, lalu kembali ke sini dan tekan Coba Lagi. Semua isian tetap ada.",
    };
  }

  try {
    const tiket = await simpanPenerimaan(db, hasil.data);
    return { status: "berhasil", tiket };
  } catch (e) {
    // Dicatat tanpa data pelanggan (nama, nomor WA tidak ditulis ke log).
    const kode = e instanceof GagalSimpan ? e.kode : null;
    console.error(`[penerimaan] gagal menyimpan: ${kode ?? "-"} ${e instanceof Error ? e.message : String(e)}`);
    // P0001: penolakan aturan dari fungsi database, pesannya sudah ramah pengguna.
    if (kode === "P0001" && e instanceof Error) {
      return { status: "gagal", pesan: `Tiket belum tersimpan — ${e.message}`, keterangan: "Semua isian Anda tetap ada di formulir ini. Perbaiki isian, lalu coba lagi." };
    }
    return { status: "gagal", pesan: "Tiket belum tersimpan — koneksi ke server terputus", keterangan: KETERANGAN_KONEKSI };
  }
}

/** Saran nama jika nomor WhatsApp sudah terdaftar (FR-PNR-13). Hanya membaca. */
export async function cekPelanggan(whatsapp: string): Promise<string | null> {
  if (!/^0[0-9]{9,12}$/.test(digitWhatsApp(whatsapp))) return null;
  const db = await createClient();
  return cariNamaPelanggan(db, whatsapp);
}

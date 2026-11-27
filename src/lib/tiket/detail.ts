// Data dan aturan tampilan Detail Tiket (issue #16–#21). Hanya membaca; mutasi ada di server action.
import type { SupabaseClient } from "@supabase/supabase-js";

import { isAktif, TAHAP_LINTASAN, tahapDariStatus, type TahapLintasan } from "./status";
import type { Database } from "@/types/database";

type Klien = SupabaseClient<Database>;

export const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KOLOM = `
  tiket_id, nomor_tiket, tracking_token, pin_pengambilan, keluhan, biaya, estimasi_selesai, status,
  created_at, closed_at, token_berakhir, diagnosis, estimasi_biaya, keputusan, keputusan_cara,
  keputusan_alasan, keputusan_at,
  perangkat ( kategori, merk_tipe, warna, serial_number, pelanggan ( nama, no_whatsapp ) ),
  kelengkapan_unit ( kelengkapan_id, nama_item, is_checked_in, is_checked_out ),
  riwayat_status ( riwayat_id, status, catatan_teknis, created_at ),
  transaksi ( transaksi_id, jenis, metode, nominal, tanggal, created_at )
`;

export async function ambilDetailTiket(db: Klien, tiketId: string) {
  if (!POLA_UUID.test(tiketId)) return null;
  const { data, error } = await db.from("tiket").select(KOLOM).eq("tiket_id", tiketId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const riwayat = [...data.riwayat_status].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return { ...data, riwayat_status: riwayat };
}

export type DetailTiket = NonNullable<Awaited<ReturnType<typeof ambilDetailTiket>>>;

/** Waktu perubahan terakhir menurut riwayat (atau waktu diterima). */
export function pembaruanTerakhir(t: Pick<DetailTiket, "riwayat_status" | "created_at">): string {
  return t.riwayat_status.at(-1)?.created_at ?? t.created_at;
}

/** Waktu diagnosis = pertama kali tiket masuk status Pemeriksaan. */
export function waktuDiagnosis(t: Pick<DetailTiket, "riwayat_status">): string | null {
  return t.riwayat_status.find((r) => r.status === "didiagnosis")?.created_at ?? null;
}

export type LangkahLintasan = {
  tahap: TahapLintasan;
  keadaan: "selesai" | "sekarang" | "belum";
  waktu: string | null;
  /** Keterangan kecil, contoh "Termasuk tunggu komponen". */
  catatan: string | null;
};

/**
 * Lintasan 6 tahap untuk header Detail Tiket (perancangan §3.3).
 * Waktu tiap tahap diambil dari kali pertama tahap itu dicapai di riwayat.
 */
export function susunLintasan(t: Pick<DetailTiket, "status" | "riwayat_status">): LangkahLintasan[] {
  const posisiSekarang = TAHAP_LINTASAN.indexOf(tahapDariStatus(t.status) ?? "diterima");
  const tertutup = !isAktif(t.status);
  const tungguKomponen = t.riwayat_status.find((r) => r.status === "menunggu_part");

  return TAHAP_LINTASAN.map((tahap, i) => {
    const pertama = t.riwayat_status.find((r) => tahapDariStatus(r.status) === tahap);
    let keadaan: LangkahLintasan["keadaan"] = i < posisiSekarang ? "selesai" : i === posisiSekarang ? "sekarang" : "belum";
    if (tertutup && i <= posisiSekarang) keadaan = "selesai";
    if (t.status === "dibatalkan") keadaan = pertama ? "selesai" : "belum";
    const catatan = tahap === "dikerjakan" && tungguKomponen ? "Termasuk tunggu komponen" : null;
    return { tahap, keadaan, waktu: keadaan === "belum" ? null : (pertama?.created_at ?? null), catatan };
  });
}

/** Nomor tahap sekarang (1–6) untuk "Tahap n dari 6" di mobile. */
export function nomorTahap(status: string): number {
  return TAHAP_LINTASAN.indexOf(tahapDariStatus(status) ?? "diterima") + 1;
}

/** Syarat tombol "Terima Pembayaran & Tutup Tiket" (K3, sama dengan fungsi tutup_tiket). */
export function syaratTutupTiket(t: {
  status: string;
  keputusan: string;
  biaya: number;
  kelengkapan: { is_checked_in: boolean; is_checked_out: boolean }[];
  metode: string;
}): string[] {
  const kurang: string[] = [];
  if (t.status !== "siap_diambil") kurang.push("Status tiket harus Siap Diambil.");
  if (t.keputusan === "ditolak") kurang.push("Estimasi ditolak: akhiri tiket sebagai Dikembalikan lewat Perbarui Status.");
  if (!(t.biaya > 0)) kurang.push("Biaya akhir belum diisi.");
  if (!["tunai", "transfer", "qris"].includes(t.metode)) kurang.push("Pilih metode pembayaran.");
  if (t.kelengkapan.some((k) => k.is_checked_in && !k.is_checked_out)) kurang.push("Centang semua kelengkapan yang diserahkan kembali.");
  return kurang;
}

/** Tab Detail Tiket dan slug URL-nya (`?tab=`). */
export const TAB_DETAIL = [
  { slug: "informasi", label: "Informasi Unit", labelPendek: "Informasi" },
  { slug: "progres", label: "Progres & Pemeriksaan", labelPendek: "Progres" },
  { slug: "estimasi", label: "Estimasi & Persetujuan", labelPendek: "Estimasi" },
  { slug: "komponen", label: "Komponen & Garansi", labelPendek: "Komponen" },
  { slug: "transaksi", label: "Transaksi & Pengambilan", labelPendek: "Transaksi" },
] as const;

export type SlugTab = (typeof TAB_DETAIL)[number]["slug"];

export function tabAktif(nilai: string | string[] | undefined): SlugTab {
  const v = Array.isArray(nilai) ? nilai[0] : nilai;
  return TAB_DETAIL.find((t) => t.slug === v)?.slug ?? "informasi";
}

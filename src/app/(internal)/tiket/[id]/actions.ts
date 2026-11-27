"use server";

// Mutasi Detail Tiket (issue #17, #19, #20). Hanya memakai kolom dan fungsi yang sudah ada di skema;
// aturan bisnis tetap dijaga trigger database, aplikasi memeriksa lebih awal agar pesannya ramah.
import { z } from "zod";

import { POLA_UUID } from "@/lib/tiket/detail";
import { isAktif } from "@/lib/tiket/status";
import { createClient } from "@/lib/supabase/server";

export type HasilAksi = { ok: true; pesan?: string } | { ok: false; pesan: string };

const GAGAL_UMUM = "Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.";

/** Pesan dari `raise exception` di trigger/fungsi database (kode P0001) sudah ramah pengguna. */
function pesanDatabase(error: { code?: string; message: string } | null): string {
  if (error?.code === "P0001" && error.message) return error.message;
  return GAGAL_UMUM;
}

async function siapkan(tiketId: string) {
  if (!POLA_UUID.test(tiketId)) return { gagal: "Tiket tidak ditemukan." } as const;
  const db = await createClient();
  const { data: sesi } = await db.auth.getClaims();
  if (!sesi?.claims) return { gagal: "Sesi login berakhir. Silakan masuk lagi." } as const;
  const { data: t, error } = await db
    .from("tiket")
    .select("status, keputusan, estimasi_biaya, biaya")
    .eq("tiket_id", tiketId)
    .maybeSingle();
  if (error) return { gagal: GAGAL_UMUM } as const;
  if (!t) return { gagal: "Tiket tidak ditemukan." } as const;
  if (!isAktif(t.status)) return { gagal: "Tiket sudah ditutup dan tidak bisa diubah." } as const;
  return { db, t } as const;
}

function catat(aksi: string, error: { code?: string; message: string }) {
  console.error(`[detail-tiket] ${aksi} gagal: ${error.code ?? "-"} ${error.message}`);
}

// ---------------------------------------------------------------------------
// Progres & Pemeriksaan
// ---------------------------------------------------------------------------

export async function simpanDiagnosis(tiketId: string, diagnosis: string): Promise<HasilAksi> {
  const isi = z.string().trim().max(2000, "Maksimal 2000 karakter.").safeParse(diagnosis);
  if (!isi.success) return { ok: false, pesan: isi.error.issues[0].message };
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  const { error } = await s.db.from("tiket").update({ diagnosis: isi.data || null }).eq("tiket_id", tiketId);
  if (error) {
    catat("simpan diagnosis", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, pesan: "Hasil diagnosis tersimpan" };
}

// ---------------------------------------------------------------------------
// Estimasi & Persetujuan (K4)
// ---------------------------------------------------------------------------

const skemaEstimasi = z.object({
  biaya: z.number({ error: "Isi total estimasi." }).int("Gunakan rupiah tanpa sen.").min(0, "Tidak boleh negatif.").max(1_000_000_000, "Nominal terlalu besar."),
  selesai: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.")]),
});

export async function simpanEstimasi(tiketId: string, isian: z.input<typeof skemaEstimasi>): Promise<HasilAksi> {
  const isi = skemaEstimasi.safeParse(isian);
  if (!isi.success) return { ok: false, pesan: isi.error.issues[0].message };
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  if (s.t.keputusan !== "menunggu") return { ok: false, pesan: "Estimasi sudah diputuskan pelanggan. Buka ulang keputusan untuk mengubahnya." };
  const { error } = await s.db
    .from("tiket")
    .update({ estimasi_biaya: isi.data.biaya, estimasi_selesai: isi.data.selesai || null })
    .eq("tiket_id", tiketId);
  if (error) {
    catat("simpan estimasi", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, pesan: "Estimasi tersimpan" };
}

const skemaKeputusan = z
  .object({
    keputusan: z.enum(["disetujui", "ditolak"]),
    cara: z.enum(["whatsapp", "telepon", "datang"], { error: "Pilih cara konfirmasi." }),
    /** Dari <input type="datetime-local">, dibaca sebagai waktu WIB. */
    waktu: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Isi waktu konfirmasi."),
    alasan: z.string().trim().max(500, "Maksimal 500 karakter."),
  })
  .refine((v) => v.keputusan !== "ditolak" || v.alasan.length > 0, { message: "Alasan penolakan wajib diisi.", path: ["alasan"] });

export async function catatKeputusan(tiketId: string, isian: z.input<typeof skemaKeputusan>): Promise<HasilAksi> {
  const isi = skemaKeputusan.safeParse(isian);
  if (!isi.success) return { ok: false, pesan: isi.error.issues[0].message };
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  if (s.t.estimasi_biaya === null) return { ok: false, pesan: "Isi estimasi terlebih dahulu sebelum mencatat keputusan." };
  const waktu = new Date(`${isi.data.waktu}:00+07:00`);
  if (Number.isNaN(waktu.getTime()) || waktu.getTime() > Date.now() + 5 * 60_000) return { ok: false, pesan: "Waktu konfirmasi tidak boleh di masa depan." };

  const { error } = await s.db
    .from("tiket")
    .update({
      keputusan: isi.data.keputusan,
      keputusan_cara: isi.data.cara,
      keputusan_at: waktu.toISOString(),
      keputusan_alasan: isi.data.keputusan === "ditolak" ? isi.data.alasan : null,
    })
    .eq("tiket_id", tiketId);
  if (error) {
    catat("catat keputusan", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, pesan: isi.data.keputusan === "disetujui" ? "Estimasi dicatat disetujui" : "Estimasi dicatat ditolak" };
}

/** Kembalikan keputusan ke Menunggu, hanya selama pekerjaan belum dimulai. */
export async function bukaUlangKeputusan(tiketId: string): Promise<HasilAksi> {
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  if (!["diterima", "didiagnosis"].includes(s.t.status)) {
    return { ok: false, pesan: "Keputusan tidak bisa dibuka ulang karena pekerjaan sudah berjalan." };
  }
  const { error } = await s.db
    .from("tiket")
    .update({ keputusan: "menunggu", keputusan_cara: null, keputusan_at: null, keputusan_alasan: null })
    .eq("tiket_id", tiketId);
  if (error) {
    catat("buka ulang keputusan", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, pesan: "Keputusan dibuka ulang" };
}

// ---------------------------------------------------------------------------
// Transaksi & Pengambilan (K3)
// ---------------------------------------------------------------------------

export async function ubahBiaya(tiketId: string, biaya: number, alasan: string): Promise<HasilAksi> {
  const isi = z
    .object({
      biaya: z.number().int("Gunakan rupiah tanpa sen.").min(0, "Tidak boleh negatif.").max(1_000_000_000, "Nominal terlalu besar."),
      alasan: z.string().trim().min(3, "Alasan perubahan biaya wajib diisi.").max(300, "Maksimal 300 karakter."),
    })
    .safeParse({ biaya, alasan });
  if (!isi.success) return { ok: false, pesan: isi.error.issues[0].message };
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  const { error } = await s.db.rpc("ubah_biaya", { p_tiket_id: tiketId, p_biaya_baru: isi.data.biaya, p_alasan: isi.data.alasan });
  if (error) {
    catat("ubah biaya", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, pesan: "Biaya diperbarui" };
}

export async function tandaiKelengkapan(tiketId: string, kelengkapanId: string, kembali: boolean): Promise<HasilAksi> {
  if (!POLA_UUID.test(kelengkapanId)) return { ok: false, pesan: "Item tidak ditemukan." };
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  const { error } = await s.db
    .from("kelengkapan_unit")
    .update({ is_checked_out: kembali })
    .eq("kelengkapan_id", kelengkapanId)
    .eq("tiket_id", tiketId);
  if (error) {
    catat("tandai kelengkapan", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true };
}

export async function tutupTiket(tiketId: string, metode: string, pin: string): Promise<HasilAksi> {
  const isi = z
    .object({
      metode: z.enum(["tunai", "transfer", "qris"], { error: "Pilih metode pembayaran." }),
      pin: z.union([z.literal(""), z.string().regex(/^\d{4}$/, "PIN terdiri dari 4 angka.")]),
    })
    .safeParse({ metode, pin: pin.trim() });
  if (!isi.success) return { ok: false, pesan: isi.error.issues[0].message };
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  const { error } = await s.db.rpc("tutup_tiket", {
    p_tiket_id: tiketId,
    p_metode: isi.data.metode,
    ...(isi.data.pin ? { p_pin: isi.data.pin } : {}),
  });
  if (error) {
    catat("tutup tiket", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, pesan: "Pembayaran tercatat dan tiket ditutup" };
}

// ---------------------------------------------------------------------------
// Informasi Unit (K2)
// ---------------------------------------------------------------------------

/** Ganti token link status dan PIN, misalnya jika link bocor. Link lama langsung tidak berlaku. */
export async function buatUlangAkses(tiketId: string): Promise<HasilAksi> {
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  const { error } = await s.db.rpc("buat_ulang_akses_portal", { p_tiket_id: tiketId });
  if (error) {
    catat("buat ulang akses", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, pesan: "Link status dan PIN baru dibuat" };
}

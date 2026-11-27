"use server";

// Mutasi Detail Tiket (issue #17, #19, #20). Aturan bisnis dijaga trigger database;
// aplikasi memeriksa lebih awal agar pesannya ramah.
import { z } from "zod";

import { POLA_UUID } from "@/lib/tiket/detail";
import { skemaCatatan, skemaRincian, type IsianRincian } from "@/lib/tiket/estimasi";
import { butuhBiaya, susunCatatan, validasiIsianStatus, type IsianStatus } from "@/lib/tiket/perbarui";
import { DAFTAR_STATUS, isAktif } from "@/lib/tiket/status";
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

/** Tambah catatan pengerjaan bertanggal tanpa mengubah status (K7). Waktu diisi database. */
export async function tambahCatatan(tiketId: string, isi: string): Promise<HasilAksi> {
  const catatan = skemaCatatan.safeParse(isi);
  if (!catatan.success) return { ok: false, pesan: catatan.error.issues[0].message };
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  const { error } = await s.db.from("catatan_pengerjaan").insert({ tiket_id: tiketId, isi: catatan.data });
  if (error) {
    catat("tambah catatan", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, pesan: "Catatan tersimpan" };
}

// ---------------------------------------------------------------------------
// Estimasi & Persetujuan (K4)
// ---------------------------------------------------------------------------

const skemaEstimasi = z.object({
  /** null jika total mengikuti rincian (atau belum diisi). */
  biaya: z.number().int("Gunakan rupiah tanpa sen.").min(0, "Tidak boleh negatif.").max(1_000_000_000, "Nominal terlalu besar.").nullable(),
  selesai: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.")]),
});

export async function simpanEstimasi(tiketId: string, isian: z.input<typeof skemaEstimasi>): Promise<HasilAksi> {
  const isi = skemaEstimasi.safeParse(isian);
  if (!isi.success) return { ok: false, pesan: isi.error.issues[0].message };
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  if (s.t.keputusan !== "menunggu") return { ok: false, pesan: SUDAH_DIPUTUSKAN };

  // Jika ada rincian, total dihitung database dari barisnya; hanya tanggal yang disimpan di sini.
  const rincian = await s.db.from("rincian_estimasi").select("rincian_id", { count: "exact", head: true }).eq("tiket_id", tiketId);
  if (rincian.error) {
    catat("cek rincian estimasi", rincian.error);
    return { ok: false, pesan: GAGAL_UMUM };
  }
  const adaRincian = (rincian.count ?? 0) > 0;
  if (!adaRincian && isi.data.biaya === null) return { ok: false, pesan: "Isi total estimasi atau tambahkan rincian." };

  const { error } = await s.db
    .from("tiket")
    .update(adaRincian ? { estimasi_selesai: isi.data.selesai || null } : { estimasi_biaya: isi.data.biaya, estimasi_selesai: isi.data.selesai || null })
    .eq("tiket_id", tiketId);
  if (error) {
    catat("simpan estimasi", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, pesan: "Estimasi tersimpan" };
}

const SUDAH_DIPUTUSKAN = "Estimasi sudah diputuskan pelanggan. Buka ulang keputusan untuk mengubahnya.";

/** Tambah satu baris rincian estimasi. Total estimasi diperbarui database. */
export async function tambahRincian(tiketId: string, isian: IsianRincian): Promise<HasilAksi> {
  const isi = skemaRincian.safeParse(isian);
  if (!isi.success) return { ok: false, pesan: isi.error.issues[0].message };
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  if (s.t.keputusan !== "menunggu") return { ok: false, pesan: SUDAH_DIPUTUSKAN };
  const { error } = await s.db.from("rincian_estimasi").insert({ tiket_id: tiketId, ...isi.data });
  if (error) {
    catat("tambah rincian estimasi", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, pesan: "Rincian ditambahkan" };
}

/** Hapus satu baris rincian. Menghapus baris terakhir mengosongkan total estimasi. */
export async function hapusRincian(tiketId: string, rincianId: string): Promise<HasilAksi> {
  if (!POLA_UUID.test(rincianId)) return { ok: false, pesan: "Rincian tidak ditemukan." };
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };
  if (s.t.keputusan !== "menunggu") return { ok: false, pesan: SUDAH_DIPUTUSKAN };
  const { error } = await s.db.from("rincian_estimasi").delete().eq("rincian_id", rincianId).eq("tiket_id", tiketId);
  if (error) {
    catat("hapus rincian estimasi", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, pesan: "Rincian dihapus" };
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
// Perbarui Status (#18, K1, K13)
// ---------------------------------------------------------------------------

const skemaStatus = z.object({
  ke: z.enum(DAFTAR_STATUS),
  catatan: z.string().max(1000, "Catatan maksimal 1000 karakter."),
  biaya: z.number().int("Gunakan rupiah tanpa sen.").min(0).max(1_000_000_000, "Nominal terlalu besar."),
  pengujianLolos: z.boolean(),
  komponen: z.string().max(120, "Nama komponen maksimal 120 karakter."),
  perkiraanTiba: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.")]),
});

export async function perbaruiStatus(tiketId: string, isian: IsianStatus): Promise<HasilAksi & { ke?: string }> {
  const isi = skemaStatus.safeParse(isian);
  if (!isi.success) return { ok: false, pesan: isi.error.issues[0].message };
  const s = await siapkan(tiketId);
  if ("gagal" in s) return { ok: false, pesan: s.gagal! };

  // Aturan yang sama dengan dialog dan trigger database, dicek ulang dengan data terbaru.
  const kesalahan = validasiIsianStatus(s.t, isi.data);
  if (kesalahan.length) return { ok: false, pesan: kesalahan[0] };

  // Biaya akhir ditetapkan dulu (lewat ubah_biaya agar tercatat di riwayat), karena trigger
  // mewajibkan biaya > 0 saat status berpindah ke Siap Diambil.
  if (butuhBiaya(s.t.status, isi.data.ke) && isi.data.biaya !== Number(s.t.biaya)) {
    const { error } = await s.db.rpc("ubah_biaya", { p_tiket_id: tiketId, p_biaya_baru: isi.data.biaya, p_alasan: "Biaya akhir ditetapkan saat Siap Diambil" });
    if (error) {
      catat("tetapkan biaya akhir", error);
      return { ok: false, pesan: pesanDatabase(error) };
    }
  }

  const { error } = await s.db.rpc("perbarui_status", { p_tiket_id: tiketId, p_status: isi.data.ke, p_catatan: susunCatatan(isi.data) || undefined });
  if (error) {
    catat("perbarui status", error);
    return { ok: false, pesan: pesanDatabase(error) };
  }
  return { ok: true, ke: isi.data.ke };
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

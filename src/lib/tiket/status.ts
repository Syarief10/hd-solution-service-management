// Modul status tiket (issue #9, keputusan K1).
// Kode status mengikuti constraint `tiket.status` di database; aturan transisi di sini
// sama persis dengan fungsi `transisi_status_diizinkan()` dan trigger `trg_tiket_validasi_status`.
// Komponen UI mengambil label, warna, dan ikon dari modul ini, tidak menulis string status sendiri.
import type { TampilanStatus } from "@/components/ui";

export const DAFTAR_STATUS = [
  "diterima",
  "didiagnosis",
  "menunggu_part",
  "dikerjakan",
  "pengujian",
  "siap_diambil",
  "selesai",
  "dikembalikan",
  "dibatalkan",
] as const;

export type KodeStatus = (typeof DAFTAR_STATUS)[number];
export type Keputusan = "menunggu" | "disetujui" | "ditolak";

type InfoStatus = TampilanStatus & { labelPelanggan: string; akhir: boolean };

export const STATUS: Record<KodeStatus, InfoStatus> = {
  diterima: { label: "Diterima", labelPelanggan: "Diterima", latar: "#EEF2F6", teks: "#334155", ikon: "inbox", akhir: false },
  didiagnosis: { label: "Pemeriksaan", labelPelanggan: "Pemeriksaan", latar: "#EDE9FE", teks: "#5B21B6", ikon: "search", akhir: false },
  menunggu_part: { label: "Menunggu Komponen", labelPelanggan: "Menunggu Komponen", latar: "#FFEDD5", teks: "#9A3412", ikon: "truck", akhir: false },
  dikerjakan: { label: "Dikerjakan", labelPelanggan: "Dikerjakan", latar: "#DBEAFE", teks: "#1E40AF", ikon: "wrench", akhir: false },
  pengujian: { label: "Pengujian", labelPelanggan: "Sedang Diuji", latar: "#CFFAFE", teks: "#155E75", ikon: "pulse", akhir: false },
  siap_diambil: { label: "Siap Diambil", labelPelanggan: "Siap Diambil", latar: "#CCFBF1", teks: "#115E59", ikon: "box", akhir: false },
  selesai: { label: "Selesai", labelPelanggan: "Selesai", latar: "#E2E8F0", teks: "#334155", ikon: "checkCircle", akhir: true },
  dikembalikan: { label: "Dikembalikan", labelPelanggan: "Dikembalikan", latar: "#FFE4E6", teks: "#9F1239", ikon: "undo", akhir: true },
  dibatalkan: { label: "Dibatalkan", labelPelanggan: "Dibatalkan", latar: "#F1F5F9", teks: "#475569", ikon: "xCircle", akhir: true },
};

export const STATUS_AKHIR: KodeStatus[] = DAFTAR_STATUS.filter((s) => STATUS[s].akhir);

export function adalahStatus(nilai: string): nilai is KodeStatus {
  return (DAFTAR_STATUS as readonly string[]).includes(nilai);
}

/** Data tampilan lencana. Kode tak dikenal ditampilkan apa adanya dengan gaya netral. */
export function tampilanStatus(kode: string): TampilanStatus {
  if (adalahStatus(kode)) return STATUS[kode];
  return { label: kode, latar: "#F1F5F9", teks: "#475569", ikon: "info" };
}

export function isAktif(kode: string): boolean {
  return adalahStatus(kode) && !STATUS[kode].akhir;
}

/** "Menunggu Persetujuan" bukan status: Pemeriksaan + estimasi terisi + keputusan masih menunggu (K1). */
export function menungguPersetujuan(t: { status: string; estimasi_biaya: number | null; keputusan: string }): boolean {
  return t.status === "didiagnosis" && t.estimasi_biaya !== null && t.keputusan === "menunggu";
}

// ---------------------------------------------------------------------------
// Transisi (sama dengan transisi_status_diizinkan() di database)
// ---------------------------------------------------------------------------

const TRANSISI: Partial<Record<KodeStatus, KodeStatus[]>> = {
  diterima: ["didiagnosis"],
  didiagnosis: ["dikerjakan", "menunggu_part", "siap_diambil"],
  menunggu_part: ["dikerjakan"],
  dikerjakan: ["pengujian", "menunggu_part"],
  pengujian: ["siap_diambil", "dikerjakan", "menunggu_part"],
  siap_diambil: ["selesai", "dikembalikan"],
};

/** Status tujuan yang diizinkan database dari status `dari`, termasuk `dibatalkan` untuk status aktif. */
export function transisiDiizinkan(dari: string): KodeStatus[] {
  if (!isAktif(dari)) return [];
  return [...(TRANSISI[dari as KodeStatus] ?? []), "dibatalkan"];
}

/** Label pilihan di dialog Perbarui Status (perancangan §3.2). */
export function labelPilihan(dari: string, ke: KodeStatus): string | null {
  if (ke === "dibatalkan") return null;
  if (dari === "pengujian" && ke === "dikerjakan") return "Jika pengujian gagal";
  if (ke === "menunggu_part" && dari !== "didiagnosis") return "Butuh komponen tambahan";
  if (dari === "didiagnosis" && ke === "siap_diambil") return "Estimasi ditolak · tanpa perbaikan";
  if (dari === "siap_diambil" && ke === "dikembalikan") return "Estimasi ditolak";
  return "Tahap berikutnya";
}

export type DataTransisi = {
  keputusan: Keputusan | string;
  /** Biaya akhir (tiket.biaya) setelah perubahan di dialog. */
  biaya: number;
  catatan: string;
  /** Centang "Hasil pengujian lolos" (hanya ke Siap Diambil dari Pengujian). */
  pengujianLolos?: boolean;
};

/** Informasi wajib per tujuan, untuk ditampilkan di dialog sebelum disimpan. */
export function infoWajib(dari: string, ke: KodeStatus): string[] {
  const info: string[] = [];
  if (ke === "dikerjakan") info.push("Keputusan estimasi sudah Disetujui");
  if (ke === "siap_diambil") {
    if (dari === "pengujian") info.push("Hasil pengujian lolos", "Total biaya akhir lebih dari Rp 0");
    if (dari === "didiagnosis") info.push("Keputusan estimasi Ditolak beserta alasannya");
    info.push("Catatan");
  }
  if (ke === "dikembalikan") info.push("Keputusan estimasi Ditolak");
  if (ke === "dibatalkan") info.push("Alasan pembatalan");
  if (ke === "selesai") info.push("Lewat tombol Terima Pembayaran & Tutup Tiket");
  return info;
}

/**
 * Daftar kesalahan jika transisi `dari` → `ke` tidak boleh dilakukan.
 * Aturannya sama dengan trigger database, supaya pesan muncul sebelum menyimpan.
 */
export function validasiTransisi(dari: string, ke: string, data: DataTransisi): string[] {
  if (!adalahStatus(ke)) return ["Status tujuan tidak dikenal."];
  if (!isAktif(dari)) return ["Tiket sudah ditutup dan tidak bisa diperbarui."];
  if (!transisiDiizinkan(dari).includes(ke)) return [`Perpindahan dari ${tampilanStatus(dari).label} ke ${STATUS[ke].label} tidak diizinkan.`];

  const k: string[] = [];
  const catatan = data.catatan.trim();
  if (ke === "selesai") k.push("Tiket diselesaikan lewat tombol Terima Pembayaran & Tutup Tiket.");
  if (ke === "dikerjakan" && data.keputusan !== "disetujui") k.push("Pekerjaan belum boleh dimulai: pelanggan belum menyetujui estimasi.");
  if (ke === "siap_diambil") {
    if (dari === "didiagnosis" && data.keputusan !== "ditolak") k.push("Dari Pemeriksaan langsung ke Siap Diambil hanya untuk estimasi yang ditolak.");
    if (dari === "pengujian" && !data.pengujianLolos) k.push("Centang hasil pengujian lolos.");
    if (data.keputusan !== "ditolak" && !(data.biaya > 0)) k.push("Total biaya akhir wajib diisi dan lebih dari Rp 0.");
    if (!catatan) k.push("Catatan wajib diisi sebelum status Siap Diambil.");
  }
  if (ke === "dikembalikan" && data.keputusan !== "ditolak") k.push("Status Dikembalikan hanya untuk estimasi yang ditolak pelanggan.");
  if (ke === "dibatalkan" && !catatan) k.push("Alasan pembatalan wajib diisi.");
  return k;
}

// ---------------------------------------------------------------------------
// Lintasan 6 tahap (perancangan §3.3)
// ---------------------------------------------------------------------------

export const TAHAP_LINTASAN = ["diterima", "didiagnosis", "dikerjakan", "pengujian", "siap_diambil", "selesai"] as const;
export type TahapLintasan = (typeof TAHAP_LINTASAN)[number];

/** Tahap lintasan untuk sebuah status. Menunggu Komponen digabung ke Dikerjakan. */
export function tahapDariStatus(kode: string): TahapLintasan | null {
  if (kode === "menunggu_part") return "dikerjakan";
  if (kode === "dikembalikan") return "selesai";
  return (TAHAP_LINTASAN as readonly string[]).includes(kode) ? (kode as TahapLintasan) : null;
}

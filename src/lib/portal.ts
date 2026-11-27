// Halaman pelanggan tanpa login (07 Cek Status, 08 Detail Progres; K2, FR-PLG-01..06).
// Data hanya dari fungsi database `portal_ambil_tiket(token)`, yang sudah menyamarkan nama,
// menyensor WhatsApp, tidak mengembalikan PIN/alamat, dan memberi jawaban kosong yang sama untuk
// token salah, kedaluwarsa, atau tidak ada. Modul ini hanya membaca dan menyusun tampilannya.
import { z } from "zod";

import { formatRupiah, formatTanggal } from "@/lib/format";
import { adalahStatus, STATUS, TAHAP_LINTASAN, tahapDariStatus, tampilanStatus, type KodeStatus, type TahapLintasan } from "@/lib/tiket/status";

const angka = z.union([z.number(), z.string()]).transform(Number);

export const skemaPortal = z.object({
  nomor_tiket: z.string(),
  status: z.string(),
  nama_pelanggan: z.string().nullable(),
  no_whatsapp: z.string().nullable(),
  kategori: z.string().nullable(),
  merk_tipe: z.string().nullable(),
  keluhan: z.string().nullable(),
  estimasi_biaya: angka.nullable(),
  estimasi_selesai: z.string().nullable(),
  rincian_estimasi: z.array(z.object({ jenis: z.string(), uraian: z.string(), biaya: angka })).default([]),
  keputusan: z.string(),
  keputusan_cara: z.string().nullable(),
  keputusan_at: z.string().nullable(),
  biaya: angka.nullable(),
  created_at: z.string(),
  closed_at: z.string().nullable(),
  token_berakhir: z.string().nullable(),
  barang_bawaan: z.array(z.string()).default([]),
  linimasa: z.array(z.object({ status: z.string(), waktu: z.string() })).default([]),
  garansi: z
    .array(
      z.object({
        komponen: z.string(),
        lama_hari: z.number().nullable().optional(),
        mulai: z.string().nullable(),
        berakhir: z.string().nullable(),
        status: z.string(),
      }),
    )
    .default([]),
});

export type DataPortal = z.output<typeof skemaPortal>;

/** Hasil `portal_ambil_tiket` yang tidak sesuai bentuknya diperlakukan sama seperti token tidak berlaku. */
export function bacaPortal(hasil: unknown): DataPortal | null {
  if (!hasil) return null;
  const r = skemaPortal.safeParse(hasil);
  return r.success ? r.data : null;
}

/** `0812****7890` dari database menjadi `0812-****-7890`. */
export function formatWaTersensor(nomor: string | null): string {
  if (!nomor) return "—";
  if (nomor.length < 9) return nomor;
  return `${nomor.slice(0, 4)}-${nomor.slice(4, -4)}-${nomor.slice(-4)}`;
}

/** Penjelasan awam tiap tahap (mockup 08). */
export const PENJELASAN: Record<KodeStatus, string> = {
  diterima: "Unit diterima dan dicatat.",
  didiagnosis: "Teknisi memeriksa penyebab kerusakan.",
  menunggu_part: "Komponen pengganti sedang dipesan.",
  dikerjakan: "Perbaikan sedang dilakukan.",
  pengujian: "Memastikan unit berfungsi normal.",
  siap_diambil: "Unit siap diambil di toko.",
  selesai: "Unit sudah diambil.",
  dikembalikan: "Unit dikembalikan tanpa perbaikan.",
  dibatalkan: "Servis dibatalkan.",
};

/** Teks "Langkah berikutnya" untuk pelanggan, sesuai status dan keputusan estimasi. */
export function langkahBerikutnya(d: Pick<DataPortal, "status" | "keputusan" | "estimasi_biaya">): { teks: string; perluTindakan: boolean } {
  const tanpaTindakan = "Belum ada tindakan yang perlu Anda lakukan.";
  switch (d.status) {
    case "diterima":
      return { teks: `Unit Anda sudah kami terima dan akan segera diperiksa. ${tanpaTindakan}`, perluTindakan: false };
    case "didiagnosis":
      if (d.estimasi_biaya !== null && d.keputusan === "menunggu") {
        return { teks: "Estimasi biaya sudah tersedia. Mohon beri jawaban setuju atau tidak lewat WhatsApp agar perbaikan bisa dimulai.", perluTindakan: true };
      }
      if (d.keputusan === "ditolak") return { teks: "Anda tidak melanjutkan perbaikan. Unit akan dikembalikan; kami kabari via WhatsApp saat siap diambil.", perluTindakan: false };
      return { teks: `Teknisi sedang memeriksa unit. Kami akan mengirim estimasi biaya via WhatsApp. ${tanpaTindakan}`, perluTindakan: false };
    case "menunggu_part":
      return { teks: `Kami menunggu komponen pengganti tiba. Perbaikan dilanjutkan setelah komponen datang. ${tanpaTindakan}`, perluTindakan: false };
    case "dikerjakan":
      return { teks: `Perbaikan sedang dilakukan. ${tanpaTindakan}`, perluTindakan: false };
    case "pengujian":
      return { teks: `Perbaikan sudah selesai dan unit sedang diuji. Kami akan mengirim pesan WhatsApp saat unit siap diambil. ${tanpaTindakan}`, perluTindakan: false };
    case "siap_diambil":
      return { teks: "Unit siap diambil. Bawa tanda terima dan sebutkan PIN pengambilan saat datang ke toko.", perluTindakan: true };
    case "selesai":
      return { teks: "Unit sudah diambil. Terima kasih telah mempercayakan servis kepada kami.", perluTindakan: false };
    case "dikembalikan":
      return { teks: "Unit sudah dikembalikan tanpa perbaikan.", perluTindakan: false };
    case "dibatalkan":
      return { teks: "Servis ini dibatalkan. Hubungi kami jika ada pertanyaan.", perluTindakan: false };
    default:
      return { teks: tanpaTindakan, perluTindakan: false };
  }
}

export type LangkahProgres = {
  kunci: string;
  label: string;
  waktu: string | null;
  penjelasan: string;
  keadaan: "selesai" | "sekarang" | "menunggu";
};

/**
 * Linimasa untuk pelanggan: riwayat status yang benar-benar terjadi (urut waktu), lalu tahap
 * berikutnya yang belum tercapai ditandai "Menunggu". Tiket yang sudah berakhir tidak punya tahap menunggu.
 */
export function susunProgres(d: Pick<DataPortal, "status" | "linimasa">): LangkahProgres[] {
  const riwayat = [...d.linimasa].sort((a, b) => a.waktu.localeCompare(b.waktu));
  const langkah: LangkahProgres[] = riwayat.map((r, i) => ({
    kunci: `${r.status}-${r.waktu}`,
    label: labelPelanggan(r.status),
    waktu: r.waktu,
    penjelasan: PENJELASAN[r.status as KodeStatus] ?? "",
    keadaan: i === riwayat.length - 1 && !STATUS[d.status as KodeStatus]?.akhir ? "sekarang" : "selesai",
  }));

  if (STATUS[d.status as KodeStatus]?.akhir) return langkah;
  const posisi = TAHAP_LINTASAN.indexOf(tahapDariStatus(d.status) ?? "diterima");
  const berikutnya: TahapLintasan[] = TAHAP_LINTASAN.slice(posisi + 1).filter((t) => t !== "selesai");
  for (const t of berikutnya) {
    langkah.push({
      kunci: `menunggu-${t}`,
      label: STATUS[t].labelPelanggan,
      waktu: null,
      penjelasan: t === "siap_diambil" ? "Anda akan dikabari via WhatsApp." : PENJELASAN[t],
      keadaan: "menunggu",
    });
  }
  return langkah;
}

/** Label status untuk pelanggan, contoh `pengujian` → "Sedang Diuji". */
export function labelPelanggan(kode: string): string {
  return adalahStatus(kode) ? STATUS[kode].labelPelanggan : tampilanStatus(kode).label;
}

/** Teks garansi satu komponen untuk pelanggan. */
export function teksGaransi(g: DataPortal["garansi"][number]): string {
  const lama = g.lama_hari ? `Garansi ${g.lama_hari} hari` : "Bergaransi";
  if (g.status === "belum_dimulai" || !g.berakhir) return `${lama}, mulai berlaku saat unit Anda ambil.`;
  if (g.status === "berakhir") return `${lama}, berakhir ${formatTanggal(g.berakhir)}.`;
  return `${lama}, berlaku sampai ${formatTanggal(g.berakhir)}.`;
}

/** Ringkasan rincian estimasi dalam satu baris: "Jasa perbaikan Rp 350.000 · IC charging Rp 245.000". */
export function ringkasRincian(rincian: DataPortal["rincian_estimasi"]): string | null {
  if (!rincian.length) return null;
  return rincian.map((r) => `${r.uraian} ${formatRupiah(r.biaya)}`).join(" · ");
}

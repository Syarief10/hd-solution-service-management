// Pemberitahuan WhatsApp ke pelanggan (Iterasi 2, FR-PLG-07..09, FR-EST-05, K6).
// Pesan dikirim lewat link wa.me yang dibuka pemilik; aplikasi tidak bisa tahu apakah pesan benar
// terkirim, jadi setiap kiriman dicatat di tabel `pemberitahuan` dengan hasil "menunggu", lalu pemilik
// menandai Ya (terkirim) atau Belum (gagal, lalu wajib mencatat tindak lanjut).
// PIN pengambilan TIDAK pernah dimasukkan ke pesan (aturan bisnis 5).
import { formatRupiah, formatTanggal } from "@/lib/format";
import { adalahStatus, STATUS } from "@/lib/tiket/status";

export const TINDAK_LANJUT = ["kirim_manual", "telepon", "coba_lagi"] as const;
export type TindakLanjut = (typeof TINDAK_LANJUT)[number];

export const LABEL_TINDAK_LANJUT: Record<TindakLanjut, string> = {
  kirim_manual: "Dikirim manual via WhatsApp pribadi",
  telepon: "Pelanggan dihubungi via telepon",
  coba_lagi: "Akan dicoba lagi nanti",
};

/** Jenis pemberitahuan: "tanda_terima", "estimasi", atau kode status (contoh "siap_diambil"). */
export function labelJenis(jenis: string): string {
  if (jenis === "tanda_terima") return "Tanda terima";
  if (jenis === "estimasi") return "Estimasi biaya";
  if (adalahStatus(jenis)) return `Status ${STATUS[jenis].label}`;
  return jenis;
}

export type DataPesan = {
  nama: string;
  nomorTiket: string;
  perangkat: string;
  /** Link status lengkap, contoh https://…/status/k7p2… */
  link: string;
};

const PENUTUP = "Terima kasih — HD Solution Computer";

/** Nama panggilan: kata pertama nama pelanggan, supaya pesan terasa wajar ("Halo Budi"). */
function sapaan(nama: string): string {
  return nama.trim().split(/\s+/)[0] || "Pelanggan";
}

/** Pesan bukti penerimaan unit (dari layar berhasil penerimaan). */
export function pesanTandaTerima(d: DataPesan): string {
  return [
    `Halo ${sapaan(d.nama)}, unit ${d.perangkat} sudah kami terima dengan nomor tiket ${d.nomorTiket}.`,
    `Pantau progres servis di: ${d.link}`,
    "Simpan tanda terima untuk pengambilan unit.",
    PENUTUP,
  ].join("\n\n");
}

/** Pesan perubahan status (mockup 04: "… kini berstatus Pengujian."). */
export function pesanStatus(d: DataPesan, status: string): string {
  const label = adalahStatus(status) ? STATUS[status].labelPelanggan : status;
  const baris = [`Halo ${sapaan(d.nama)}, servis ${d.nomorTiket} (${d.perangkat}) kini berstatus ${label}.`];
  if (status === "siap_diambil") baris.push("Unit sudah bisa diambil. Bawa tanda terima dan sebutkan PIN pengambilan saat datang.");
  if (status === "dikembalikan" || status === "selesai") baris.push("Terima kasih telah mempercayakan servis kepada kami.");
  baris.push(`Cek progres: ${d.link}`, PENUTUP);
  return baris.join("\n\n");
}

/** Pesan estimasi biaya yang meminta persetujuan pelanggan (FR-EST-05). */
export function pesanEstimasi(
  d: DataPesan,
  e: { total: number; rincian: { uraian: string; biaya: number }[]; selesai: string | null; diagnosis: string | null },
): string {
  const baris = [`Halo ${sapaan(d.nama)}, hasil pemeriksaan ${d.perangkat} (${d.nomorTiket}) sudah keluar.`];
  if (e.diagnosis?.trim()) baris.push(`Hasil pemeriksaan: ${e.diagnosis.trim()}`);
  const rincian = e.rincian.map((r) => `- ${r.uraian}: ${formatRupiah(r.biaya)}`);
  baris.push([`Estimasi biaya: ${formatRupiah(e.total)}`, ...rincian].join("\n"));
  if (e.selesai) baris.push(`Perkiraan selesai: ${formatTanggal(e.selesai)}`);
  baris.push("Mohon balas SETUJU untuk melanjutkan perbaikan, atau TIDAK jika unit ingin diambil tanpa perbaikan.", `Detail: ${d.link}`, PENUTUP);
  return baris.join("\n\n");
}

/** Link wa.me ke nomor pelanggan (format database 62…). null jika nomor tidak valid. */
export function linkWa(nomor: string, pesan: string): string | null {
  const digit = nomor.replace(/\D/g, "");
  const n = digit.startsWith("0") ? `62${digit.slice(1)}` : digit;
  if (!/^62\d{8,13}$/.test(n)) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(pesan)}`;
}

export type BarisPemberitahuan = {
  pemberitahuan_id: string;
  jenis: string;
  hasil: string;
  tindak_lanjut: string | null;
  catatan: string | null;
  dikirim_at: string;
  diperbarui_at: string | null;
};

/** Pemberitahuan gagal yang belum ditindaklanjuti tetap tampil di panel dan dasbor (kondisi 07). */
export function perluTindakLanjut(p: Pick<BarisPemberitahuan, "hasil" | "tindak_lanjut">): boolean {
  return p.hasil === "gagal" && !p.tindak_lanjut;
}

/** Keterangan hasil untuk riwayat, contoh "Terkirim", "Gagal · dihubungi via telepon". */
export function labelHasil(p: Pick<BarisPemberitahuan, "hasil" | "tindak_lanjut">): string {
  if (p.hasil === "terkirim") return "Ditandai terkirim";
  if (p.hasil === "menunggu") return "Belum dikonfirmasi";
  if (p.tindak_lanjut && (TINDAK_LANJUT as readonly string[]).includes(p.tindak_lanjut)) return `Gagal · ${LABEL_TINDAK_LANJUT[p.tindak_lanjut as TindakLanjut].toLowerCase()}`;
  return "Gagal terkirim";
}

// Menyusun pesan WhatsApp untuk satu tiket dari data Detail Tiket (Iterasi 2, K6).
import type { DetailTiket } from "./detail";
import { pathStatus } from "./kode-akses";
import { pesanEstimasi, pesanStatus, pesanTandaTerima, type DataPesan } from "@/lib/whatsapp";

export type PesanTiket = {
  nomorWa: string;
  data: DataPesan;
  /** Jenis dan isi pesan untuk keadaan tiket sekarang (pratinjau panel). */
  jenis: string;
  pesan: string;
  /** Pesan per jenis, untuk kirim ulang pemberitahuan lama. */
  perJenis: Record<string, string>;
};

export function pesanEstimasiTiket(t: DetailTiket, data: DataPesan): string | null {
  if (t.estimasi_biaya === null) return null;
  return pesanEstimasi(data, {
    total: Number(t.estimasi_biaya),
    rincian: t.rincian_estimasi.map((r) => ({ uraian: r.uraian, biaya: Number(r.biaya) })),
    selesai: t.estimasi_selesai,
    diagnosis: t.diagnosis,
  });
}

export function susunPesanTiket(t: DetailTiket, alamat: string): PesanTiket {
  const p = t.perangkat;
  const data: DataPesan = {
    nama: p?.pelanggan?.nama ?? "Pelanggan",
    nomorTiket: t.nomor_tiket,
    perangkat: p?.merk_tipe ?? "perangkat Anda",
    link: `${alamat}${pathStatus(t.tracking_token)}`,
  };
  const estimasi = pesanEstimasiTiket(t, data);
  // Saat estimasi menunggu jawaban, pratinjau panel adalah pesan estimasi.
  const tungguEstimasi = t.status === "didiagnosis" && t.keputusan === "menunggu" && estimasi !== null;
  const jenis = tungguEstimasi ? "estimasi" : t.status === "diterima" ? "tanda_terima" : t.status;
  const perJenis: Record<string, string> = { tanda_terima: pesanTandaTerima(data) };
  if (estimasi) perJenis.estimasi = estimasi;
  for (const b of t.pemberitahuan) if (!(b.jenis in perJenis)) perJenis[b.jenis] = pesanStatus(data, b.jenis);
  const pesan = jenis === "estimasi" ? estimasi! : jenis === "tanda_terima" ? perJenis.tanda_terima : pesanStatus(data, jenis);
  perJenis[jenis] ??= pesan;
  return { nomorWa: p?.pelanggan?.no_whatsapp ?? "", data, jenis, pesan, perJenis };
}

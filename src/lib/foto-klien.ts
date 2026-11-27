// Bagian foto yang hanya berjalan di browser: memperkecil dan mengunggah (K9).
import { BUCKET_FOTO, pathFoto, SISI_MAKS, ukuranTarget } from "./foto";
import { createClient } from "@/lib/supabase/client";

export class GagalFoto extends Error {}

/** Perkecil foto ke JPEG dengan sisi terpanjang ≤ 1600 px. Orientasi EXIF dari kamera HP ikut diterapkan. */
export async function perkecilFoto(file: Blob, sisiMaks = SISI_MAKS, kualitas = 0.82): Promise<Blob> {
  let gambar: ImageBitmap;
  try {
    gambar = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new GagalFoto("Format foto tidak bisa dibaca browser. Gunakan JPG, PNG, atau WebP.");
  }
  const { lebar, tinggi } = ukuranTarget(gambar.width, gambar.height, sisiMaks);
  const kanvas = document.createElement("canvas");
  kanvas.width = lebar;
  kanvas.height = tinggi;
  const ctx = kanvas.getContext("2d");
  if (!ctx) throw new GagalFoto("Browser tidak bisa memproses foto.");
  ctx.drawImage(gambar, 0, 0, lebar, tinggi);
  gambar.close();
  const hasil = await new Promise<Blob | null>((r) => kanvas.toBlob(r, "image/jpeg", kualitas));
  if (!hasil) throw new GagalFoto("Browser tidak bisa memproses foto.");
  return hasil;
}

/** Unggah satu foto yang sudah diperkecil ke bucket privat. Mengembalikan path-nya. */
export async function unggahKeStorage(tiketId: string, foto: Blob): Promise<string> {
  const path = pathFoto(tiketId, crypto.randomUUID());
  const { error } = await createClient().storage.from(BUCKET_FOTO).upload(path, foto, { contentType: "image/jpeg", upsert: false });
  if (error) throw new GagalFoto("Foto belum terunggah. Periksa koneksi lalu coba lagi.");
  return path;
}

/** Hapus objek yang sudah terunggah, misalnya jika pencatatan barisnya gagal. */
export async function hapusDariStorage(path: string): Promise<void> {
  await createClient().storage.from(BUCKET_FOTO).remove([path]);
}

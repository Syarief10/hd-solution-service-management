"use server";

import { redirect } from "next/navigation";

import { tujuanAman } from "@/lib/navigasi";
import { createClient } from "@/lib/supabase/server";

export type StatusMasuk = { pesan: string; email: string } | undefined;

// Satu pesan untuk semua kegagalan kredensial, supaya tidak membocorkan
// apakah email terdaftar (US-01).
const PESAN_GAGAL = "Email atau kata sandi salah.";

export async function masuk(_sebelumnya: StatusMasuk, formData: FormData): Promise<StatusMasuk> {
  const email = String(formData.get("email") ?? "").trim();
  const kataSandi = String(formData.get("kata_sandi") ?? "");

  if (!email || !kataSandi) {
    return { pesan: "Email dan kata sandi wajib diisi.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: kataSandi });

  if (error) {
    // Dicatat di log server tanpa email atau kata sandi.
    console.error(`[masuk] gagal: ${error.name} status=${error.status ?? "-"} kode=${error.code ?? "-"} pesan=${error.message}`);
    if (error.status === 429) {
      return { pesan: "Terlalu banyak percobaan masuk. Coba lagi beberapa menit lagi.", email };
    }
    if (!error.status || error.status >= 500) {
      return { pesan: "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.", email };
    }
    return { pesan: PESAN_GAGAL, email };
  }

  // Kembali ke halaman yang tadi diminta; tujuan selain rute internal diganti /dashboard.
  redirect(tujuanAman(String(formData.get("next") ?? "")));
}

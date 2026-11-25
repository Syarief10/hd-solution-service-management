// GET /api/kesehatan: memastikan aplikasi tersambung ke Supabase.
// Memanggil portal_ambil_tiket dengan token contoh yang tidak ada (hasilnya null),
// cukup untuk membuktikan URL, kunci anon, dan izin fungsi portal benar.
// Tidak mengembalikan data tiket apa pun.
import { createClient } from "@/lib/supabase/server";

const TOKEN_CONTOH = "2222222222222222";

export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("portal_ambil_tiket", { p_token: TOKEN_CONTOH });

  if (error) {
    return Response.json({ ok: false, supabase: "gagal", kode: error.code }, { status: 503 });
  }
  return Response.json({ ok: true, supabase: "tersambung" });
}

import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { STATUS_AKHIR } from "@/lib/tiket/status";


/** Jumlah tiket aktif di samping menu Tiket Servis. Hanya membaca data. */
export async function JumlahTiketAktif() {
  // Klien Supabase memeriksa masa berlaku sesi dengan Date.now(); tandai sebagai data per permintaan.
  await connection();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("tiket")
    .select("tiket_id", { count: "exact", head: true })
    .not("status", "in", `(${STATUS_AKHIR.join(",")})`);

  if (error || count === null) return null;

  return (
    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 tabular-nums">
      {count}
      <span className="sr-only"> tiket aktif</span>
    </span>
  );
}

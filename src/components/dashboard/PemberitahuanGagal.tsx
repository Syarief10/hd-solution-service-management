// Kondisi 07 (layar 09): pemberitahuan WhatsApp yang gagal tampil di aktivitas dasbor
// sampai tindak lanjutnya dicatat (K6). Ditaruh di atas daftar Aktivitas Terbaru.
import Link from "next/link";
import { connection } from "next/server";

import { Ikon } from "@/components/ui";
import { formatTanggalWaktu } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { labelJenis } from "@/lib/whatsapp";

export async function PemberitahuanGagal() {
  await connection();
  const db = await createClient();
  const { data, error } = await db
    .from("pemberitahuan")
    .select("pemberitahuan_id, jenis, diperbarui_at, dikirim_at, tiket_id, tiket ( nomor_tiket )")
    .eq("hasil", "gagal")
    .is("tindak_lanjut", null)
    .order("dikirim_at", { ascending: false })
    .limit(5);
  if (error || !data?.length) return null;

  return (
    <div role="status" className="mx-5 mb-2 flex flex-col gap-2 rounded-lg border border-red-200 bg-danger-soft p-3 text-[13px] text-red-800">
      <p className="flex items-center gap-2 font-semibold">
        <Ikon nama="alert" />
        {data.length} pemberitahuan WhatsApp gagal terkirim
      </p>
      <ul className="flex flex-col gap-1">
        {data.map((p) => (
          <li key={p.pemberitahuan_id}>
            <Link href={`/tiket/${p.tiket_id}`} className="font-semibold text-red-900 tabular-nums underline-offset-2 hover:underline">
              {p.tiket?.nomor_tiket ?? "Tiket"}
            </Link>{" "}
            {labelJenis(p.jenis).toLowerCase()} · {formatTanggalWaktu(p.diperbarui_at ?? p.dikirim_at)} · catat tindak lanjut
          </li>
        ))}
      </ul>
    </div>
  );
}

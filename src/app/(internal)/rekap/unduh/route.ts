// GET /rekap/unduh?periode=...: rekap pendapatan dalam CSV (KF-16).
// Dilindungi proxy (harus login) dan RLS; memakai periode yang sama dengan halaman Rekap.
import type { NextRequest } from "next/server";

import { ambilTransaksi } from "@/lib/transaksi";
import { bacaPeriode, keCsv } from "@/lib/rekap";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const p = bacaPeriode(Object.fromEntries(request.nextUrl.searchParams));
  const db = await createClient();
  let transaksi;
  try {
    transaksi = await ambilTransaksi(db, p.dari, p.sampai);
  } catch {
    return new Response("Rekap gagal dimuat. Coba lagi.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const nama = p.dari === p.sampai ? `rekap-pendapatan-${p.dari}.csv` : `rekap-pendapatan-${p.dari}_${p.sampai}.csv`;
  return new Response(keCsv(transaksi), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nama}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

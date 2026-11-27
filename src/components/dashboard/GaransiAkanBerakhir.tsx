// Panel dasbor "Garansi Akan Berakhir" (FR-GAR-04, mockup 01): garansi yang berakhir dalam 14 hari.
import Link from "next/link";
import { connection } from "next/server";

import { Card, Ikon } from "@/components/ui";
import { formatTanggal } from "@/lib/format";
import { garansiAkanBerakhir, type BarisGaransi } from "@/lib/garansi";
import { createClient } from "@/lib/supabase/server";

export async function GaransiAkanBerakhir() {
  await connection();
  const db = await createClient();
  const { data, error } = await db
    .from("v_garansi")
    .select("sparepart_id, tiket_id, nomor_tiket, nama_pelanggan, merk_tipe, nama_komponen, tanggal_pasang, lama_garansi_hari, garansi_mulai, garansi_berakhir, sisa_hari, status_garansi")
    .eq("status_garansi", "akan_berakhir");
  if (error) return null;
  const daftar = garansiAkanBerakhir((data ?? []) as BarisGaransi[]);

  return (
    <Card className="flex flex-col gap-3 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink">Garansi Akan Berakhir</h2>
          <p className="text-xs text-muted">Berakhir dalam 14 hari ke depan</p>
        </div>
        <Link href="/garansi?status=akan_berakhir" className="inline-flex min-h-11 items-center text-[13px] font-semibold text-primary hover:underline md:min-h-0">
          Lihat garansi
        </Link>
      </div>
      {daftar.length === 0 ? (
        <p className="text-[13px] text-muted">Tidak ada garansi yang akan berakhir.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {daftar.map((g) => (
            <li key={g.sparepart_id} className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px]">
              <Ikon nama="shield" className="mt-0.5 text-amber-800" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold break-words text-ink">{g.nama_komponen}</p>
                <p className="text-muted">
                  {g.nama_pelanggan} ·{" "}
                  <Link href={`/tiket/${g.tiket_id}?tab=komponen`} className="font-semibold text-primary tabular-nums hover:underline">
                    {g.nomor_tiket}
                  </Link>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-orange-800">{g.sisa_hari === 0 ? "Hari ini" : `Sisa ${g.sisa_hari} hari`}</p>
                {g.garansi_berakhir && <p className="text-xs text-muted tabular-nums">s.d. {formatTanggal(`${g.garansi_berakhir}T12:00:00+07:00`)}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

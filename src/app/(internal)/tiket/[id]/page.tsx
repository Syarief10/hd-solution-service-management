// 04 / 04m Detail Tiket (issue #16, #17, #19, #20, #21, #23)
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { HeaderTiket, TabEstimasi, TabInformasi, TabKomponen, TabProgres, TabTransaksi } from "./bagian";
import { NavTab } from "./nav-tab";
import { SkeletonTable } from "@/components/ui";
import { alamatAplikasi } from "@/lib/alamat";
import { ambilDetailTiket, tabAktif } from "@/lib/tiket/detail";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Detail Tiket | HD Solution Computer" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string | string[] }> };

async function IsiDetail({ params, searchParams }: Props) {
  // Klien Supabase memakai Date.now() untuk sesi; tandai sebagai data per permintaan.
  await connection();
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const db = await createClient();
  const t = await ambilDetailTiket(db, id);
  if (!t) notFound();

  const aktif = tabAktif(tab);
  const sekarang = new Date();

  return (
    <>
      <nav aria-label="Jejak" className="hidden text-[13px] text-muted md:block">
        <Link href="/tiket" className="text-primary hover:underline">
          Tiket Servis
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span className="tabular-nums">{t.nomor_tiket}</span>
      </nav>
      <HeaderTiket t={t} sekarang={sekarang} />
      <NavTab tiketId={t.tiket_id} aktif={aktif} />
      <section aria-label="Isi tab">
        {aktif === "informasi" && <TabInformasi t={t} alamat={await alamatAplikasi()} />}
        {aktif === "progres" && <TabProgres t={t} />}
        {aktif === "estimasi" && <TabEstimasi t={t} />}
        {aktif === "komponen" && <TabKomponen t={t} sekarang={sekarang} />}
        {aktif === "transaksi" && <TabTransaksi t={t} />}
      </section>
    </>
  );
}

export default function Page(props: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-5 md:gap-5 md:px-8 md:py-7">
      <Suspense fallback={<SkeletonTable baris={6} label="Memuat detail tiket…" />}>
        <IsiDetail {...props} />
      </Suspense>
    </div>
  );
}

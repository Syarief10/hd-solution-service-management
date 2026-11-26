import { Suspense } from "react";

import { TanggalHariIni } from "./TanggalHariIni";
import { ButtonLink, Ikon } from "@/components/ui";

/**
 * Header desktop: kotak cari global (mengarah ke Daftar Tiket dengan kata kunci),
 * tanggal hari ini, dan tombol Tiket Baru. Form GET tetap berfungsi tanpa JavaScript.
 */
export function HeaderDesktop() {
  return (
    <header className="hidden flex-wrap items-center gap-x-4 gap-y-3 border-b border-border bg-surface px-8 py-3.5 md:flex">
      <form action="/tiket" method="get" role="search" className="relative max-w-[440px] flex-[1_1_260px]">
        <label htmlFor="cari-global" className="sr-only">
          Cari tiket
        </label>
        <Ikon nama="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
        <input
          id="cari-global"
          name="q"
          type="search"
          placeholder="Cari no. tiket, pelanggan, atau nomor seri"
          className="block min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pr-3 pl-9.5 text-sm text-ink placeholder:text-slate-500 focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </form>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <Suspense fallback={null}>
          <TanggalHariIni className="text-[13px] text-muted" />
        </Suspense>
        <ButtonLink href="/tiket/baru" ikon="plus">
          Tiket Baru
        </ButtonLink>
      </div>
    </header>
  );
}

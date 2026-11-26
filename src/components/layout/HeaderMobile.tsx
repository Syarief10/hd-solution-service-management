import { Suspense } from "react";

import { LogoHD } from "./Logo";
import { TanggalHariIni } from "./TanggalHariIni";
import { keluar } from "@/app/(internal)/actions";
import { Ikon } from "@/components/ui";

/** Header mobile (< 768 px): logo, nama toko, tanggal, dan menu akun berisi Keluar. */
export function HeaderMobile() {
  return (
    <header className="sticky top-0 z-30 print:hidden! flex items-center gap-2.5 border-b border-border bg-surface px-4 py-3 md:hidden">
      <LogoHD className="size-9 text-[13px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-base font-bold text-ink">HD Solution Computer</span>
        <Suspense fallback={<span className="text-xs text-muted">&nbsp;</span>}>
          <TanggalHariIni className="text-xs text-muted" />
        </Suspense>
      </div>

      {/* <details> membuka menu tanpa JavaScript tambahan. */}
      <details className="group relative">
        <summary
          aria-label="Menu akun"
          className="flex size-11 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-300 bg-surface text-[13px] font-bold text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden"
        >
          PT
        </summary>
        <div className="absolute top-full right-0 z-40 mt-2 w-56 rounded-card border border-border bg-surface p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
          <div className="px-2.5 py-2">
            <p className="text-[13px] font-semibold text-ink">Pemilik / Teknisi</p>
            <p className="text-xs text-muted">Akun internal</p>
          </div>
          <form action={keluar}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-ink hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Ikon nama="logout" />
              Keluar
            </button>
          </form>
        </div>
      </details>
    </header>
  );
}

import Link from "next/link";
import { Suspense } from "react";

import { JumlahTiketAktif } from "./JumlahTiketAktif";
import { LogoHD } from "./Logo";
import { DaftarMenuSidebar, NavSidebar } from "./NavSidebar";
import { keluar } from "@/app/(internal)/actions";
import { Ikon } from "@/components/ui";

/** Sidebar desktop (>= 768 px): logo, menu, dan menu pengguna dengan tombol Keluar. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden print:hidden! h-screen w-62 shrink-0 flex-col gap-7 overflow-y-auto border-r border-border bg-surface px-3.5 py-5 md:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg px-2 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <LogoHD />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold leading-tight text-ink">HD Solution Computer</span>
          <span className="text-xs text-muted">Servis laptop, PC &amp; printer</span>
        </span>
      </Link>

      {/* usePathname butuh Suspense (Cache Components); fallback-nya menu yang sama tanpa penanda aktif. */}
      <Suspense fallback={<DaftarMenuSidebar pathname="" jumlahTiketAktif={null} />}>
        <NavSidebar
          jumlahTiketAktif={
            <Suspense fallback={null}>
              <JumlahTiketAktif />
            </Suspense>
          }
        />
      </Suspense>

      <div className="mt-auto flex items-center gap-2.5 rounded-[10px] border border-slate-100 bg-slate-50 p-3">
        <span aria-hidden="true" className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-teal-100 text-[13px] font-bold text-teal-800">
          PT
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-ink">Pemilik / Teknisi</span>
          <span className="text-xs text-muted">Akun internal</span>
        </span>
        <form action={keluar}>
          <button
            type="submit"
            aria-label="Keluar"
            title="Keluar"
            className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-slate-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Ikon nama="logout" className="size-[18px]" />
          </button>
        </form>
      </div>
    </aside>
  );
}

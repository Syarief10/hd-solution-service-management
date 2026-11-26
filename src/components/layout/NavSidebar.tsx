"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { MENU, menuAktif } from "./menu";
import { cx, Ikon } from "@/components/ui";

type Props = { jumlahTiketAktif: ReactNode };

/** Daftar menu sidebar. `pathname` kosong berarti belum ada menu yang ditandai aktif. */
export function DaftarMenuSidebar({ pathname, jumlahTiketAktif }: Props & { pathname: string }) {
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
      {MENU.map((m) => {
        const aktif = pathname !== "" && menuAktif(pathname, m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={aktif ? "page" : undefined}
            className={cx(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              aktif ? "bg-primary-soft font-semibold text-primary" : "font-medium text-slate-700 hover:bg-slate-100 hover:text-ink",
            )}
          >
            <Ikon nama={m.ikon} className="size-[18px]" />
            {m.label}
            {m.href === "/tiket" && jumlahTiketAktif}
          </Link>
        );
      })}
    </nav>
  );
}

/** Menu sidebar desktop dengan penanda halaman aktif. Bungkus dengan <Suspense>. */
export function NavSidebar({ jumlahTiketAktif }: Props) {
  return <DaftarMenuSidebar pathname={usePathname()} jumlahTiketAktif={jumlahTiketAktif} />;
}

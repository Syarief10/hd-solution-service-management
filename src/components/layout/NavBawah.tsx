"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MENU, menuAktif, type ItemMenu } from "./menu";
import { cx, Ikon } from "@/components/ui";

/** Navigasi bawah mobile (< 768 px) dengan tombol Tiket Baru di tengah (mockup 01m). */
export function DaftarNavBawah({ pathname }: { pathname: string }) {
  const [dasbor, tiket, ...lainnya] = MENU;
  const tiketBaruAktif = pathname.startsWith("/tiket/baru");

  const item = (m: ItemMenu) => {
    const aktif = pathname !== "" && menuAktif(pathname, m.href);
    return (
      <Link
        key={m.href}
        href={m.href}
        aria-current={aktif ? "page" : undefined}
        className={cx(
          "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[11px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          aktif ? "font-bold text-primary" : "font-medium text-muted",
        )}
      >
        <Ikon nama={m.ikon} className="size-5" />
        {m.labelPendek}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center print:hidden! [body:has([data-sembunyikan-nav])_&]:hidden border-t border-border bg-surface px-2 pt-1.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {item(dasbor)}
      {item(tiket)}
      <Link
        href="/tiket/baru"
        aria-current={tiketBaruAktif ? "page" : undefined}
        className="-mt-6.5 flex flex-1 flex-col items-center gap-1 rounded-lg text-[11px] font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex size-[54px] items-center justify-center rounded-2xl bg-primary text-white shadow-[0_6px_14px_rgba(29,78,216,0.35)]">
          <Ikon nama="plus" className="size-6" />
        </span>
        Tiket Baru
      </Link>
      {lainnya.map(item)}
    </nav>
  );
}

/** Versi dengan penanda halaman aktif. Bungkus dengan <Suspense>. */
export function NavBawah() {
  return <DaftarNavBawah pathname={usePathname()} />;
}

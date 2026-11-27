"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { cx } from "@/components/ui";
import { TAB_DETAIL, type SlugTab } from "@/lib/tiket/detail";

/** Navigasi tab dengan URL ?tab= (bisa dibagikan dan dimuat ulang). Chip di mobile, tab bergaris di desktop. */
export function NavTab({ tiketId, aktif }: { tiketId: string; aktif: SlugTab }) {
  const daftar = useRef<HTMLUListElement>(null);

  // Di mobile chip bisa berada di luar layar; gulir agar tab aktif terlihat.
  useEffect(() => {
    daftar.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [aktif]);

  return (
    <nav aria-label="Bagian detail tiket" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul ref={daftar} className="flex min-w-max gap-2 md:gap-1 md:border-b md:border-border">
        {TAB_DETAIL.map((tab) => {
          const dipilih = tab.slug === aktif;
          return (
            <li key={tab.slug}>
              <Link
                href={`/tiket/${tiketId}?tab=${tab.slug}`}
                scroll={false}
                aria-current={dipilih ? "page" : undefined}
                className={cx(
                  "flex min-h-11 items-center whitespace-nowrap text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  "rounded-full border px-3.5 md:rounded-none md:border-0 md:border-b-2 md:px-3 md:text-sm",
                  dipilih
                    ? "border-primary bg-primary text-white md:bg-transparent md:text-primary"
                    : "border-slate-300 bg-surface text-slate-700 hover:text-ink md:border-transparent md:bg-transparent",
                )}
              >
                <span className="md:hidden">{tab.labelPendek}</span>
                <span className="hidden md:inline">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

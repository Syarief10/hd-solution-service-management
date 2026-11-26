// Layout area internal pemilik (issue #7): sidebar dan header di desktop,
// header ringkas dan navigasi bawah di mobile (< 768 px).
import { Suspense } from "react";

import { HeaderDesktop } from "@/components/layout/HeaderDesktop";
import { HeaderMobile } from "@/components/layout/HeaderMobile";
import { DaftarNavBawah, NavBawah } from "@/components/layout/NavBawah";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui";

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary focus:shadow"
      >
        Lewati ke konten
      </a>
      <div className="flex min-h-screen flex-1 bg-bg">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <HeaderDesktop />
          <HeaderMobile />
          <main id="konten" tabIndex={-1} className="flex-1 pb-28 focus:outline-none md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <Suspense fallback={<DaftarNavBawah pathname="" />}>
        <NavBawah />
      </Suspense>
    </ToastProvider>
  );
}

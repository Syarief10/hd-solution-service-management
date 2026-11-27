// Bagian bersama halaman pelanggan (07 Cek Status, 08 Detail Progres). Tanpa login.
import Link from "next/link";
import type { ReactNode } from "react";

import { Ikon } from "@/components/ui";
import { JAM_LAYANAN, linkWaToko } from "@/lib/kontak";

export function KerangkaPelanggan({ children, keluar = false }: { children: ReactNode; keluar?: boolean }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[640px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              HD
            </span>
            <div className="leading-tight">
              <p className="font-bold text-ink">HD Solution Computer</p>
              <p className="text-xs text-muted">Servis laptop, PC &amp; printer</p>
            </div>
          </div>
          {keluar && (
            <Link
              href="/status"
              className="flex min-h-11 items-center rounded-lg border border-slate-300 bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Keluar
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5 md:py-8">{children}</main>
    </div>
  );
}

/** Tombol WhatsApp ke toko; tidak tampil jika nomor toko belum diatur. */
export function TombolHubungi({ pesan, label, utama = false }: { pesan: string; label: string; utama?: boolean }) {
  const href = linkWaToko(pesan);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        utama
          ? "flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal px-4 font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          : "flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-surface px-4 font-semibold text-teal hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      }
    >
      <Ikon nama="chat" className="size-4" />
      {label}
    </a>
  );
}

export function KartuBantuan() {
  return (
    <section aria-labelledby="judul-bantuan" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h2 id="judul-bantuan" className="font-bold text-ink">
        Butuh bantuan?
      </h2>
      <p className="text-sm text-slate-700">
        Kehilangan link? Hubungi kami dengan menyebutkan nomor tiket di tanda terima. {JAM_LAYANAN}.
      </p>
      <TombolHubungi pesan="Halo HD Solution Computer, saya ingin menanyakan status servis saya." label="Hubungi via WhatsApp" />
    </section>
  );
}

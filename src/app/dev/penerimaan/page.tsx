import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormPenerimaan } from "@/app/(internal)/tiket/baru/form-penerimaan";
import { ToastProvider } from "@/components/ui";

// Pratinjau tampilan form penerimaan tanpa login (development saja).
// Tombol Simpan tetap memanggil server action yang memeriksa sesi, jadi tanpa login tidak ada data tersimpan.
export const metadata: Metadata = { title: "Pratinjau Form Penerimaan | HD Solution Computer", robots: { index: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <ToastProvider>
      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-4 py-5 pb-28 md:px-8 md:py-7">
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-[13px] text-amber-900">Pratinjau development. Tanpa login, Simpan tidak menyimpan apa pun.</p>
        <h1 className="text-[22px] font-bold tracking-tight text-ink md:text-[26px]">Penerimaan Servis</h1>
        <FormPenerimaan />
      </main>
    </ToastProvider>
  );
}

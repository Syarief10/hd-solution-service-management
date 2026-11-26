// Login pemilik. Akun dibuat manual di Supabase, tidak ada halaman daftar.
import type { Metadata } from "next";

import { FormMasuk } from "./form-masuk";

export const metadata: Metadata = {
  title: "Masuk | HD Solution Computer",
};

function LogoHD({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-10 items-center justify-center rounded-lg font-bold text-white ${className}`}
      aria-hidden="true"
    >
      HD
    </span>
  );
}

export default function Page() {
  return (
    <main className="flex min-h-screen flex-1 bg-slate-50">
      {/* Panel merek: hanya desktop */}
      <section className="hidden w-[44%] max-w-xl flex-col justify-between bg-blue-700 p-10 text-white md:flex">
        <div className="flex items-center gap-3">
          <LogoHD className="bg-white/15 ring-1 ring-white/30" />
          <div>
            <p className="font-semibold leading-tight">HD Solution Computer</p>
            <p className="text-sm text-blue-100">Servis laptop, PC &amp; printer</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight">Kelola servis toko dalam satu tempat.</h2>
          <ul className="space-y-2 text-blue-100">
            <li>Penerimaan unit dan status pengerjaan</li>
            <li>Komponen dan garansi</li>
            <li>Rekap pendapatan harian dan bulanan</li>
          </ul>
        </div>

        <p className="text-sm text-blue-200">Khusus pemilik dan teknisi.</p>
      </section>

      {/* Form */}
      <section className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <LogoHD className="bg-blue-700" />
            <div>
              <p className="font-semibold leading-tight text-slate-900">HD Solution Computer</p>
              <p className="text-sm text-slate-500">Servis laptop, PC &amp; printer</p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900">Masuk</h1>
          <p className="mt-1 mb-6 text-sm text-slate-600">Gunakan akun yang diberikan pengelola sistem.</p>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <FormMasuk />
          </div>
        </div>
      </section>
    </main>
  );
}

// 03 / 03m Form Penerimaan Servis (issue #11, #12, #13)
import type { Metadata } from "next";
import Link from "next/link";

import { FormPenerimaan } from "./form-penerimaan";

export const metadata: Metadata = { title: "Tiket Baru | HD Solution Computer" };

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
      <nav aria-label="Jejak" className="hidden text-[13px] text-muted md:block">
        <Link href="/tiket" className="text-primary hover:underline">
          Tiket Servis
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span>Tiket Baru</span>
      </nav>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink md:text-[26px]">Penerimaan Servis</h1>
        <p className="mt-1 text-sm text-muted">
          Isi bersama pelanggan saat unit diserahkan. Kolom bertanda{" "}
          <span aria-hidden="true" className="text-red-700">
            *
          </span>
          <span className="sr-only">bintang</span> wajib diisi.
        </p>
      </div>
      <FormPenerimaan />
    </div>
  );
}

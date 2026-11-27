// 07 Cek Status Servis (pelanggan, tanpa login). Halaman cadangan: jalan utama adalah link
// /status/{token} dari WhatsApp atau QR code di tanda terima (K2).
import type { Metadata } from "next";

import { KartuBantuan, KerangkaPelanggan } from "./bagian";
import { FormCekStatus } from "./form-cek-status";

export const metadata: Metadata = {
  title: "Cek Status Servis | HD Solution Computer",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <KerangkaPelanggan>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Cek Status Servis</h1>
        <p className="mt-1.5 text-[15px] text-slate-700">Buka link dari pesan WhatsApp kami, atau masukkan kode cek status yang tertera di tanda terima.</p>
      </div>
      <FormCekStatus />
      <KartuBantuan />
    </KerangkaPelanggan>
  );
}

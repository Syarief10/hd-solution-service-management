import type { NamaIkon } from "@/components/ui";

export type ItemMenu = {
  href: string;
  label: string;
  /** Label lebih pendek untuk navigasi bawah di mobile. */
  labelPendek: string;
  ikon: NamaIkon;
};

// Menu area internal sesuai mockup (perancangan §7). Garansi dan Rekap tetap tampil;
// halamannya menampilkan "Segera hadir" sampai iterasinya.
export const MENU: ItemMenu[] = [
  { href: "/dashboard", label: "Dasbor", labelPendek: "Dasbor", ikon: "grid" },
  { href: "/tiket", label: "Tiket Servis", labelPendek: "Tiket", ikon: "ticket" },
  { href: "/garansi", label: "Garansi Komponen", labelPendek: "Garansi", ikon: "shield" },
  { href: "/rekap", label: "Rekap Pendapatan", labelPendek: "Pendapatan", ikon: "chart" },
];

/** Menu dianggap aktif jika path sama atau berada di bawahnya; /tiket/baru punya tombol sendiri. */
export function menuAktif(pathname: string, href: string): boolean {
  if (href === "/tiket" && pathname.startsWith("/tiket/baru")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

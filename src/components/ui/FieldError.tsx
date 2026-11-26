import { Ikon } from "./Ikon";

/**
 * Pesan kesalahan di bawah kolom (kondisi 03). Hubungkan ke input lewat
 * `aria-describedby={idPesanKesalahan(id)}` dan `aria-invalid` di input.
 */
export function idPesanKesalahan(idKolom: string) {
  return `${idKolom}-kesalahan`;
}

export function FieldError({ idKolom, pesan }: { idKolom: string; pesan?: string | null }) {
  if (!pesan) return null;
  return (
    <p id={idPesanKesalahan(idKolom)} className="mt-1.5 flex items-start gap-1.5 text-xs text-red-700">
      <Ikon nama="info" className="mt-px size-3.5" />
      <span>{pesan}</span>
    </p>
  );
}

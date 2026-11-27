import { ButtonLink, Card, EmptyState } from "@/components/ui";

// Tiket tidak ditemukan atau alamatnya salah (issue #16).
export default function TiketTidakDitemukan() {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-4 py-6 md:px-8 md:py-7">
      <Card>
        <EmptyState
          varian="tanpa-hasil"
          ikon="ticket"
          judul="Tiket tidak ditemukan"
          keterangan="Nomor atau alamat tiket ini tidak ada. Mungkin tautannya salah ketik. Cari tiket dari daftar tiket servis."
          aksi={<ButtonLink href="/tiket">Ke Daftar Tiket</ButtonLink>}
        />
      </Card>
    </div>
  );
}

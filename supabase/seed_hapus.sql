-- =============================================================================
-- seed_hapus.sql: menghapus SELURUH data dari supabase/seed.sql, tidak lebih.
--
-- Data seed dikenali dari nomor WhatsApp berawalan 6280000001 dan nama
-- berakhiran "(Uji)". Transaksi penjualan seed dikenali dari keterangannya.
-- Data lain (tiket nyata) tidak tersentuh.
--
-- Jalankan sebagai pemilik database, sebelum aplikasi dipakai sungguhan.
-- Tiket final mengunci komponen dan kelengkapannya, jadi trigger penguncinya
-- dimatikan sementara di dalam transaksi ini lalu dinyalakan lagi.
-- =============================================================================
begin;

create temp table seed_tiket on commit drop as
select t.tiket_id
  from public.tiket t
  join public.perangkat p  on p.perangkat_id = t.perangkat_id
  join public.pelanggan pl on pl.pelanggan_id = p.pelanggan_id
 where pl.no_whatsapp like '6280000001%' and pl.nama like '%(Uji)';

alter table public.spare_part       disable trigger spare_part_terkunci;
alter table public.kelengkapan_unit disable trigger kelengkapan_unit_terkunci;

delete from public.transaksi
 where tiket_id in (select tiket_id from seed_tiket)
    or (jenis = 'penjualan' and tiket_id is null and (
          keterangan like '%(data historis Excel)'
       or keterangan in ('Isi tinta + kabel LAN: servis dan penjualan tercampur dalam satu baris Excel',
                         'Tinta merah: kemungkinan tercatat dobel di Excel',
                         'Tinta Epson hitam 70ml', 'Mouse wireless')));

-- Kelengkapan, foto, riwayat, komponen, ulasan, pemberitahuan ikut terhapus (cascade).
delete from public.tiket where tiket_id in (select tiket_id from seed_tiket);

delete from public.perangkat
 where pelanggan_id in (select pelanggan_id from public.pelanggan
                         where no_whatsapp like '6280000001%' and nama like '%(Uji)');
delete from public.pelanggan where no_whatsapp like '6280000001%' and nama like '%(Uji)';

alter table public.spare_part       enable trigger spare_part_terkunci;
alter table public.kelengkapan_unit enable trigger kelengkapan_unit_terkunci;

-- Jika tidak ada tiket tersisa, nomor tiket kembali mulai dari 0001.
delete from public.nomor_tiket_tahunan where not exists (select 1 from public.tiket);

commit;

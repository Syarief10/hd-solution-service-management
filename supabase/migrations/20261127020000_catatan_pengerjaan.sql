-- =============================================================================
-- catatan_pengerjaan  (Iterasi 1: FR-23)
--
-- Catatan kerja bertanggal yang bisa ditambah tanpa mengubah status tiket.
-- Hanya ditambah: tidak bisa diubah atau dihapus (sama seperti riwayat_status).
-- Salah tulis diperbaiki dengan menambah catatan baru. Waktu diisi database:
-- authenticated hanya diberi izin INSERT pada kolom tiket_id dan isi.
-- Tiket berstatus final tidak bisa ditambahi catatan.
-- Catatan ini internal dan tidak dikirim ke halaman pelanggan.
-- =============================================================================
begin;

create table public.catatan_pengerjaan (
  catatan_id uuid        not null default gen_random_uuid(),
  tiket_id   uuid        not null,
  isi        text        not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint catatan_pengerjaan_pkey primary key (catatan_id),
  constraint catatan_pengerjaan_tiket_id_fkey foreign key (tiket_id)
    references public.tiket (tiket_id) on delete cascade,
  constraint catatan_pengerjaan_isi_check check (length(trim(isi)) between 1 and 1000)
);

create index idx_catatan_pengerjaan_tiket on public.catatan_pengerjaan (tiket_id, created_at);

create trigger catatan_pengerjaan_terkunci
  before insert or update or delete on public.catatan_pengerjaan
  for each row execute function public.trg_anak_tiket_terkunci();

alter table public.catatan_pengerjaan enable row level security;
create policy pemilik_baca   on public.catatan_pengerjaan for select to authenticated using (true);
create policy pemilik_tambah on public.catatan_pengerjaan for insert to authenticated with check (true);

revoke all on table public.catatan_pengerjaan from public, anon, authenticated, service_role;
grant select on table public.catatan_pengerjaan to authenticated;
grant insert (tiket_id, isi) on table public.catatan_pengerjaan to authenticated;

commit;

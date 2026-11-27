-- =============================================================================
-- komponen_dan_portal  (Iterasi 2: FR-53, FR-54, FR-60, US-21, US-23)
-- Prasyarat: 20261127030000_rincian_estimasi.
--
-- 1. spare_part: tanggal_pesan dan tanggal_tiba (mockup 04 "Dipesan 15 Okt, tiba 20 Okt").
-- 2. tiket.pakai_komponen: pilihan "Ada komponen" / "Tanpa komponen".
--    null = belum ditentukan. "Tanpa komponen" tidak boleh punya baris komponen.
-- 3. portal_ambil_tiket:
--    - linimasa TIDAK lagi memuat catatan teknis (catatan internal dan alasan
--      perubahan biaya sebelumnya ikut terkirim ke pelanggan);
--    - linimasa hanya berisi perubahan status (baris perubahan biaya dibuang);
--    - ditambah rincian estimasi (mockup 08) dan lama garansi per komponen.
--    Tanda tangan, izin, dan aturan token tidak berubah.
-- =============================================================================
begin;

alter table public.spare_part
  add column tanggal_pesan date,
  add column tanggal_tiba  date;

alter table public.spare_part
  add constraint spare_part_tanggal_check
  check (tanggal_pesan is null or tanggal_tiba is null or tanggal_tiba >= tanggal_pesan);

alter table public.tiket add column pakai_komponen boolean;

comment on column public.tiket.pakai_komponen is
  'true = ada komponen pengganti, false = servis jasa saja, null = belum ditentukan.';

create function public.trg_komponen_sesuai_pilihan()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
begin
  if exists (select 1 from tiket where tiket_id = new.tiket_id and pakai_komponen = false) then
    raise exception 'Tiket ditandai Tanpa komponen. Ubah pilihan menjadi Ada komponen dulu.';
  end if;
  return new;
end $function$;

create trigger spare_part_sesuai_pilihan
  before insert or update of tiket_id on public.spare_part
  for each row execute function public.trg_komponen_sesuai_pilihan();

create function public.trg_tiket_tanpa_komponen()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
begin
  if new.pakai_komponen = false
     and exists (select 1 from spare_part where tiket_id = new.tiket_id) then
    raise exception 'Masih ada komponen tercatat. Hapus dulu sebelum memilih Tanpa komponen.';
  end if;
  return new;
end $function$;

create trigger tiket_tanpa_komponen
  before update of pakai_komponen on public.tiket
  for each row execute function public.trg_tiket_tanpa_komponen();

create or replace function public.portal_ambil_tiket(p_token text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path = public
as $function$
declare
  t  tiket;
  p  perangkat;
  pl pelanggan;
begin
  if p_token is null or p_token !~ '^[2-9a-hjkmnp-z]{16}$' then return null; end if;

  select * into t from tiket where tracking_token = p_token;
  if not found then return null; end if;
  if t.token_berakhir is not null and t.token_berakhir <= now() then return null; end if;

  select * into p  from perangkat where perangkat_id = t.perangkat_id;
  select * into pl from pelanggan where pelanggan_id = p.pelanggan_id;

  return jsonb_build_object(
    'nomor_tiket',      t.nomor_tiket,
    'status',           t.status,
    'nama_pelanggan',   samarkan_nama(pl.nama),
    'no_whatsapp',      sensor_whatsapp(pl.no_whatsapp),
    'kategori',         p.kategori,
    'merk_tipe',        p.merk_tipe,
    'warna',            p.warna,
    'keluhan',          t.keluhan,
    'diagnosis',        t.diagnosis,
    'estimasi_biaya',   t.estimasi_biaya,
    'estimasi_selesai', t.estimasi_selesai,
    'rincian_estimasi', coalesce((select jsonb_agg(jsonb_build_object(
                                      'jenis', e.jenis, 'uraian', e.uraian, 'biaya', e.biaya)
                                      order by e.created_at)
                                    from rincian_estimasi e where e.tiket_id = t.tiket_id), '[]'::jsonb),
    'keputusan',        t.keputusan,
    'keputusan_cara',   t.keputusan_cara,
    'keputusan_at',     t.keputusan_at,
    'biaya',            t.biaya,
    'created_at',       t.created_at,
    'closed_at',        t.closed_at,
    'token_berakhir',   t.token_berakhir,
    'barang_bawaan',    coalesce((select jsonb_agg(k.nama_item order by k.nama_item)
                                    from kelengkapan_unit k
                                   where k.tiket_id = t.tiket_id and k.is_checked_in), '[]'::jsonb),
    'linimasa',         coalesce((select jsonb_agg(jsonb_build_object('status', s.status, 'waktu', s.created_at)
                                      order by s.created_at)
                                    from (select r.status, r.created_at,
                                                 lag(r.status) over (order by r.created_at, r.riwayat_id) as sebelumnya
                                            from riwayat_status r
                                           where r.tiket_id = t.tiket_id) s
                                   where s.status is distinct from s.sebelumnya), '[]'::jsonb),
    'garansi',          coalesce((select jsonb_agg(jsonb_build_object(
                                      'komponen', g.nama_komponen, 'lama_hari', g.lama_garansi_hari,
                                      'mulai', g.garansi_mulai, 'berakhir', g.garansi_berakhir,
                                      'status', g.status_garansi)
                                      order by g.nama_komponen)
                                    from v_garansi g where g.tiket_id = t.tiket_id), '[]'::jsonb),
    'bisa_ulas',        t.status = 'selesai'
                        and not exists (select 1 from ulasan_csat u where u.tiket_id = t.tiket_id)
  );
end $function$;

revoke all on function
  public.trg_komponen_sesuai_pilihan(), public.trg_tiket_tanpa_komponen()
  from public, anon, authenticated, service_role;

commit;

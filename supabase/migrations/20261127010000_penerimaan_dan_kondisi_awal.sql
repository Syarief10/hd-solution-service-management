-- =============================================================================
-- penerimaan_dan_kondisi_awal  (Iterasi 1: FR-10, FR-14)
--
-- 1. tiket.kondisi_fisik: kondisi fisik awal saat unit diterima. Boleh kosong
--    untuk tiket lama. Sekali terisi tidak bisa diubah (bukti serah terima).
-- 2. simpan_penerimaan(): menyimpan pelanggan, perangkat, tiket, dan
--    kelengkapan dalam SATU transaksi. Menggantikan penyimpanan bertahap di
--    aplikasi dengan perilaku yang sama:
--      - pelanggan dipakai ulang menurut nomor WhatsApp (nama lama tidak ditimpa);
--      - perangkat dipakai ulang menurut kategori, merk_tipe, nomor seri;
--      - kiriman ulang (Coba Lagi) untuk unit dan keluhan yang sama dalam
--        15 menit mengembalikan tiket yang sudah ada.
--
-- Hanya menambah objek; tidak mengubah data yang ada.
-- =============================================================================
begin;

alter table public.tiket add column kondisi_fisik text;

alter table public.tiket
  add constraint tiket_kondisi_fisik_check
  check (kondisi_fisik is null or length(trim(kondisi_fisik)) between 1 and 500);

comment on column public.tiket.kondisi_fisik is
  'Kondisi fisik awal saat diterima. Sekali terisi tidak bisa diubah.';

create function public.trg_tiket_kondisi_terkunci()
 returns trigger
 language plpgsql
 set search_path = public
as $function$
begin
  if old.kondisi_fisik is not null and new.kondisi_fisik is distinct from old.kondisi_fisik then
    raise exception 'Kondisi fisik awal tidak boleh diubah setelah tersimpan';
  end if;
  return new;
end $function$;

create trigger tiket_kondisi_terkunci
  before update of kondisi_fisik on public.tiket
  for each row execute function public.trg_tiket_kondisi_terkunci();

create function public.simpan_penerimaan(
  p_nama          text,
  p_whatsapp      text,
  p_kategori      text,
  p_merk_tipe     text,
  p_serial        text,
  p_keluhan       text,
  p_kondisi_fisik text,
  p_kelengkapan   text[] default '{}'
)
 returns jsonb
 language plpgsql
 set search_path = public
as $function$
declare
  v_wa      text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  v_serial  text := nullif(trim(coalesce(p_serial, '')), '');
  v_keluhan text := trim(coalesce(p_keluhan, ''));
  v_pel     uuid;
  v_prk     uuid;
  v         tiket;
  v_ulang   boolean := false;
begin
  if auth.uid() is null then raise exception 'Harus masuk sebagai pemilik'; end if;
  if nullif(trim(coalesce(p_kondisi_fisik, '')), '') is null then
    raise exception 'Kondisi fisik awal wajib diisi';
  end if;
  if left(v_wa, 1) = '0' then v_wa := '62' || substr(v_wa, 2); end if;

  -- Dua kiriman untuk nomor yang sama diproses bergiliran sampai transaksi selesai.
  perform pg_advisory_xact_lock(hashtextextended('penerimaan:' || v_wa, 0));

  select pelanggan_id into v_pel from pelanggan where no_whatsapp = v_wa;
  if v_pel is null then
    insert into pelanggan (nama, no_whatsapp) values (trim(p_nama), v_wa)
    returning pelanggan_id into v_pel;
  end if;

  select perangkat_id into v_prk
    from perangkat
   where pelanggan_id = v_pel and kategori = p_kategori
     and merk_tipe = trim(p_merk_tipe) and serial_number is not distinct from v_serial
   limit 1;
  if v_prk is null then
    insert into perangkat (pelanggan_id, kategori, merk_tipe, serial_number)
    values (v_pel, p_kategori, trim(p_merk_tipe), v_serial)
    returning perangkat_id into v_prk;
  end if;

  select * into v
    from tiket
   where perangkat_id = v_prk and keluhan = v_keluhan and status = 'diterima'
     and created_at >= now() - interval '15 minutes'
   order by created_at desc
   limit 1;

  if found then
    v_ulang := true;
  else
    insert into tiket (perangkat_id, keluhan, kondisi_fisik)
    values (v_prk, v_keluhan, trim(p_kondisi_fisik))
    returning * into v;

    insert into kelengkapan_unit (tiket_id, nama_item, is_checked_in)
    select v.tiket_id, trim(item), true
      from unnest(coalesce(p_kelengkapan, '{}')) as item
     where nullif(trim(item), '') is not null;
  end if;

  return jsonb_build_object(
    'tiket_id',        v.tiket_id,
    'nomor_tiket',     v.nomor_tiket,
    'tracking_token',  v.tracking_token,
    'pin_pengambilan', v.pin_pengambilan,
    'created_at',      v.created_at,
    'ulang',           v_ulang);
end $function$;

revoke all on function
  public.trg_tiket_kondisi_terkunci(),
  public.simpan_penerimaan(text, text, text, text, text, text, text, text[])
  from public, anon, authenticated, service_role;
grant execute on function
  public.simpan_penerimaan(text, text, text, text, text, text, text, text[])
  to authenticated;

commit;

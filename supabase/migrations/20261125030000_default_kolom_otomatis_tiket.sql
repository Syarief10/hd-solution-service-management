-- =============================================================================
-- default_kolom_otomatis_tiket
--
-- nomor_tiket, tracking_token, dan pin_pengambilan selalu diisi trigger
-- trg_tiket_sebelum_insert. Karena kolomnya NOT NULL tanpa default, tipe hasil
-- generate (TablesInsert<'tiket'>) mewajibkan aplikasi mengirim ketiganya.
--
-- Default string kosong hanya penanda agar kolom menjadi opsional di tipe.
-- Nilai apa pun (default atau kiriman aplikasi) selalu ditimpa trigger BEFORE
-- INSERT sebelum constraint diperiksa, jadi tidak ada baris yang tersimpan
-- dengan nilai kosong. UPDATE ke kolom-kolom ini tetap ditolak trigger update.
-- =============================================================================
begin;

alter table public.tiket
  alter column nomor_tiket     set default '',
  alter column tracking_token  set default '',
  alter column pin_pengambilan set default '';

comment on column public.tiket.nomor_tiket is
  'Diisi trigger (HD-TAHUN-urut). Default kosong hanya agar opsional saat insert.';
comment on column public.tiket.tracking_token is
  'Diisi trigger (token acak 16 karakter). Default kosong hanya agar opsional saat insert.';
comment on column public.tiket.pin_pengambilan is
  'Diisi trigger (PIN acak). Default kosong hanya agar opsional saat insert.';

commit;

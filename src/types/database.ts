// Tipe database hasil generate dari Supabase (proyek hd-solution-service).
// Jangan diedit manual. Generate ulang setelah setiap migration.
// Terakhir: 25 November 2026, setelah 20261125030000_default_kolom_otomatis_tiket.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      foto_perangkat: {
        Row: {
          foto_id: string
          storage_path: string
          tiket_id: string
        }
        Insert: {
          foto_id?: string
          storage_path: string
          tiket_id: string
        }
        Update: {
          foto_id?: string
          storage_path?: string
          tiket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foto_perangkat_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "tiket"
            referencedColumns: ["tiket_id"]
          },
          {
            foreignKeyName: "foto_perangkat_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "v_antrean_prioritas"
            referencedColumns: ["tiket_id"]
          },
        ]
      }
      kelengkapan_unit: {
        Row: {
          is_checked_in: boolean
          is_checked_out: boolean
          kelengkapan_id: string
          nama_item: string
          tiket_id: string
        }
        Insert: {
          is_checked_in?: boolean
          is_checked_out?: boolean
          kelengkapan_id?: string
          nama_item: string
          tiket_id: string
        }
        Update: {
          is_checked_in?: boolean
          is_checked_out?: boolean
          kelengkapan_id?: string
          nama_item?: string
          tiket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kelengkapan_unit_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "tiket"
            referencedColumns: ["tiket_id"]
          },
          {
            foreignKeyName: "kelengkapan_unit_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "v_antrean_prioritas"
            referencedColumns: ["tiket_id"]
          },
        ]
      }
      nomor_tiket_tahunan: {
        Row: {
          tahun: number
          terakhir: number
        }
        Insert: {
          tahun: number
          terakhir: number
        }
        Update: {
          tahun?: number
          terakhir?: number
        }
        Relationships: []
      }
      pelanggan: {
        Row: {
          created_at: string
          nama: string
          no_whatsapp: string
          pelanggan_id: string
        }
        Insert: {
          created_at?: string
          nama: string
          no_whatsapp: string
          pelanggan_id?: string
        }
        Update: {
          created_at?: string
          nama?: string
          no_whatsapp?: string
          pelanggan_id?: string
        }
        Relationships: []
      }
      pemberitahuan: {
        Row: {
          catatan: string | null
          dikirim_at: string
          diperbarui_at: string | null
          hasil: string
          jenis: string
          pemberitahuan_id: string
          tiket_id: string
          tindak_lanjut: string | null
        }
        Insert: {
          catatan?: string | null
          dikirim_at?: string
          diperbarui_at?: string | null
          hasil?: string
          jenis: string
          pemberitahuan_id?: string
          tiket_id: string
          tindak_lanjut?: string | null
        }
        Update: {
          catatan?: string | null
          dikirim_at?: string
          diperbarui_at?: string | null
          hasil?: string
          jenis?: string
          pemberitahuan_id?: string
          tiket_id?: string
          tindak_lanjut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pemberitahuan_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "tiket"
            referencedColumns: ["tiket_id"]
          },
          {
            foreignKeyName: "pemberitahuan_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "v_antrean_prioritas"
            referencedColumns: ["tiket_id"]
          },
        ]
      }
      perangkat: {
        Row: {
          kategori: string
          merk_tipe: string
          pelanggan_id: string
          perangkat_id: string
          serial_number: string | null
          spesifikasi: string | null
          warna: string | null
        }
        Insert: {
          kategori: string
          merk_tipe: string
          pelanggan_id: string
          perangkat_id?: string
          serial_number?: string | null
          spesifikasi?: string | null
          warna?: string | null
        }
        Update: {
          kategori?: string
          merk_tipe?: string
          pelanggan_id?: string
          perangkat_id?: string
          serial_number?: string | null
          spesifikasi?: string | null
          warna?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perangkat_pelanggan_id_fkey"
            columns: ["pelanggan_id"]
            isOneToOne: false
            referencedRelation: "pelanggan"
            referencedColumns: ["pelanggan_id"]
          },
        ]
      }
      riwayat_status: {
        Row: {
          catatan_teknis: string | null
          created_at: string
          riwayat_id: string
          status: string
          tiket_id: string
        }
        Insert: {
          catatan_teknis?: string | null
          created_at?: string
          riwayat_id?: string
          status: string
          tiket_id: string
        }
        Update: {
          catatan_teknis?: string | null
          created_at?: string
          riwayat_id?: string
          status?: string
          tiket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "riwayat_status_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "tiket"
            referencedColumns: ["tiket_id"]
          },
          {
            foreignKeyName: "riwayat_status_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "v_antrean_prioritas"
            referencedColumns: ["tiket_id"]
          },
        ]
      }
      spare_part: {
        Row: {
          biaya: number | null
          estimasi_tiba: string | null
          lama_garansi_hari: number
          nama_komponen: string
          sparepart_id: string
          status_pengadaan: string
          tanggal_pasang: string | null
          tiket_id: string
        }
        Insert: {
          biaya?: number | null
          estimasi_tiba?: string | null
          lama_garansi_hari?: number
          nama_komponen: string
          sparepart_id?: string
          status_pengadaan?: string
          tanggal_pasang?: string | null
          tiket_id: string
        }
        Update: {
          biaya?: number | null
          estimasi_tiba?: string | null
          lama_garansi_hari?: number
          nama_komponen?: string
          sparepart_id?: string
          status_pengadaan?: string
          tanggal_pasang?: string | null
          tiket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spare_part_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "tiket"
            referencedColumns: ["tiket_id"]
          },
          {
            foreignKeyName: "spare_part_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "v_antrean_prioritas"
            referencedColumns: ["tiket_id"]
          },
        ]
      }
      tiket: {
        Row: {
          biaya: number
          closed_at: string | null
          created_at: string
          diagnosis: string | null
          estimasi_biaya: number | null
          estimasi_selesai: string | null
          keluhan: string
          keputusan: string
          keputusan_alasan: string | null
          keputusan_at: string | null
          keputusan_cara: string | null
          nomor_tiket: string
          perangkat_id: string
          pin_pengambilan: string
          status: string
          tiket_id: string
          token_berakhir: string | null
          tracking_token: string
          urgensi: string
        }
        Insert: {
          biaya?: number
          closed_at?: string | null
          created_at?: string
          diagnosis?: string | null
          estimasi_biaya?: number | null
          estimasi_selesai?: string | null
          keluhan: string
          keputusan?: string
          keputusan_alasan?: string | null
          keputusan_at?: string | null
          keputusan_cara?: string | null
          nomor_tiket?: string
          perangkat_id: string
          pin_pengambilan?: string
          status?: string
          tiket_id?: string
          token_berakhir?: string | null
          tracking_token?: string
          urgensi?: string
        }
        Update: {
          biaya?: number
          closed_at?: string | null
          created_at?: string
          diagnosis?: string | null
          estimasi_biaya?: number | null
          estimasi_selesai?: string | null
          keluhan?: string
          keputusan?: string
          keputusan_alasan?: string | null
          keputusan_at?: string | null
          keputusan_cara?: string | null
          nomor_tiket?: string
          perangkat_id?: string
          pin_pengambilan?: string
          status?: string
          tiket_id?: string
          token_berakhir?: string | null
          tracking_token?: string
          urgensi?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiket_perangkat_id_fkey"
            columns: ["perangkat_id"]
            isOneToOne: false
            referencedRelation: "perangkat"
            referencedColumns: ["perangkat_id"]
          },
        ]
      }
      transaksi: {
        Row: {
          created_at: string
          is_lengkap: boolean
          jenis: string
          keterangan: string | null
          metode: string | null
          nominal: number
          tanggal: string
          tiket_id: string | null
          transaksi_id: string
        }
        Insert: {
          created_at?: string
          is_lengkap?: boolean
          jenis: string
          keterangan?: string | null
          metode?: string | null
          nominal: number
          tanggal?: string
          tiket_id?: string | null
          transaksi_id?: string
        }
        Update: {
          created_at?: string
          is_lengkap?: boolean
          jenis?: string
          keterangan?: string | null
          metode?: string | null
          nominal?: number
          tanggal?: string
          tiket_id?: string | null
          transaksi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaksi_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "tiket"
            referencedColumns: ["tiket_id"]
          },
          {
            foreignKeyName: "transaksi_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "v_antrean_prioritas"
            referencedColumns: ["tiket_id"]
          },
        ]
      }
      ulasan_csat: {
        Row: {
          created_at: string
          skor_bintang: number
          tiket_id: string
          ulasan: string | null
          ulasan_id: string
        }
        Insert: {
          created_at?: string
          skor_bintang: number
          tiket_id: string
          ulasan?: string | null
          ulasan_id?: string
        }
        Update: {
          created_at?: string
          skor_bintang?: number
          tiket_id?: string
          ulasan?: string | null
          ulasan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ulasan_csat_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: true
            referencedRelation: "tiket"
            referencedColumns: ["tiket_id"]
          },
          {
            foreignKeyName: "ulasan_csat_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: true
            referencedRelation: "v_antrean_prioritas"
            referencedColumns: ["tiket_id"]
          },
        ]
      }
    }
    Views: {
      v_antrean_prioritas: {
        Row: {
          alasan_prioritas: string | null
          biaya: number | null
          created_at: string | null
          estimasi_selesai: string | null
          kategori: string | null
          merk_tipe: string | null
          nama_pelanggan: string | null
          nomor_tiket: string | null
          skor_prioritas: number | null
          status: string | null
          terlambat: boolean | null
          tiket_id: string | null
          warna: string | null
        }
        Relationships: []
      }
      v_dashboard_kpi: {
        Row: {
          csat_persen: number | null
          jumlah_ulasan: number | null
          menunggu_part: number | null
          rata_durasi_jam: number | null
          rata_rating: number | null
          siap_diambil: number | null
          unit_aktif: number | null
          unit_terlambat: number | null
        }
        Relationships: []
      }
      v_garansi: {
        Row: {
          biaya: number | null
          garansi_berakhir: string | null
          garansi_mulai: string | null
          kategori: string | null
          lama_garansi_hari: number | null
          merk_tipe: string | null
          nama_komponen: string | null
          nama_pelanggan: string | null
          nomor_tiket: string | null
          sisa_hari: number | null
          sparepart_id: string | null
          status_garansi: string | null
          status_tiket: string | null
          tanggal_pasang: string | null
          tiket_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spare_part_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "tiket"
            referencedColumns: ["tiket_id"]
          },
          {
            foreignKeyName: "spare_part_tiket_id_fkey"
            columns: ["tiket_id"]
            isOneToOne: false
            referencedRelation: "v_antrean_prioritas"
            referencedColumns: ["tiket_id"]
          },
        ]
      }
      v_pendapatan_bulanan: {
        Row: {
          bulan: string | null
          jumlah_penjualan: number | null
          jumlah_servis: number | null
          jumlah_tidak_lengkap: number | null
          jumlah_transaksi: number | null
          pendapatan: number | null
          rata_durasi_jam: number | null
          rata_per_transaksi: number | null
        }
        Relationships: []
      }
      v_pendapatan_kategori: {
        Row: {
          bulan: string | null
          jumlah_transaksi: number | null
          kategori: string | null
          pendapatan: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      buat_pin_acak: { Args: never; Returns: string }
      buat_token_acak: { Args: never; Returns: string }
      buat_ulang_akses_portal: { Args: { p_tiket_id: string }; Returns: string }
      cari_unit_serupa: {
        Args: { p_merk_tipe: string; p_warna?: string }
        Returns: {
          merk_tipe: string
          nomor_tiket: string
          status: string
          tiket_id: string
          warna: string
        }[]
      }
      format_rupiah: { Args: { p: number }; Returns: string }
      masa_link_hari: { Args: never; Returns: number }
      perbarui_status: {
        Args: { p_catatan?: string; p_status: string; p_tiket_id: string }
        Returns: undefined
      }
      portal_ambil_tiket: { Args: { p_token: string }; Returns: Json }
      portal_kirim_ulasan: {
        Args: { p_skor: number; p_token: string; p_ulasan?: string }
        Returns: boolean
      }
      samarkan_nama: { Args: { p_nama: string }; Returns: string }
      sensor_whatsapp: { Args: { p_no: string }; Returns: string }
      transisi_status_diizinkan: {
        Args: { p_dari: string; p_ke: string }
        Returns: boolean
      }
      tutup_tiket: {
        Args: {
          p_metode: string
          p_nominal?: number
          p_pin?: string
          p_tiket_id: string
        }
        Returns: string
      }
      ubah_biaya: {
        Args: { p_alasan: string; p_biaya_baru: number; p_tiket_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

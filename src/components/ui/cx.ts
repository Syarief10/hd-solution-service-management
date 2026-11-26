/** Menggabungkan nama kelas; nilai kosong atau false diabaikan. */
export function cx(...kelas: Array<string | false | null | undefined>): string {
  return kelas.filter(Boolean).join(" ");
}

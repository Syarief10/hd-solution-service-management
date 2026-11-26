"use client";

import { useSearchParams } from "next/navigation";

// Membawa halaman asal (?next=) ke server action login. Nilainya diperiksa lagi di server.
export function InputTujuan() {
  const next = useSearchParams().get("next") ?? "";
  return <input type="hidden" name="next" value={next} />;
}

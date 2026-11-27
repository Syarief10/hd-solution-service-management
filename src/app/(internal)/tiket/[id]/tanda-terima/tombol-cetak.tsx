"use client";

import { Button } from "@/components/ui";

export function TombolCetak() {
  return (
    <Button ikon="ticket" onClick={() => window.print()}>
      Cetak
    </Button>
  );
}

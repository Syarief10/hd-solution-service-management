import { cx } from "@/components/ui";

export function LogoHD({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx("flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-primary text-sm font-bold tracking-tight text-white", className)}>
      HD
    </span>
  );
}

import Image from "next/image";
import { cn } from "@/lib/utils";

// One mark, one file, so the sidebar, login and empty states never drift apart.
export function LogoMark({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/logo-mark.svg"
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      priority
    />
  );
}

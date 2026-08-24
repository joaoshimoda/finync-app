import Image from "next/image";

import { cn } from "@/lib/utils";

interface FinyncLogoProps {
  className?: string;
  eager?: boolean;
}

export function FinyncLogo({ className, eager = false }: FinyncLogoProps) {
  return (
    <Image
      src="/finync-logo.svg"
      alt="Finync"
      width={650}
      height={294}
      loading={eager ? "eager" : "lazy"}
      unoptimized
      className={cn("h-auto object-contain", className)}
    />
  );
}

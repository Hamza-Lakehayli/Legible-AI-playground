"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { usePlaygroundEntry } from "./playground-entry-provider";

export function PlaygroundEntryLink({
  children,
  className,
  onClick,
  prefetch = false,
  variant,
  size,
}: {
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  prefetch?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const { begin } = usePlaygroundEntry();

  return (
    <Link
      href="/playground"
      prefetch={prefetch}
      data-playground-entry=""
      className={variant ? buttonVariants({ variant, size, className }) : className}
      onClick={(event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const rect = event.currentTarget.getBoundingClientRect();
        // Measure before the consumer closes the mobile navigation.
        const origin = event.detail > 0 ? { x: event.clientX, y: event.clientY } : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        onClick?.(event);
        if (event.defaultPrevented) return;
        const started = begin(origin);
        if (started) event.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}

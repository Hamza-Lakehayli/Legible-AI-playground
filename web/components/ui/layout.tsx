import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Marketing content width: ~1280px with comfortable gutters (brief §14). */
export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-5xl px-6 md:px-10", className)}
      {...props}
    />
  );
}

/** Section rhythm: 80–120px desktop, 48–72px mobile (brief §14). */
export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("py-14 md:py-24", className)}
      {...props}
    />
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lede,
  className,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className="font-mono text-xs font-medium tracking-[0.14em] text-accent-ink uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
        {title}
      </h2>
      {lede ? <p className="mt-4 text-base/7 text-muted">{lede}</p> : null}
    </div>
  );
}

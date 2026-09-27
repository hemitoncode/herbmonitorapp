import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2 text-[12px] leading-none font-semibold whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        leaf: "bg-leaf-wash text-leaf-deep",
        amber: "bg-amber-wash text-amber-deep",
        water: "bg-water-wash text-water-deep",
        neutral: "bg-paper-deep text-ink-soft",
        offline: "bg-offline-wash text-ink-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Status dot with an optional live pulse. */
export function StatusDot({ tone, pulse = false, className }: { tone: BadgeTone; pulse?: boolean; className?: string }) {
  const color = {
    leaf: "bg-leaf",
    amber: "bg-amber",
    water: "bg-water",
    neutral: "bg-ink-muted",
    offline: "bg-offline",
  }[tone];
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden>
      {pulse && <span className={cn("absolute inset-0 animate-ripple rounded-full", color)} />}
      <span className={cn("relative size-2 rounded-full", color)} />
    </span>
  );
}

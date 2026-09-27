import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends Omit<ComponentProps<typeof SliderPrimitive.Root>, "children"> {
  tone?: "ink" | "amber" | "leaf" | "water" | "bench";
  /** Extra layers rendered inside the track (reference bands, markers). */
  trackChildren?: ReactNode;
  thumbLabel: string;
}

const rangeTone = {
  ink: "bg-ink",
  amber: "bg-amber",
  leaf: "bg-leaf",
  water: "bg-water",
  bench: "bg-bench-text",
};

export function Slider({ className, tone = "ink", trackChildren, thumbLabel, ...props }: SliderProps) {
  const onBench = tone === "bench";
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex h-6 w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn("relative h-1.5 grow overflow-hidden rounded-full", onBench ? "bg-bench-rule" : "bg-paper-deep")}
      >
        {trackChildren}
        <SliderPrimitive.Range className={cn("absolute h-full rounded-full", rangeTone[tone])} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={thumbLabel}
        className={cn(
          "block size-5 cursor-grab rounded-full border-2 shadow-md transition-transform duration-150 active:cursor-grabbing active:scale-110",
          onBench ? "border-bench-text bg-bench" : "border-ink bg-card",
        )}
      />
    </SliderPrimitive.Root>
  );
}

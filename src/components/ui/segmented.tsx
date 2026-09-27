import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: ReactNode;
  hint?: string;
}

interface SegmentedProps<T extends string | number> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  label: string;
  theme?: "paper" | "bench";
  size?: "sm" | "md";
  className?: string;
}

/** Radio-group semantics with roving focus (arrow keys move and select). */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  theme = "paper",
  size = "md",
  className,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const bench = theme === "bench";

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex rounded-full p-1",
        bench ? "bg-bench-raised ring-1 ring-bench-rule" : "bg-paper-deep/80 ring-1 ring-rule",
        className,
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            title={option.hint}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors duration-200 [&_svg]:size-3.5",
              size === "sm" ? "h-7 px-3 text-[12px]" : "h-8 px-3.5 text-[13px]",
              bench
                ? active
                  ? "bg-bench-text text-bench"
                  : "text-bench-muted hover:text-bench-text"
                : active
                  ? "bg-card text-ink shadow-[0_1px_2px_rgb(24_38_30/0.12)]"
                  : "text-ink-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

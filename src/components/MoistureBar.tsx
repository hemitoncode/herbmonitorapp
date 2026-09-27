import { cn } from "@/lib/utils";

const fill = {
  water: "bg-water",
  amber: "bg-amber",
  leaf: "bg-leaf",
  offline: "bg-offline",
};
const track = {
  water: "bg-water-wash",
  amber: "bg-amber-wash",
  leaf: "bg-leaf-wash",
  offline: "bg-offline-wash",
};

/** Horizontal soil-moisture meter with a threshold tick. Track is a lighter step of the fill's hue. */
export function MoistureBar({
  value,
  threshold,
  tone,
  className,
}: {
  value: number | null;
  threshold: number;
  tone: keyof typeof fill;
  className?: string;
}) {
  return (
    <div className={cn("relative h-2 rounded-full transition-colors duration-500", track[tone], className)}>
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-300 ease-out", fill[tone])}
        style={{ width: `${value ?? 0}%` }}
      />
      <div className="absolute -inset-y-1 w-0.5 rounded-full bg-ink" style={{ left: `calc(${threshold}% - 1px)` }} aria-hidden />
    </div>
  );
}

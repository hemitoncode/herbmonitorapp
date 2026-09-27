import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none",
    "transition-[background-color,color,box-shadow,transform] duration-200 ease-out",
    "active:translate-y-px disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper shadow-[0_1px_0_rgb(255_255_255/0.08)_inset] hover:bg-ink-soft",
        leaf: "bg-leaf text-white hover:bg-leaf-deep",
        water: "bg-water text-white shadow-[0_8px_20px_-10px_var(--color-water)] hover:bg-water-deep",
        outline: "border border-rule-strong bg-card/70 text-ink hover:border-ink-soft hover:bg-card",
        ghost: "text-ink-soft hover:bg-ink/5 hover:text-ink",
        stop: "bg-ink text-paper ring-4 ring-water/25 hover:bg-ink-soft",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px]",
        md: "h-10 px-4.5 text-sm",
        lg: "h-13 px-6 text-[15px] [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

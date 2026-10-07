import Link from "next/link";
import { cn } from "@/utils/cn";

const variants = {
  primary: "bg-ink text-ivory hover:bg-ink-3",
  gold: "bg-gold text-ink hover:bg-gold-light",
  outline: "border border-ink/15 bg-white text-ink hover:border-ink/40",
  "outline-light": "border border-ivory/30 text-ivory hover:border-gold-light hover:text-gold-light",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-red-700 text-white hover:bg-red-800",
  "danger-outline": "border border-red-200 bg-white text-red-700 hover:bg-red-50",
} as const;

const sizes = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-sm gap-2 tracking-wide",
  xl: "h-14 px-8 text-[15px] gap-2.5 tracking-wide",
  icon: "h-9 w-9",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-md font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type LinkButtonProps = React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

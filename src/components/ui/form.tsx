import { cn } from "@/utils/cn";

export const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/60 transition focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:bg-sand/40 aria-[invalid=true]:border-red-400 sm:text-sm";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, "h-11 py-0", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-24", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClass, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236f675d%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat py-0 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, error, children, className, htmlFor, required }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string; htmlFor?: string; required?: boolean }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink/80">
        {label}
        {required && <span className="ml-0.5 text-gold-dark">*</span>}
      </label>
      {children}
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-sm text-ink/85", className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-line accent-[var(--color-gold-dark)]" {...props} />
      {label}
    </label>
  );
}

export function FormAlert({ state }: { state: { ok: boolean; error?: string; message?: string } | null }) {
  if (!state) return null;
  if (state.ok && !state.message) return null;
  return (
    <div role={state.ok ? "status" : "alert"} className={cn("rounded-md border px-3 py-2.5 text-sm", state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800")}>
      {state.ok ? state.message : state.error}
    </div>
  );
}

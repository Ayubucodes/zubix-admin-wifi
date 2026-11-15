import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

/*
 * Flat design system: solid fills, 1px neutral rings instead of shadows or elevation,
 * small consistent radii. Do not add shadow-* or elevated styles here.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type LoadingIndicator = "shimmer" | "spinner";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-700/50",
  secondary: "bg-white text-neutral-900 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:text-neutral-400",
  ghost: "text-neutral-700 hover:bg-neutral-100 disabled:text-neutral-400",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50",
};

export function Button({
  variant = "primary",
  loading = false,
  loadingIndicator = "shimmer",
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean; loadingIndicator?: LoadingIndicator }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed ${buttonVariants[variant]} ${className}`}
    >
      {loading &&
        (loadingIndicator === "spinner" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Skeleton className="size-4 rounded-sm" />
        ))}
      {children}
    </button>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded ${className}`} />;
}

function LoadingStatus({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <Skeleton className="h-3 w-2/5" />
      <Skeleton className="mt-3 h-7 w-3/5" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5, label = "Loading table" }: { rows?: number; columns?: number; label?: string }) {
  const gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  return (
    <LoadingStatus label={label}>
      <div className="-mx-5 overflow-hidden px-5">
        <div className="grid gap-4 border-b border-neutral-200 py-3" style={{ gridTemplateColumns }}>
          {Array.from({ length: columns }, (_, index) => <Skeleton key={index} className="h-3 w-3/4" />)}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="grid gap-4 border-b border-neutral-100 py-4" style={{ gridTemplateColumns }}>
            {Array.from({ length: columns }, (_, column) => (
              <Skeleton key={column} className={`h-4 ${column === 0 ? "w-4/5" : "w-full"}`} />
            ))}
          </div>
        ))}
      </div>
    </LoadingStatus>
  );
}

export function DetailSkeleton() {
  return (
    <LoadingStatus label="Loading details">
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index}>
              <Skeleton className="mb-2 h-3 w-1/3" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-4 w-full" />)}
        </div>
      </div>
    </LoadingStatus>
  );
}

export function DashboardSkeleton() {
  return (
    <LoadingStatus label="Loading dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <SkeletonTile key={index} />)}
        </div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => <SkeletonTile key={index} />)}
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <Skeleton className="mb-6 h-4 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </LoadingStatus>
  );
}

export function NetworkSkeleton() {
  return (
    <LoadingStatus label="Loading network overview">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <SkeletonTile key={index} />)}
        </div>
        {[4, 5].map((columns) => (
          <div key={columns} className="rounded-lg border border-neutral-200 bg-white p-5">
            <Skeleton className="mb-4 h-4 w-36" />
            <TableSkeleton rows={3} columns={columns} />
          </div>
        ))}
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <Skeleton className="mb-4 h-4 w-36" />
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-4 w-full" />)}
          </div>
        </div>
      </div>
    </LoadingStatus>
  );
}

export function ProviderListSkeleton() {
  return (
    <LoadingStatus label="Loading payment providers">
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-4 py-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-9 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </LoadingStatus>
  );
}

export function ReportSkeleton() {
  return (
    <LoadingStatus label="Loading report">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <SkeletonTile key={index} />)}
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <Skeleton className="mb-6 h-4 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <Skeleton className="mb-4 h-4 w-48" />
          <TableSkeleton rows={4} columns={3} />
        </div>
      </div>
    </LoadingStatus>
  );
}

export function AppLoadingSkeleton() {
  return (
    <LoadingStatus label="Checking your session">
      <div className="h-dvh overflow-hidden md:flex">
        <aside className="hidden border-r border-neutral-200 bg-white p-5 md:block md:h-dvh md:w-56 md:overflow-y-auto">
          <Skeleton className="mb-8 h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-9 w-full" />)}
          </div>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-8">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-24" />
          </header>
          <main className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-6 md:px-8">
            <Skeleton className="h-7 w-40" />
            <DashboardSkeleton />
          </main>
        </div>
      </div>
    </LoadingStatus>
  );
}

const fieldBase =
  "block w-full rounded-md border-0 bg-white px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 disabled:bg-neutral-100";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-neutral-500">{hint}</span>}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Card({ title, actions, children, className = "" }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-neutral-200 bg-white ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatTile({ label, value, hint, loading = false }: { label: string; value: string; hint?: string; loading?: boolean }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-900">
        {loading ? <Skeleton className="mt-1 h-6 w-3/5" /> : value}
      </p>
      {hint && !loading && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "info" | "success"; children: ReactNode }) {
  const tones = {
    danger: "bg-red-50 text-red-800 ring-red-200",
    info: "bg-sky-50 text-sky-800 ring-sky-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  };
  return <div role={tone === "danger" ? "alert" : "status"} className={`rounded-md px-4 py-3 text-sm ring-1 ring-inset ${tones[tone]}`}>{children}</div>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-10 text-center">
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

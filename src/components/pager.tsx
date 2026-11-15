import { Button } from "./ui";

export function Pager({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm text-neutral-600">
      <span>
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="-mx-5 overflow-x-auto px-5">{children}</div>;
}

export const tableClass = "min-w-full divide-y divide-neutral-200 text-sm";
export const thClass = "py-2.5 pr-4 text-left text-xs font-medium uppercase tracking-wide text-neutral-500";
export const tdClass = "py-3 pr-4 align-top text-neutral-800";

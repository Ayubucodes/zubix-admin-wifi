import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Select, Spinner, Input } from "../components/ui";
import { Pager, TableWrap, tableClass, tdClass, thClass } from "../components/pager";
import { ApiError, apiFetch } from "../lib/api";
import { formatDateTime, formatTzs } from "../lib/format";
import { useAuth } from "../features/auth/AuthContext";
import type { PagedResult, PaymentDto } from "../types/api";

const PAGE_SIZE = 20;
const STATUSES = ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED"] as const;

const statusTone: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  SUCCESS: "success",
  PENDING: "warning",
  PROCESSING: "info",
  FAILED: "danger",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
  REFUNDED: "info",
};

export function PaymentsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [search, setSearch] = useState("");
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["payments", { page, status, provider, search }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      if (provider) params.set("providerCode", provider);
      if (search.trim()) params.set("search", search.trim());
      return apiFetch<PagedResult<PaymentDto>>(`/payments?${params.toString()}`);
    },
    enabled: hasPermission("payments:read"),
  });

  const detailQuery = useQuery({
    queryKey: ["payments", "detail", selectedRef],
    queryFn: () => apiFetch<PaymentDto>(`/payments/${selectedRef}`),
    enabled: selectedRef !== null,
  });

  const simulateMutation = useMutation({
    mutationFn: ({ reference, outcome }: { reference: string; outcome: "SUCCESS" | "FAILED" }) =>
      apiFetch<{ outcome: unknown }>(`/payments/dev/mock/${reference}/complete`, {
        method: "POST",
        body: JSON.stringify({ status: outcome }),
      }),
    onSuccess: (_data, vars) => {
      setNotice(`Mock payment set to ${vars.outcome}. Subscription activation runs only on SUCCESS.`);
      void queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.status === 404) {
        setNotice("Mock simulation is not available on this server (it is disabled in production).");
      } else {
        setNotice(error.message);
      }
    },
  });

  const canSimulate = (p: PaymentDto) => p.providerCode === "MOCK" && (p.status === "PENDING" || p.status === "PROCESSING");

  return (
    <>
      <PageHeader title="Payments" description="Every payment attempt, its provider, and its outcome. Amounts are in TZS." />
      {notice && <Alert tone="info">{notice}</Alert>}

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_11rem_11rem]">
          <Input
            aria-label="Search payments"
            placeholder="Search by reference or phone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </Select>
          <Select aria-label="Filter by provider" value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }}>
            <option value="">All providers</option>
            <option value="CLICKPESA">ClickPesa</option>
            <option value="SELCOM">Selcom</option>
            <option value="MOCK">Mock (testing)</option>
          </Select>
        </div>

        {listQuery.isLoading && <Spinner />}
        {listQuery.isError && <Alert>{(listQuery.error as Error).message}</Alert>}
        {listQuery.data && listQuery.data.items.length === 0 && <EmptyState title="No payments match these filters" />}
        {listQuery.data && listQuery.data.items.length > 0 && (
          <>
            <TableWrap>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Reference</th>
                    <th className={thClass}>Package</th>
                    <th className={thClass}>Amount</th>
                    <th className={thClass}>Provider</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Initiated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {listQuery.data.items.map((p) => (
                    <tr key={p.id} className={selectedRef === p.reference ? "bg-brand-50/40" : ""}>
                      <td className={`${tdClass} tabular-nums`}>
                        <button type="button" className="font-medium text-brand-800 hover:underline" onClick={() => setSelectedRef(p.reference)}>
                          {p.reference}
                        </button>
                      </td>
                      <td className={tdClass}>{p.packageName ?? "—"}</td>
                      <td className={`${tdClass} tabular-nums`}>{formatTzs(p.amountTzs)}</td>
                      <td className={tdClass}>{p.providerName ?? "—"}</td>
                      <td className={tdClass}><Badge tone={statusTone[p.status] ?? "neutral"}>{p.status.toLowerCase()}</Badge></td>
                      <td className={tdClass}>{formatDateTime(p.initiatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <Pager page={page} pageSize={PAGE_SIZE} total={listQuery.data.total} onChange={setPage} />
          </>
        )}
      </Card>

      {selectedRef && (
        <Card title={`Payment ${selectedRef}`} actions={<Button variant="ghost" onClick={() => setSelectedRef(null)}>Close</Button>}>
          {detailQuery.isLoading && <Spinner />}
          {detailQuery.data && (
            <div className="space-y-5 text-sm">
              <dl className="grid gap-4 sm:grid-cols-3">
                <div><dt className="text-neutral-500">Amount</dt><dd className="font-medium tabular-nums">{formatTzs(detailQuery.data.amountTzs)}</dd></div>
                <div><dt className="text-neutral-500">Phone</dt><dd className="tabular-nums">{detailQuery.data.phoneNumber}</dd></div>
                <div><dt className="text-neutral-500">Status</dt><dd>{detailQuery.data.status.toLowerCase()}</dd></div>
                <div><dt className="text-neutral-500">Provider</dt><dd>{detailQuery.data.providerName ?? "—"}</dd></div>
                <div><dt className="text-neutral-500">Provider transaction</dt><dd className="break-all tabular-nums">{detailQuery.data.providerTransactionId ?? "—"}</dd></div>
                <div><dt className="text-neutral-500">Paid at</dt><dd>{formatDateTime(detailQuery.data.paidAt)}</dd></div>
                {detailQuery.data.failureReason && (
                  <div className="sm:col-span-3"><dt className="text-neutral-500">Failure reason</dt><dd>{detailQuery.data.failureReason}</dd></div>
                )}
              </dl>

              {hasPermission("payments:reconcile") && canSimulate(detailQuery.data) && (
                <div className="rounded-md bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
                  <p className="font-medium text-amber-900">Mock provider: simulate the customer's response</p>
                  <p className="mt-1 text-amber-800">This is for testing only. It is not available in production.</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => simulateMutation.mutate({ reference: selectedRef, outcome: "SUCCESS" })}
                      loading={simulateMutation.isPending}
                    >
                      Simulate success
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => simulateMutation.mutate({ reference: selectedRef, outcome: "FAILED" })}
                      disabled={simulateMutation.isPending}
                    >
                      Simulate failure
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </>
  );
}

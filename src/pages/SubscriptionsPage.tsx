import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, DetailSkeleton, EmptyState, Field, PageHeader, Select, TableSkeleton, Textarea } from "../components/ui";
import { Pager, TableWrap, tableClass, tdClass, thClass } from "../components/pager";
import { apiFetch } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { useAuth } from "../features/auth/AuthContext";
import type { PagedResult, SubscriptionDetail, SubscriptionListItem } from "../types/api";

const PAGE_SIZE = 20;

const statusTone: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  PENDING: "warning",
  SUSPENDED: "danger",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
};

export function SubscriptionsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("subscriptions:manage");
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["subscriptions", { page, status }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      return apiFetch<PagedResult<SubscriptionListItem>>(`/subscriptions?${params.toString()}`);
    },
  });

  const detailQuery = useQuery({
    queryKey: ["subscriptions", selectedId],
    queryFn: () => apiFetch<SubscriptionDetail>(`/subscriptions/${selectedId}`),
    enabled: selectedId !== null,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<SubscriptionDetail>(`/subscriptions/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      setNotice("Subscription cancelled. Time was removed and the change is in the history.");
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const canCancel = (s: SubscriptionDetail) => canManage && (s.status === "ACTIVE" || s.status === "PENDING");

  return (
    <>
      <PageHeader title="Subscriptions" description="Time-based access bought with payments or vouchers." />
      {notice && <Alert tone="info">{notice}</Alert>}

      <Card>
        <div className="mb-4 max-w-xs">
          <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        </div>

        {listQuery.isLoading && <TableSkeleton columns={5} label="Loading subscriptions" />}
        {listQuery.isError && <Alert>{(listQuery.error as Error).message}</Alert>}
        {listQuery.data && listQuery.data.items.length === 0 && <EmptyState title="No subscriptions yet" />}
        {listQuery.data && listQuery.data.items.length > 0 && (
          <>
            <TableWrap>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Customer</th>
                    <th className={thClass}>Package</th>
                    <th className={thClass}>Source</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {listQuery.data.items.map((s) => (
                    <tr key={s.id} className={selectedId === s.id ? "bg-brand-50/40" : ""}>
                      <td className={tdClass}>
                        <button type="button" className="text-left font-medium text-brand-800 hover:underline" onClick={() => { setSelectedId(s.id); setNotice(null); }}>
                          {s.customerName ?? s.customerPhone}
                        </button>
                        <p className="tabular-nums text-xs text-neutral-500">{s.customerPhone}</p>
                      </td>
                      <td className={tdClass}>{s.packageName}</td>
                      <td className={tdClass}>{s.sourceType === "VOUCHER" ? "Voucher" : "Payment"}</td>
                      <td className={tdClass}><Badge tone={statusTone[s.status] ?? "neutral"}>{s.status.toLowerCase()}</Badge></td>
                      <td className={tdClass}>{formatDateTime(s.expiresAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <Pager page={page} pageSize={PAGE_SIZE} total={listQuery.data.total} onChange={setPage} />
          </>
        )}
      </Card>

      {selectedId && (
        <Card title="Subscription detail" actions={<Button variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>}>
          {detailQuery.isLoading && <DetailSkeleton />}
          {detailQuery.data && (
            <div className="space-y-6 text-sm">
              <dl className="grid gap-4 sm:grid-cols-3">
                <div><dt className="text-neutral-500">Package</dt><dd className="font-medium">{detailQuery.data.packageName}</dd></div>
                <div><dt className="text-neutral-500">Location</dt><dd>{detailQuery.data.locationName}</dd></div>
                <div><dt className="text-neutral-500">Status</dt><dd>{detailQuery.data.status.toLowerCase()}</dd></div>
                <div><dt className="text-neutral-500">Starts</dt><dd>{formatDateTime(detailQuery.data.startsAt)}</dd></div>
                <div><dt className="text-neutral-500">Expires</dt><dd>{formatDateTime(detailQuery.data.expiresAt)}</dd></div>
                <div><dt className="text-neutral-500">Devices allowed</dt><dd className="tabular-nums">{detailQuery.data.maxDevices}</dd></div>
              </dl>

              <div>
                <h3 className="mb-2 font-semibold text-neutral-900">Network authorizations</h3>
                {detailQuery.data.authorizations.length === 0 ? (
                  <p className="text-neutral-500">No network authorization attempts recorded yet. The Omada step is not connected.</p>
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {detailQuery.data.authorizations.map((a, i) => (
                      <li key={`${a.macAddress}-${i}`} className="flex flex-wrap justify-between gap-2 py-2">
                        <span className="tabular-nums">{a.macAddress}</span>
                        <span className="text-neutral-600">{a.status}{a.lastError ? ` · ${a.lastError}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-neutral-900">History</h3>
                <ul className="divide-y divide-neutral-100">
                  {detailQuery.data.history.map((h, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>{h.from ? `${h.from.toLowerCase()} → ` : ""}{h.to.toLowerCase()}{h.reason ? ` · ${h.reason}` : ""}</span>
                      <span className="text-neutral-500">{formatDateTime(h.at)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {canCancel(detailQuery.data) && (
                <div className="space-y-3 rounded-md p-4 ring-1 ring-inset ring-neutral-200">
                  <Field label="Reason for cancelling" hint="Recorded in the history and the audit log. Remaining time is removed.">
                    <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
                  </Field>
                  <Button
                    variant="danger"
                    disabled={reason.trim().length < 5}
                    loading={cancelMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Cancel this subscription now?")) cancelMutation.mutate(detailQuery.data!.id);
                    }}
                  >
                    Cancel subscription
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </>
  );
}

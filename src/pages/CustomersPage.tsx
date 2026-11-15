import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, DetailSkeleton, EmptyState, PageHeader, Select, TableSkeleton, Input } from "../components/ui";
import { Pager, TableWrap, tableClass, tdClass, thClass } from "../components/pager";
import { apiFetch } from "../lib/api";
import { formatDateTime, formatTzs } from "../lib/format";
import { useAuth } from "../features/auth/AuthContext";
import type { CustomerDetail, CustomerListItem, CustomerStatus, PagedResult } from "../types/api";

const PAGE_SIZE = 20;

export function CustomersPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("customers:manage");
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["customers", { page, search, status }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      return apiFetch<PagedResult<CustomerListItem>>(`/customers?${params.toString()}`);
    },
  });

  const detailQuery = useQuery({
    queryKey: ["customers", selectedId],
    queryFn: () => apiFetch<CustomerDetail>(`/customers/${selectedId}`),
    enabled: selectedId !== null,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: CustomerStatus }) =>
      apiFetch<CustomerDetail>(`/customers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) }),
    onSuccess: (_data, vars) => {
      setNotice(vars.next === "SUSPENDED" ? "Customer suspended. They cannot buy new packages." : "Customer reactivated.");
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const toggleStatus = (c: CustomerListItem) => {
    const next: CustomerStatus = c.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const message =
      next === "SUSPENDED"
        ? "Suspend this customer? They will not be able to buy new packages. Existing connected devices are not disconnected yet."
        : "Reactivate this customer?";
    if (window.confirm(message)) statusMutation.mutate({ id: c.id, next });
  };

  return (
    <>
      <PageHeader title="Customers" description="People who have bought or redeemed internet access, identified by phone number." />
      {notice && <Alert tone="info">{notice}</Alert>}

      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Input
            aria-label="Search customers"
            placeholder="Search by phone or name"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        </div>

        {listQuery.isLoading && <TableSkeleton columns={6} label="Loading customers" />}
        {listQuery.isError && <Alert>{(listQuery.error as Error).message}</Alert>}
        {listQuery.data && listQuery.data.items.length === 0 && <EmptyState title="No customers match these filters" />}
        {listQuery.data && listQuery.data.items.length > 0 && (
          <>
            <TableWrap>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Customer</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Subscriptions</th>
                    <th className={thClass}>Payments</th>
                    <th className={thClass}>Joined</th>
                    <th className={thClass}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {listQuery.data.items.map((c) => (
                    <tr key={c.id} className={selectedId === c.id ? "bg-brand-50/40" : ""}>
                      <td className={tdClass}>
                        <button type="button" className="text-left font-medium text-brand-800 hover:underline" onClick={() => setSelectedId(c.id)}>
                          {c.fullName ?? "No name"}
                        </button>
                        <p className="tabular-nums text-xs text-neutral-500">{c.phoneNumber}</p>
                      </td>
                      <td className={tdClass}>
                        <Badge tone={c.status === "ACTIVE" ? "success" : "danger"}>{c.status === "ACTIVE" ? "Active" : "Suspended"}</Badge>
                      </td>
                      <td className={`${tdClass} tabular-nums`}>{c.subscriptionCount}</td>
                      <td className={`${tdClass} tabular-nums`}>{c.paymentCount}</td>
                      <td className={tdClass}>{formatDateTime(c.createdAt)}</td>
                      <td className={`${tdClass} text-right`}>
                        {canManage && (
                          <Button
                            variant="secondary"
                            onClick={() => toggleStatus(c)}
                            disabled={statusMutation.isPending}
                            loading={statusMutation.isPending && statusMutation.variables?.id === c.id}
                          >
                            {c.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                          </Button>
                        )}
                      </td>
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
        <Card title="Customer detail" actions={<Button variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>}>
          {detailQuery.isLoading && <DetailSkeleton />}
          {detailQuery.data && (
            <div className="space-y-6 text-sm">
              <dl className="grid gap-4 sm:grid-cols-3">
                <div><dt className="text-neutral-500">Name</dt><dd className="font-medium">{detailQuery.data.fullName ?? "—"}</dd></div>
                <div><dt className="text-neutral-500">Phone</dt><dd className="tabular-nums">{detailQuery.data.phoneNumber}</dd></div>
                <div><dt className="text-neutral-500">Active sessions</dt><dd className="tabular-nums">{detailQuery.data.activeSessionCount}</dd></div>
              </dl>

              <div>
                <h3 className="mb-2 font-semibold text-neutral-900">Subscriptions</h3>
                {detailQuery.data.subscriptions.length === 0 ? (
                  <p className="text-neutral-500">No subscriptions yet.</p>
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {detailQuery.data.subscriptions.map((s) => (
                      <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
                        <span>{s.packageName} <span className="text-neutral-500">({s.sourceType.toLowerCase()})</span></span>
                        <span className="text-neutral-600">{s.status} · until {formatDateTime(s.expiresAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-neutral-900">Payments</h3>
                {detailQuery.data.payments.length === 0 ? (
                  <p className="text-neutral-500">No payments yet.</p>
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {detailQuery.data.payments.map((p) => (
                      <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                        <span className="tabular-nums">{p.reference} · {p.packageName}</span>
                        <span className="text-neutral-600">{formatTzs(p.amountTzs)} · {p.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

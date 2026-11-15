import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton, TableSkeleton } from "../components/ui";
import { Pager, TableWrap, tableClass, tdClass, thClass } from "../components/pager";
import { apiFetch, downloadText } from "../lib/api";
import { formatDateTime, formatTzs } from "../lib/format";
import { useAuth } from "../features/auth/AuthContext";
import type { PagedResult, PackageDto, VoucherBatchDto, VoucherCodeRow, VoucherListItem } from "../types/api";

const PAGE_SIZE = 20;

const statusTone: Record<VoucherListItem["status"], "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  REVOKED: "danger",
  EXPIRED: "neutral",
  EXHAUSTED: "warning",
};

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function VouchersPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("vouchers:manage");
  const canSell = hasPermission("vouchers:sell");
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [saleFor, setSaleFor] = useState<string | null>(null);
  const [saleChannel, setSaleChannel] = useState<"CASH" | "MOBILE_MONEY">("CASH");
  const [saleAmount, setSaleAmount] = useState("");
  const [revealingBatchId, setRevealingBatchId] = useState<string | null>(null);

  // Batch generation form
  const [batchName, setBatchName] = useState("");
  const [batchPackageId, setBatchPackageId] = useState("");
  const [batchQuantity, setBatchQuantity] = useState("20");
  const [batchUsage, setBatchUsage] = useState("1");

  const packagesQuery = useQuery({
    queryKey: ["packages", "for-vouchers"],
    queryFn: () => apiFetch<PagedResult<PackageDto>>("/packages?pageSize=100"),
    enabled: canManage,
  });

  const batchesQuery = useQuery({
    queryKey: ["voucher-batches", page],
    queryFn: () => apiFetch<PagedResult<VoucherBatchDto>>(`/vouchers/batches?page=${page}&pageSize=${PAGE_SIZE}`),
  });

  const vouchersQuery = useQuery({
    queryKey: ["vouchers", { page, status }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      return apiFetch<PagedResult<VoucherListItem>>(`/vouchers?${params.toString()}`);
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    void queryClient.invalidateQueries({ queryKey: ["voucher-batches"] });
  };

  const createBatch = useMutation({
    mutationFn: () =>
      apiFetch<VoucherBatchDto>("/vouchers/batches", {
        method: "POST",
        body: JSON.stringify({
          name: batchName,
          packageId: batchPackageId,
          quantity: Number(batchQuantity),
          usageLimit: Number(batchUsage),
        }),
      }),
    onSuccess: (batch) => {
      setNotice(`Generated ${batch.quantity} vouchers in "${batch.name}". Reveal the codes to print them.`);
      setBatchName("");
      refresh();
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const sell = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/vouchers/${id}/sale`, {
        method: "POST",
        body: JSON.stringify({ channel: saleChannel, amountTzs: Number(saleAmount) }),
      }),
    onSuccess: () => {
      setNotice("Sale recorded.");
      setSaleFor(null);
      setSaleAmount("");
      refresh();
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/vouchers/${id}/revoke`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      setNotice("Voucher revoked. It can no longer be redeemed.");
      refresh();
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const revealBatch = async (batch: VoucherBatchDto) => {
    const reason = window.prompt("Reason for revealing these codes (kept in the audit log):", "Printing for sale");
    if (!reason || reason.trim().length < 5) {
      setNotice("A reason of at least 5 characters is needed to reveal codes.");
      return;
    }
    setRevealingBatchId(batch.id);
    try {
      const result = await apiFetch<{ batchName: string; items: VoucherCodeRow[] }>(
        `/vouchers/batches/${batch.id}/codes?reason=${encodeURIComponent(reason.trim())}`,
      );
      const header = "code,package,price_tzs,duration,usage_limit,expires_at,status";
      const rows = result.items.map((v) =>
        [
          csvCell(v.code),
          csvCell(v.packageName),
          csvCell(v.priceTzs),
          csvCell(`${v.durationValue} ${v.durationUnit.toLowerCase()}`),
          csvCell(v.usageLimit),
          csvCell(v.expiresAt),
          csvCell(v.status),
        ].join(","),
      );
      downloadText([header, ...rows].join("\n") + "\n", `${batch.name.replace(/[^a-z0-9]+/gi, "-")}-codes.csv`);
      setNotice("Codes revealed and downloaded. This reveal is recorded in the audit log.");
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setRevealingBatchId(null);
    }
  };

  const recordSale = (id: string) => {
    const amount = Number(saleAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setNotice("Enter the amount paid in whole TZS.");
      return;
    }
    sell.mutate(id);
  };

  return (
    <>
      <PageHeader
        title="Vouchers"
        description="Printed codes sold at the counter. Codes are shown only when you reveal a batch, and each reveal is logged."
      />
      {notice && <Alert tone="info">{notice}</Alert>}

      {canManage && (
        <Card title="Generate a batch">
          <form
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              createBatch.mutate();
            }}
          >
            <Field label="Batch name">
              <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} required minLength={2} placeholder="March 3-day" />
            </Field>
            <Field label="Package">
              <Select value={batchPackageId} onChange={(e) => setBatchPackageId(e.target.value)} required>
                <option value="">Choose a package</option>
                {packagesQuery.data?.items.filter((p) => p.isActive && !p.isArchived).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {formatTzs(p.priceTzs)}</option>
                ))}
              </Select>
              {packagesQuery.isLoading && <Skeleton className="mt-2 h-3 w-2/3" />}
            </Field>
            <Field label="Quantity" hint="1 to 500">
              <Input type="number" min={1} max={500} value={batchQuantity} onChange={(e) => setBatchQuantity(e.target.value)} required />
            </Field>
            <Field label="Uses per code" hint="1 is single use">
              <Input type="number" min={1} max={50} value={batchUsage} onChange={(e) => setBatchUsage(e.target.value)} required />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={createBatch.isPending} disabled={!batchPackageId || batchName.trim().length < 2} className="w-full">
                Generate
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Batches">
        {batchesQuery.isLoading && <TableSkeleton columns={7} label="Loading voucher batches" />}
        {batchesQuery.data && batchesQuery.data.items.length === 0 && <EmptyState title="No batches yet" />}
        {batchesQuery.data && batchesQuery.data.items.length > 0 && (
          <>
            <TableWrap>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Batch</th>
                    <th className={thClass}>Package</th>
                    <th className={thClass}>Quantity</th>
                    <th className={thClass}>Sold</th>
                    <th className={thClass}>Redeemed</th>
                    <th className={thClass}>Revoked</th>
                    <th className={thClass}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {batchesQuery.data.items.map((b) => (
                    <tr key={b.id}>
                      <td className={tdClass}>
                        <p className="font-medium text-neutral-900">{b.name}</p>
                        <p className="text-xs text-neutral-500">{formatDateTime(b.createdAt)}</p>
                      </td>
                      <td className={tdClass}>{b.packageName}</td>
                      <td className={`${tdClass} tabular-nums`}>{b.quantity}</td>
                      <td className={`${tdClass} tabular-nums`}>{b.soldCount}</td>
                      <td className={`${tdClass} tabular-nums`}>{b.redeemedCount}</td>
                      <td className={`${tdClass} tabular-nums`}>{b.revokedCount}</td>
                      <td className={`${tdClass} text-right`}>
                        {canManage && (
                          <Button variant="secondary" onClick={() => void revealBatch(b)} loading={revealingBatchId === b.id}>
                            Reveal and download codes
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <Pager page={page} pageSize={PAGE_SIZE} total={batchesQuery.data.total} onChange={setPage} />
          </>
        )}
      </Card>

      <Card
        title="Vouchers"
        actions={
          <Select aria-label="Filter by status" className="w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="EXHAUSTED">Used up</option>
            <option value="REVOKED">Revoked</option>
            <option value="EXPIRED">Expired</option>
          </Select>
        }
      >
        {vouchersQuery.isLoading && <TableSkeleton columns={6} label="Loading vouchers" />}
        {vouchersQuery.data && vouchersQuery.data.items.length === 0 && <EmptyState title="No vouchers match" />}
        {vouchersQuery.data && vouchersQuery.data.items.length > 0 && (
          <>
            <TableWrap>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Code</th>
                    <th className={thClass}>Package</th>
                    <th className={thClass}>Uses</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Sale</th>
                    <th className={thClass}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {vouchersQuery.data.items.map((v) => (
                    <tr key={v.id}>
                      <td className={`${tdClass} tabular-nums`}>…{v.codeHint}</td>
                      <td className={tdClass}>{v.packageName}</td>
                      <td className={`${tdClass} tabular-nums`}>{v.usedCount} / {v.usageLimit}</td>
                      <td className={tdClass}><Badge tone={statusTone[v.status]}>{v.status.toLowerCase()}</Badge></td>
                      <td className={tdClass}>
                        {v.soldAt ? (
                          <span>
                            {formatTzs(v.soldAmountTzs ?? 0)} · {v.soldChannel === "CASH" ? "cash" : "mobile money"}
                            <span className="block text-xs text-neutral-500">{formatDateTime(v.soldAt)}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-500">Not sold</span>
                        )}
                      </td>
                      <td className={`${tdClass} space-y-2 text-right`}>
                        {canSell && !v.soldAt && v.status === "ACTIVE" && saleFor !== v.id && (
                          <Button variant="secondary" onClick={() => { setSaleFor(v.id); setSaleAmount(""); }}>Record sale</Button>
                        )}
                        {canManage && v.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            loading={revoke.isPending && revoke.variables?.id === v.id}
                            onClick={() => {
                              const reason = window.prompt("Reason for revoking this voucher (at least 5 characters):");
                              if (reason && reason.trim().length >= 5) revoke.mutate({ id: v.id, reason: reason.trim() });
                            }}
                          >
                            Revoke
                          </Button>
                        )}
                        {saleFor === v.id && (
                          <div className="space-y-2 text-left">
                            <Select aria-label="Payment channel" value={saleChannel} onChange={(e) => setSaleChannel(e.target.value as "CASH" | "MOBILE_MONEY")}>
                              <option value="CASH">Cash</option>
                              <option value="MOBILE_MONEY">Mobile money (recorded manually)</option>
                            </Select>
                            <Input aria-label="Amount paid in TZS" inputMode="numeric" placeholder="Amount TZS" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} />
                            <div className="flex gap-2">
                              <Button onClick={() => recordSale(v.id)} loading={sell.isPending}>Save</Button>
                              <Button variant="ghost" onClick={() => setSaleFor(null)}>Cancel</Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <Pager page={page} pageSize={PAGE_SIZE} total={vouchersQuery.data.total} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  );
}

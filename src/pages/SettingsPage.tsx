import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, ProviderListSkeleton, TableSkeleton } from "../components/ui";
import { Pager, TableWrap, tableClass, tdClass, thClass } from "../components/pager";
import { apiFetch } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { useAuth } from "../features/auth/AuthContext";
import type { AuditEntry, PagedResult, PaymentProviderDto } from "../types/api";

const PAGE_SIZE = 25;

const providerLabels: Record<PaymentProviderDto["code"], string> = {
  CLICKPESA: "ClickPesa (mobile money)",
  SELCOM: "Selcom (mobile money)",
  MOCK: "Mock (testing only)",
};

export function SettingsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("settings:manage");
  const canAudit = hasPermission("audit:read");
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [auditPage, setAuditPage] = useState(1);

  const providersQuery = useQuery({
    queryKey: ["settings", "providers"],
    queryFn: () => apiFetch<PaymentProviderDto[]>("/settings/payment-providers"),
    enabled: canManage,
  });

  const toggle = useMutation({
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) =>
      apiFetch(`/settings/payment-providers/${code}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: (_data, vars) => {
      setNotice(`${providerLabels[vars.code as PaymentProviderDto["code"]]} ${vars.enabled ? "enabled" : "disabled"}.`);
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const auditQuery = useQuery({
    queryKey: ["settings", "audit", auditPage],
    queryFn: () => apiFetch<PagedResult<AuditEntry>>(`/settings/audit-log?page=${auditPage}&pageSize=${PAGE_SIZE}`),
    enabled: canAudit,
  });

  return (
    <>
      <PageHeader title="Settings" description="Payment providers and the audit log." />
      {notice && <Alert tone="info">{notice}</Alert>}

      {canManage && (
        <Card title="Payment providers">
          {providersQuery.isLoading && <ProviderListSkeleton />}
          {providersQuery.data && (
            <ul className="divide-y divide-neutral-100">
              {providersQuery.data.map((p) => {
                const blocked = !p.isRegistered || p.isMockInProduction;
                return (
                  <li key={p.code} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-medium text-neutral-900">{providerLabels[p.code]}</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {!p.isRegistered
                          ? "Not configured. Add its credentials to the server environment first."
                          : p.isMockInProduction
                            ? "Not allowed in production."
                            : "Configured on the server."}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={p.isEnabled ? "success" : "neutral"}>{p.isEnabled ? "Enabled" : "Disabled"}</Badge>
                      <Button
                        variant={p.isEnabled ? "secondary" : "primary"}
                        disabled={blocked && !p.isEnabled ? true : toggle.isPending}
                        loading={toggle.isPending && toggle.variables?.code === p.code}
                        onClick={() => toggle.mutate({ code: p.code, enabled: !p.isEnabled })}
                      >
                        {p.isEnabled ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {canAudit && (
        <Card title="Audit log">
          {auditQuery.isLoading && <TableSkeleton columns={4} label="Loading audit log" />}
          {auditQuery.data && auditQuery.data.items.length === 0 && <EmptyState title="No entries yet" />}
          {auditQuery.data && auditQuery.data.items.length > 0 && (
            <>
              <TableWrap>
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>When</th>
                      <th className={thClass}>Who</th>
                      <th className={thClass}>Action</th>
                      <th className={thClass}>Entity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {auditQuery.data.items.map((e) => (
                      <tr key={e.id}>
                        <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(e.createdAt)}</td>
                        <td className={tdClass}>{e.actor?.name ?? "System"}</td>
                        <td className={`${tdClass} font-mono text-xs`}>{e.action}</td>
                        <td className={tdClass}>{e.entityType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
              <Pager page={auditPage} pageSize={PAGE_SIZE} total={auditQuery.data.total} onChange={setAuditPage} />
            </>
          )}
        </Card>
      )}
    </>
  );
}

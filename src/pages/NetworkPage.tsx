import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Card, EmptyState, PageHeader, Spinner, StatTile } from "../components/ui";
import { TableWrap, tableClass, tdClass, thClass } from "../components/pager";
import { apiFetch } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { NetworkOverview } from "../types/api";

const severityTone: Record<string, "info" | "warning" | "danger"> = { INFO: "info", WARNING: "warning", ERROR: "danger" };

export function NetworkPage() {
  const query = useQuery({
    queryKey: ["network", "overview"],
    queryFn: () => apiFetch<NetworkOverview>("/network/overview"),
  });

  return (
    <>
      <PageHeader title="Network" description="Read-only view of the access points and controllers." />
      <Alert tone="info">
        Live status is not connected yet. Access point and session counts show what was last recorded in the database, not what the Omada controller reports now.
      </Alert>

      {query.isLoading && <Spinner />}
      {query.isError && <Alert>{(query.error as Error).message}</Alert>}

      {query.data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Controllers" value={String(query.data.controllers.length)} />
            <StatTile label="Sites" value={String(query.data.sites.length)} />
            <StatTile label="Access points" value={String(query.data.accessPoints.length)} />
            <StatTile label="Active sessions" value={String(query.data.activeSessionCount)} hint="Last recorded" />
          </div>

          <Card title="Controllers">
            {query.data.controllers.length === 0 ? (
              <EmptyState title="No controllers added" description="Controllers are added during setup. Passwords are never shown." />
            ) : (
              <TableWrap>
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Name</th>
                      <th className={thClass}>Address</th>
                      <th className={thClass}>Last test</th>
                      <th className={thClass}>Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {query.data.controllers.map((c) => (
                      <tr key={c.id}>
                        <td className={tdClass}>{c.name}</td>
                        <td className={`${tdClass} break-all`}>{c.baseUrl}</td>
                        <td className={tdClass}>{formatDateTime(c.lastTestedAt)}</td>
                        <td className={tdClass}>
                          {c.lastTestStatus ? <Badge tone={c.lastTestStatus === "OK" ? "success" : "danger"}>{c.lastTestStatus}</Badge> : "Not tested"}
                          {c.lastError && <p className="mt-1 text-xs text-red-700">{c.lastError}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>

          <Card title="Access points">
            {query.data.accessPoints.length === 0 ? (
              <EmptyState title="No access points recorded" />
            ) : (
              <TableWrap>
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Name</th>
                      <th className={thClass}>MAC</th>
                      <th className={thClass}>Model</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {query.data.accessPoints.map((ap) => (
                      <tr key={ap.id}>
                        <td className={tdClass}>{ap.name}</td>
                        <td className={`${tdClass} tabular-nums`}>{ap.macAddress}</td>
                        <td className={tdClass}>{ap.model ?? "—"}</td>
                        <td className={tdClass}>{ap.status.toLowerCase()}</td>
                        <td className={tdClass}>{formatDateTime(ap.lastSeenAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>

          <Card title="Recent events">
            {query.data.recentEvents.length === 0 ? (
              <EmptyState title="No network events recorded" />
            ) : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {query.data.recentEvents.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <Badge tone={severityTone[e.severity] ?? "info"}>{e.severity.toLowerCase()}</Badge>
                    <span className="flex-1 text-neutral-800">{e.message}</span>
                    <span className="text-neutral-500">{formatDateTime(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </>
  );
}

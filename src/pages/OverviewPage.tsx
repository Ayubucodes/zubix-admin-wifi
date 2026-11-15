import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Alert, Card, EmptyState, PageHeader, Spinner, StatTile } from "../components/ui";
import { apiFetch } from "../lib/api";
import { formatDateTime, formatNumber, formatTzs } from "../lib/format";
import type { DashboardOverview } from "../types/api";

export function OverviewPage() {
  const query = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => apiFetch<DashboardOverview>("/dashboard/overview"),
    refetchInterval: 60_000,
  });

  return (
    <>
      <PageHeader
        title="Overview"
        description={query.data ? `Updated ${formatDateTime(query.data.generatedAt)} (Dar es Salaam time)` : "Live figures from the database"}
      />

      {query.isPending && <Spinner label="Loading dashboard" />}
      {query.isError && <Alert>{query.error.message}</Alert>}

      {query.data && (
        <>
          <section aria-label="Revenue" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatTile label="Today" value={formatTzs(query.data.revenue.todayTzs)} />
            <StatTile label="Last 7 days" value={formatTzs(query.data.revenue.weekTzs)} />
            <StatTile label="This month" value={formatTzs(query.data.revenue.monthTzs)} />
            <StatTile label="All time" value={formatTzs(query.data.revenue.totalTzs)} />
          </section>

          <section aria-label="Operations" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatTile label="Customers" value={formatNumber(query.data.counts.customers)} />
            <StatTile label="Active subscriptions" value={formatNumber(query.data.counts.activeSubscriptions)} />
            <StatTile label="Active Wi-Fi sessions" value={formatNumber(query.data.counts.activeSessions)} />
            <StatTile label="Expired subscriptions" value={formatNumber(query.data.counts.expiredSubscriptions)} />
            <StatTile label="Pending payments" value={formatNumber(query.data.counts.pendingPayments)} />
            <StatTile label="Vouchers sold" value={formatNumber(query.data.counts.vouchersSold)} />
            <StatTile label="Access points online" value={formatNumber(query.data.counts.accessPointsOnline)} />
            <StatTile label="Access points offline" value={formatNumber(query.data.counts.accessPointsOffline)} />
          </section>

          <Card title="Revenue, last 7 days (TZS)">
            {query.data.revenueLast7Days.every((point) => point.amountTzs === 0) ? (
              <EmptyState title="No successful payments in the last 7 days" description="Revenue appears here once payments are confirmed." />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={query.data.revenueLast7Days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-neutral-200)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--color-neutral-500)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "var(--color-neutral-500)" }} tickLine={false} axisLine={false} width={72} tickFormatter={(v: number) => formatNumber(v)} />
                    <Tooltip contentStyle={{ background: "var(--color-white)", border: "1px solid var(--color-neutral-200)", borderRadius: 6, color: "var(--color-neutral-900)" }} formatter={(value) => formatTzs(Number(value))} cursor={{ fill: "var(--color-neutral-100)" }} />
                    <Bar dataKey="amountTzs" name="Revenue" fill="var(--color-brand-700)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

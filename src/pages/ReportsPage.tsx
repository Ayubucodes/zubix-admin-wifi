import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Alert, Button, Card, Field, Input, PageHeader, ReportSkeleton, Skeleton, StatTile } from "../components/ui";
import { TableWrap, tableClass, tdClass, thClass } from "../components/pager";
import { apiDownload, apiFetch } from "../lib/api";
import { formatNumber, formatTzs } from "../lib/format";
import type { CustomerGrowthReport, RevenueReport, VoucherSalesReport } from "../types/api";

/** Dates are business dates in Dar es Salaam (UTC+3, no DST). The range is [from, to) in that zone. */
function businessDateToIso(date: string): string {
  return `${date}T00:00:00+03:00`;
}

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const toDate = new Date(now.getTime() + 24 * 3_600_000);
  const fromDate = new Date(now.getTime() - 6 * 24 * 3_600_000);
  const key = (d: Date) => new Date(d.getTime() + 3 * 3_600_000).toISOString().slice(0, 10);
  return { from: key(fromDate), to: key(toDate) };
}

export function ReportsPage() {
  const [range, setRange] = useState(defaultRange);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [submitted, setSubmitted] = useState(range);

  const query = (path: string) => {
    const params = new URLSearchParams({ from: businessDateToIso(submitted.from), to: businessDateToIso(submitted.to) });
    return `${path}?${params.toString()}`;
  };

  const revenue = useQuery({
    queryKey: ["reports", "revenue", submitted],
    queryFn: () => apiFetch<RevenueReport>(query("/reports/revenue")),
  });
  const vouchers = useQuery({
    queryKey: ["reports", "vouchers", submitted],
    queryFn: () => apiFetch<VoucherSalesReport>(query("/reports/vouchers")),
  });
  const customers = useQuery({
    queryKey: ["reports", "customers", submitted],
    queryFn: () => apiFetch<CustomerGrowthReport>(query("/reports/customers")),
  });

  const invalid = range.from >= range.to;

  const exportCsv = async () => {
    setExportError(null);
    setExportLoading(true);
    try {
      await apiDownload(query("/reports/payments.csv"), `payments-${submitted.from}-to-${submitted.to}.csv`);
    } catch (error) {
      setExportError((error as Error).message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Reports" description="Revenue, voucher sales and customer growth for a date range (Dar es Salaam time)." />

      <Card>
        <form
          className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!invalid) setSubmitted(range);
          }}
        >
          <Field label="From">
            <Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} required />
          </Field>
          <Field label="To (not included)">
            <Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} required />
          </Field>
          <Button type="submit" disabled={invalid}>Apply</Button>
        </form>
        {invalid && <p className="mt-3 text-sm text-red-700">The end date must be after the start date.</p>}
      </Card>

      {revenue.isError && <Alert>{(revenue.error as Error).message}</Alert>}
      {revenue.isPending && <ReportSkeleton />}

      {revenue.data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Revenue" value={formatTzs(revenue.data.totalRevenueTzs)} />
            <StatTile label="Payments" value={formatNumber(revenue.data.paymentCount)} />
            <StatTile
              label="Voucher sales"
              value={vouchers.data ? formatTzs(vouchers.data.totalTzs) : ""}
              hint={vouchers.data ? `${vouchers.data.soldCount} sold` : undefined}
              loading={vouchers.isPending}
            />
            <StatTile
              label="New customers"
              value={customers.data ? formatNumber(customers.data.newCustomers) : ""}
              loading={customers.isPending}
            />
          </div>

          <Card
            title="Revenue by day"
            actions={<Button variant="secondary" onClick={() => void exportCsv()} loading={exportLoading}>Download payments CSV</Button>}
          >
            {exportError && <Alert>{exportError}</Alert>}
            {revenue.data.byDay.length === 0 ? (
              <p className="text-sm text-neutral-500">No successful payments in this range.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue.data.byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatNumber(v)} />
                    <Tooltip contentStyle={{ background: "var(--color-white)", border: "1px solid var(--color-neutral-200)", borderRadius: 6, color: "var(--color-neutral-900)" }} formatter={(value: number) => formatTzs(value)} />
                    <Bar dataKey="revenueTzs" name="Revenue" fill="var(--color-brand-700)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Revenue by package">
            {revenue.data.byPackage.length === 0 ? (
              <p className="text-sm text-neutral-500">Nothing to show.</p>
            ) : (
              <TableWrap>
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Package</th>
                      <th className={thClass}>Payments</th>
                      <th className={thClass}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {revenue.data.byPackage.map((p) => (
                      <tr key={p.packageId}>
                        <td className={tdClass}>{p.packageName}</td>
                        <td className={`${tdClass} tabular-nums`}>{formatNumber(p.count)}</td>
                        <td className={`${tdClass} tabular-nums`}>{formatTzs(p.revenueTzs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>

          {vouchers.isPending && (
            <Card title="Voucher sales by channel">
              <div role="status" aria-label="Loading voucher sales">
                <span className="sr-only">Loading voucher sales</span>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            </Card>
          )}

          {vouchers.data && (
            <Card title="Voucher sales by channel">
              {Object.keys(vouchers.data.byChannel).length === 0 ? (
                <p className="text-sm text-neutral-500">No voucher sales in this range.</p>
              ) : (
                <ul className="divide-y divide-neutral-100 text-sm">
                  {Object.entries(vouchers.data.byChannel).map(([channel, v]) => (
                    <li key={channel} className="flex justify-between py-2">
                      <span>{channel === "CASH" ? "Cash" : channel === "MOBILE_MONEY" ? "Mobile money" : channel}</span>
                      <span className="tabular-nums">{formatNumber(v.count)} sold · {formatTzs(v.amountTzs)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}
    </>
  );
}

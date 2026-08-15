import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { CreditCard, Package, Wallet } from "lucide-react";
import FinancialChartCard from "./FinancialChartCard";
import FinancialDataTable from "./FinancialDataTable";
import { BoundedDataNotice, CardSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { useEntityPages } from "@/hooks/useEntityPages";

const MONTH_COUNT = 6;
const FINANCIAL_PAGE_SIZE = 100;

const currency = (value, compact = false) => {
  const amount = Number(value) || 0;
  if (compact && Math.abs(amount) >= 1000) return `$${Math.round(amount / 100) / 10}k`;
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const monthKey = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const buildMonths = () => {
  const now = new Date();
  return Array.from({ length: MONTH_COUNT }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (MONTH_COUNT - 1 - index), 1);
    const key = monthKey(date.toISOString());
    return {
      key,
      month: date.toLocaleString(undefined, { month: "short" }),
      issuedRevenue: 0,
      paidRevenue: 0,
      partsSpend: 0,
      takeHome: 0,
    };
  });
};

export const financialRangeStart = (referenceDate = new Date()) =>
  new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (MONTH_COUNT - 1), 1).toISOString();

const tooltipFormatter = (value) => currency(value);

export default function RevenueChartsSection() {
  const rangeStart = useMemo(() => financialRangeStart(), []);
  const invoicesQuery = useEntityPages({
    queryKey: ["overviewFinancialInvoices", rangeStart],
    fetchPage: ({ limit, skip }) => base44.entities.Invoice.filter({
      invoiceVisibility: "customer_visible",
      $or: [
        { invoiceSentAt: { $gte: rangeStart } },
        { paid_date: { $gte: rangeStart } },
      ],
    }, "-created_date", limit, skip),
    pageSize: FINANCIAL_PAGE_SIZE,
    staleTime: 5 * 60 * 1000,
  });

  const usagesQuery = useEntityPages({
    queryKey: ["overviewFinancialPartsSpend", rangeStart],
    fetchPage: ({ limit, skip }) => base44.entities.InventoryUsage.filter({
      created_date: { $gte: rangeStart },
    }, "-created_date", limit, skip),
    pageSize: FINANCIAL_PAGE_SIZE,
    staleTime: 5 * 60 * 1000,
  });
  const invoices = invoicesQuery.data || [];
  const usages = usagesQuery.data || [];
  const hasInvoiceSnapshot = invoicesQuery.data !== undefined;
  const hasUsageSnapshot = usagesQuery.data !== undefined;

  const { chartData, totals } = useMemo(() => {
    const months = buildMonths();
    const byKey = new Map(months.map((month) => [month.key, month]));

    invoices.filter((invoice) => invoice.invoiceVisibility === "customer_visible" && invoice.invoiceSentAt).forEach((invoice) => {
      const amount = Number(invoice.amount) || 0;
      const issuedKey = monthKey(invoice.invoiceSentAt);
      if (byKey.has(issuedKey)) byKey.get(issuedKey).issuedRevenue += amount;

      if (invoice.status === "paid") {
        const paidKey = monthKey(invoice.paid_date || invoice.updated_date);
        if (byKey.has(paidKey)) byKey.get(paidKey).paidRevenue += amount;
      }
    });

    usages.forEach((usage) => {
      const key = monthKey(usage.created_date);
      if (!byKey.has(key)) return;
      byKey.get(key).partsSpend += (Number(usage.qty_used) || 1) * (Number(usage.unit_cost) || 0);
    });

    months.forEach((month) => {
      month.takeHome = month.paidRevenue - month.partsSpend;
    });

    return {
      chartData: months,
      totals: months.reduce((acc, month) => ({
        issuedRevenue: acc.issuedRevenue + month.issuedRevenue,
        paidRevenue: acc.paidRevenue + month.paidRevenue,
        partsSpend: acc.partsSpend + month.partsSpend,
        takeHome: acc.takeHome + month.takeHome,
      }), { issuedRevenue: 0, paidRevenue: 0, partsSpend: 0, takeHome: 0 }),
    };
  }, [invoices, usages]);

  if ((invoicesQuery.isLoading && !hasInvoiceSnapshot) || (usagesQuery.isLoading && !hasUsageSnapshot)) {
    return <CardSkeleton count={3} compact />;
  }

  if (invoicesQuery.error && !hasInvoiceSnapshot && usagesQuery.error && !hasUsageSnapshot) {
    return (
      <ErrorState
        title="Financial charts could not be loaded"
        error={invoicesQuery.error || usagesQuery.error}
        onRetry={() => Promise.all([invoicesQuery.refetch(), usagesQuery.refetch()])}
      />
    );
  }

  if (hasInvoiceSnapshot && hasUsageSnapshot && invoices.length === 0 && usages.length === 0 && !invoicesQuery.error && !usagesQuery.error) {
    return <EmptyState title="No financial data yet" description="Revenue and parts-spend charts appear after invoices and inventory usage are recorded." />;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading font-bold">Financial overview</h2>
         <p className="text-sm text-muted-foreground">Monthly issued and paid invoice value, plus recorded parts spend, across the last 6 months.</p>
      </div>
      {invoicesQuery.error ? <ErrorState title="Invoice totals could not be refreshed" description={hasInvoiceSnapshot ? "Previously loaded invoice values remain visible." : "Parts-spend information remains available."} error={invoicesQuery.error} onRetry={invoicesQuery.refetch} /> : null}
      {usagesQuery.error ? <ErrorState title="Parts-spend totals could not be refreshed" description={hasUsageSnapshot ? "Previously loaded parts values remain visible." : "Invoice revenue remains available."} error={usagesQuery.error} onRetry={usagesQuery.refetch} /> : null}
      <BoundedDataNotice
        noun="financial invoices"
        loadedCount={invoices.length}
        hasMore={invoicesQuery.hasNextPage}
        isLoadingMore={invoicesQuery.isFetchingNextPage}
        onLoadMore={invoicesQuery.fetchNextPage}
        description={`Revenue charts currently include ${invoices.length} loaded invoices in the six-month reporting window. Load more before treating revenue totals as complete.`}
      />
      <BoundedDataNotice
        noun="parts usage records"
        loadedCount={usages.length}
        hasMore={usagesQuery.hasNextPage}
        isLoadingMore={usagesQuery.isFetchingNextPage}
        onLoadMore={usagesQuery.fetchNextPage}
        description={`Parts-spend charts currently include ${usages.length} loaded usage records in the six-month reporting window. Load more before treating cost or take-home figures as complete.`}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        {hasInvoiceSnapshot ? <FinancialChartCard
          title="Monthly revenue"
          subtitle="Issued vs paid invoices"
          value={`${currency(totals.issuedRevenue)} issued · ${currency(totals.paidRevenue)} paid`}
          icon={CreditCard}
        >
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickFormatter={(value) => currency(value, true)} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip formatter={tooltipFormatter} cursor={{ fill: "hsl(var(--secondary))" }} />
            <Bar dataKey="issuedRevenue" name="Issued" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="paidRevenue" name="Paid" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </FinancialChartCard> : null}

        {hasUsageSnapshot ? <FinancialChartCard
          title="Parts spend"
          subtitle="Inventory cost used on jobs"
          value={currency(totals.partsSpend)}
          icon={Package}
          tone="rose"
        >
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickFormatter={(value) => currency(value, true)} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip formatter={tooltipFormatter} cursor={{ fill: "hsl(var(--secondary))" }} />
            <Bar dataKey="partsSpend" name="Parts spend" fill="#e11d48" radius={[6, 6, 0, 0]} />
          </BarChart>
        </FinancialChartCard> : null}

        {hasInvoiceSnapshot && hasUsageSnapshot ? <FinancialChartCard
          title="Paid less recorded parts"
          subtitle="Excludes labour, overhead, tax adjustments, and other costs"
          value={currency(totals.takeHome)}
          icon={Wallet}
          tone="emerald"
        >
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickFormatter={(value) => currency(value, true)} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip formatter={tooltipFormatter} />
             <Line type="monotone" dataKey="takeHome" name="Paid less recorded parts" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </FinancialChartCard> : null}
      </div>
      <FinancialDataTable rows={chartData} showRevenue={hasInvoiceSnapshot} showParts={hasUsageSnapshot} formatCurrency={currency} />
    </section>
  );
}

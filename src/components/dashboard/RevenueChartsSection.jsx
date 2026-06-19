import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { CreditCard, Package, Wallet } from "lucide-react";
import FinancialChartCard from "./FinancialChartCard";

const MONTH_COUNT = 6;

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

const tooltipFormatter = (value) => currency(value);

export default function RevenueChartsSection() {
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["overviewFinancialInvoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const { data: usages = [], isLoading: usagesLoading } = useQuery({
    queryKey: ["overviewFinancialPartsSpend"],
    queryFn: () => base44.entities.InventoryUsage.list("-created_date", 500),
  });

  const { chartData, totals } = useMemo(() => {
    const months = buildMonths();
    const byKey = new Map(months.map((month) => [month.key, month]));

    invoices.forEach((invoice) => {
      const amount = Number(invoice.amount) || 0;
      const issuedKey = monthKey(invoice.created_date);
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

  if (invoicesLoading || usagesLoading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
        Loading financial charts…
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading font-bold">Financial overview</h2>
        <p className="text-sm text-muted-foreground">Monthly revenue, parts spend, and take-home revenue across the last 6 months.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <FinancialChartCard
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
        </FinancialChartCard>

        <FinancialChartCard
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
        </FinancialChartCard>

        <FinancialChartCard
          title="Take-home revenue"
          subtitle="Paid revenue minus parts spend"
          value={currency(totals.takeHome)}
          icon={Wallet}
          tone="emerald"
        >
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickFormatter={(value) => currency(value, true)} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip formatter={tooltipFormatter} />
            <Line type="monotone" dataKey="takeHome" name="Take-home" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </FinancialChartCard>
      </div>
    </section>
  );
}
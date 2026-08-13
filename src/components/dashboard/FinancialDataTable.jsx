/**
 * @param {{ rows: Array<Record<string, any>>, showRevenue?: boolean, showParts?: boolean, formatCurrency: (value: any) => string }} props
 */
export default function FinancialDataTable({ rows, showRevenue = true, showParts = true, formatCurrency }) {
  return (
    <details className="border-y border-border">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        View financial data table
      </summary>
      <div className="overflow-x-auto pb-4">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">Monthly financial values represented in the charts</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Month</th>
              {showRevenue ? <th className="px-3 py-2 text-right font-semibold">Issued</th> : null}
              {showRevenue ? <th className="px-3 py-2 text-right font-semibold">Paid</th> : null}
              {showParts ? <th className="px-3 py-2 text-right font-semibold">Parts spend</th> : null}
              {showRevenue && showParts ? <th className="px-3 py-2 text-right font-semibold">Take-home</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="px-3 py-2 text-left font-medium">{row.month}</th>
                {showRevenue ? <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.issuedRevenue)}</td> : null}
                {showRevenue ? <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.paidRevenue)}</td> : null}
                {showParts ? <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.partsSpend)}</td> : null}
                {showRevenue && showParts ? <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.takeHome)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { month: string; total: number };

export function EarningsChart({
  data,
  mixedCurrency,
}: {
  data: Row[];
  mixedCurrency: boolean;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">No paid invoices yet — chart appears once you mark payments received.</p>
    );
  }

  return (
    <div className="w-full h-[260px]">
      {mixedCurrency && (
        <p className="text-[10px] text-amber-500/90 mb-2 text-center">
          Totals mix multiple currencies (numeric sum for trend only).
        </p>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(13,17,23,0.95)",
              border: "1px solid rgba(148,163,184,0.2)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#e2e8f0" }}
            formatter={(value) => [Number(value ?? 0).toLocaleString(), "Received"]}
          />
          <Bar dataKey="total" fill="rgba(16,185,129,0.85)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatDOP } from "@/lib/money";

interface DashboardChartsProps {
  salesByDay: { date: string; totalCents: number }[];
}

export function DashboardCharts({ salesByDay }: DashboardChartsProps) {
  const data = salesByDay.map((d) => ({
    ...d,
    total: d.totalCents / 100,
    label: new Date(d.date).toLocaleDateString("es-DO", { day: "numeric", month: "short" }),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `RD$${v}`} />
          <Tooltip
            formatter={(value: number) => [formatDOP(value * 100), "Ventas"]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
          />
          <Bar dataKey="total" fill="#1C6ED5" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill="#1C6ED5" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

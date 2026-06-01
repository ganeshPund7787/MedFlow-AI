import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getRevenueOverview } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";

export function RevenueChart() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["revenue-overview"],
    queryFn: getRevenueOverview,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["revenue-overview"] });
      queryClient.invalidateQueries({ queryKey: ["financial-records-stats"] });
    };
    socket.on("payment_received", refresh);
    return () => {
      socket.off("payment_received", refresh);
    };
  }, [queryClient]);

  const chartData = data?.chartData || [];

  if (isLoading)
    return (
      <div className="h-75 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (isError)
    return (
      <div className="h-75 flex items-center justify-center text-red-500">
        Error loading chart
      </div>
    );

  return (
    <div className="space-y-3">
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-2">
            <p className="text-[10px] uppercase text-slate-400 font-bold">Today</p>
            <p className="text-sm font-black">${data.dailyRevenue.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-2">
            <p className="text-[10px] uppercase text-slate-400 font-bold">This Week</p>
            <p className="text-sm font-black">${data.weeklyRevenue.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-2">
            <p className="text-[10px] uppercase text-slate-400 font-bold">This Month</p>
            <p className="text-sm font-black">${data.monthlyRevenue.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-2">
            <p className="text-[10px] uppercase text-slate-400 font-bold">All Time</p>
            <p className="text-sm font-black text-emerald-600">${data.totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      )}
    <div className="h-75 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e2e8f0"
          />
          <XAxis
            dataKey="name"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8" }}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8" }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.02)" }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
            formatter={(val: number) => [`$${val.toFixed(2)}`, "Revenue"]}
          />
          <Bar
            dataKey="total"
            fill="#2563eb"
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
    </div>
  );
}

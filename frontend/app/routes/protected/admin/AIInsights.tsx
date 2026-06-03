import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOperationsAnalystInsights } from "@/lib/api";
import Loader from "@/components/global/Loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function meta() {
  return [{ title: "AI Insights" }];
}

export default function AIInsightsPage() {
  const [days, setDays] = useState(30);
  const insightQuery = useQuery({
    queryKey: ["ai-operations-analyst", days],
    queryFn: () => getOperationsAnalystInsights(days),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Hospital Operations Analyst</h1>
        <select
          className="border rounded-md px-3 py-2 bg-background"
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        >
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {insightQuery.isLoading && <Loader label="Generating operations insights..." />}
      {insightQuery.isError && (
        <p className="text-sm text-red-500">Unable to load AI insights. Please try again.</p>
      )}

      {insightQuery.data?.data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>{insightQuery.data.data.executiveSummary}</CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListCard title="Forecasts" items={insightQuery.data.data.forecasts} />
            <ListCard title="Bottlenecks" items={insightQuery.data.data.bottlenecks} />
            <ListCard title="Recommendations" items={insightQuery.data.data.recommendations} />
            <Card>
              <CardHeader>
                <CardTitle>Core KPIs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Revenue: {insightQuery.data.data.kpis.revenueTrend}</p>
                <p>Bed Occupancy: {insightQuery.data.data.kpis.bedOccupancy}</p>
                <p>Appointments: {insightQuery.data.data.kpis.appointmentTrend}</p>
                <p>Departments: {insightQuery.data.data.kpis.departmentPerformance}</p>
                <p>Staff Workload: {insightQuery.data.data.kpis.staffWorkload}</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No insights available.</p>
        )}
      </CardContent>
    </Card>
  );
}

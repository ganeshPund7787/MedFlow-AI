import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClinicalAssistantInsights, getUsers } from "@/lib/api";
import Loader from "@/components/global/Loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function meta() {
  return [{ title: "AI Clinical Assistant" }];
}

export default function ClinicalAssistantPage() {
  const [patientId, setPatientId] = useState("");
  console.log("patientId: ", patientId);
  const patientsQuery = useQuery({
    queryKey: ["ai-clinical-patients"],
    queryFn: () => getUsers({ role: "patient", limit: 100 }),
  });

  const selectedPatientId = useMemo(
    () => patientId || patientsQuery.data?.res?.[0]?._id || "",
    [patientId, patientsQuery.data],
  );

  const insightQuery = useQuery({
    queryKey: ["ai-clinical-assistant", selectedPatientId],
    queryFn: () => getClinicalAssistantInsights(selectedPatientId),
    enabled: Boolean(selectedPatientId),
  });

  if (patientsQuery.isLoading) {
    return <Loader label="Loading patients..." />;
  }
  console.log("patientsQuery : ", patientsQuery.data?.res);
  console.log("insightQuery.data?.data: ", insightQuery.data?.data);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Clinical Assistant</h1>
        <select
          className="border rounded-md px-3 py-2 bg-background"
          value={selectedPatientId}
          onChange={(event) => setPatientId(event.target.value)}
        >
          {(patientsQuery.data?.res || []).map((patient) => (
            <option key={patient._id} value={patient._id}>
              {patient.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient AI Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => insightQuery.refetch()}
            disabled={insightQuery.isFetching}
          >
            {insightQuery.isFetching ? "Refreshing..." : "Refresh Insight"}
          </Button>
          {insightQuery.isLoading && (
            <Loader label="Generating clinical assistant output..." />
          )}
          {insightQuery.isError && (
            <p className="text-sm text-red-500">
              Failed to generate insight. Please retry.
            </p>
          )}
          {insightQuery.data?.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InsightCard
                title="Patient Summary"
                value={insightQuery.data.data.patientSummary}
              />
              <InsightCard
                title="Medical History Summary"
                value={insightQuery.data.data.medicalHistorySummary}
              />
              <InsightCard
                title="Medication Summary"
                value={insightQuery.data.data.medicationSummary}
              />
              <InsightList
                title="Missed Follow-ups"
                items={insightQuery.data.data.missedFollowUps}
              />
              <InsightList
                title="Abnormal Trends"
                items={insightQuery.data.data.abnormalTrends}
              />
              <InsightList
                title="Risk Alerts"
                items={insightQuery.data.data.riskAlerts}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InsightCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase text-muted-foreground mb-2">{title}</p>
      <p className="text-sm">{value || "No data available."}</p>
    </div>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase text-muted-foreground mb-2">{title}</p>
      {items.length ? (
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">No items detected.</p>
      )}
    </div>
  );
}

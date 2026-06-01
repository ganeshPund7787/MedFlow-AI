import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPatientLabResults } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Sparkles,
  Scan,
  Loader2,
  BrainCircuit,
} from "lucide-react";
import type { User as UserType, LabResult } from "@/types";
import Loader from "@/components/global/Loader";
import { format } from "date-fns";
import { socket } from "@/lib/socket";

export default function History({ user }: { user: UserType }) {
  const {
    data: scans,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["lab-results", user._id],
    queryFn: () => getPatientLabResults(user._id),
    enabled: !!user._id,
    refetchInterval: (query) => {
      const list = query.state.data as LabResult[] | undefined;
      if (list?.some((s) => s.status === "pending")) return 5000;
      return false;
    },
  });

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const refresh = () => refetch();
    socket.on("lab_result_added", refresh);
    socket.on("lab_result_updated", refresh);

    return () => {
      socket.off("lab_result_added", refresh);
      socket.off("lab_result_updated", refresh);
    };
  }, [refetch]);

  const latestAnalyzed = scans?.find(
    (s) => s.status === "analyzed" || s.status === "reviewed",
  );
  const pendingCount =
    scans?.filter((s) => s.status === "pending").length ?? 0;

  return (
    <div className="space-y-4">
      <Card className="bg-linear-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-100 dark:border-indigo-900 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base text-indigo-900 dark:text-indigo-300">
                AI Medical Summary
              </CardTitle>
            </div>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {pendingCount} scan{pendingCount > 1 ? "s" : ""} analyzing
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Loader label="Loading AI summary..." />
          ) : isError ? (
            <p className="text-sm text-red-500">
              Could not load radiology history. Please try again.
            </p>
          ) : latestAnalyzed?.aiAnalysis ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {latestAnalyzed.aiAnalysis}
            </p>
          ) : pendingCount > 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
              Gemini AI is analyzing the latest X-ray upload. This summary will
              update automatically when complete.
            </p>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Based on records on file, the patient has{" "}
              {user.medicalHistory
                ? `a history of ${user.medicalHistory}.`
                : "no significant documented history."}{" "}
              Upload an X-ray in the X-Rays tab to generate an AI radiology
              summary.
            </p>
          )}
          {latestAnalyzed && (
            <p className="text-[10px] text-slate-400">
              Source: {latestAnalyzed.bodyPart} scan •{" "}
              {format(new Date(latestAnalyzed.createdAt), "MMM dd, yyyy")}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" /> Clinical History
        </h3>
        <div className="p-4 rounded-lg border bg-white dark:bg-slate-900 text-sm shadow-sm">
          {user.medicalHistory || "No medical history recorded."}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Scan className="h-4 w-4" /> Radiology Scan Records
        </h3>
        {isLoading ? (
          <Loader label="Loading scan history..." />
        ) : isError ? (
          <p className="text-sm text-red-500 text-center py-6">
            Failed to load scan records.
          </p>
        ) : !scans || scans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg border-dashed">
            No radiology scans on record.
          </p>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {scans.map((scan) => (
              <div
                key={scan._id}
                className="p-3 rounded-lg border bg-white dark:bg-slate-900 text-sm flex justify-between items-start gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {scan.bodyPart || scan.testType}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {format(new Date(scan.createdAt), "MMM dd, yyyy • hh:mm a")}
                  </p>
                  {scan.aiAnalysis && scan.status !== "pending" && (
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-2 line-clamp-2 flex items-start gap-1">
                      <BrainCircuit className="h-3 w-3 shrink-0 mt-0.5" />
                      {scan.aiAnalysis}
                    </p>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={
                    scan.status === "reviewed"
                      ? "bg-green-100 text-green-700 shrink-0"
                      : scan.status === "analyzed"
                        ? "bg-blue-100 text-blue-700 shrink-0"
                        : "shrink-0"
                  }
                >
                  {scan.status === "pending" ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      pending
                    </span>
                  ) : (
                    scan.status
                  )}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

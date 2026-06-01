import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllLabResults, updateLabResult } from "@/lib/api";
import { socket } from "@/lib/socket";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, CheckCircle, Clock, ShieldCheck, Heart, AlertCircle, Eye } from "lucide-react";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { format } from "date-fns";
import type { LabResult as LabResultType } from "@/types";

export function meta() {
  return [{ title: "Lab Results Sign-Off | MedFlow AI" }];
}

interface EnrichedLabResult extends LabResultType {
  patient: any | null;
}

const ResultsEntry = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedResult, setSelectedResult] = useState<EnrichedLabResult | null>(null);

  // Form State
  const [doctorNotes, setDoctorNotes] = useState("");
  const [status, setStatus] = useState("reviewed");

  // Sync with real-time Socket.IO
  useEffect(() => {
    socket.connect();

    const handleLabResultSync = (updatedItem?: any) => {
      queryClient.invalidateQueries({ queryKey: ["all-lab-results"] });
      if (selectedResult && updatedItem && selectedResult._id === updatedItem._id) {
        setSelectedResult({ ...selectedResult, ...updatedItem });
      }
    };

    socket.on("lab_result_updated", handleLabResultSync);
    socket.on("lab_result_added", () => {
      queryClient.invalidateQueries({ queryKey: ["all-lab-results"] });
    });

    return () => {
      socket.off("lab_result_updated", handleLabResultSync);
      socket.off("lab_result_added");
      socket.disconnect();
    };
  }, [queryClient, selectedResult]);

  // Sync notes and status when selected result changes
  useEffect(() => {
    if (selectedResult) {
      setDoctorNotes(selectedResult.doctorNotes || "");
      setStatus(selectedResult.status || "reviewed");
    }
  }, [selectedResult]);

  // Query: Fetch all global results
  const { data: resultsData, isLoading: isLoadingResults, isError } = useQuery({
    queryKey: ["all-lab-results", page],
    queryFn: () => getAllLabResults({ page, limit: 8 }),
    placeholderData: (previousData) => previousData,
  });

  // Mutation: Update result with notes and reviewed status
  const updateResultMutation = useMutation({
    mutationFn: updateLabResult,
    onSuccess: (res: any) => {
      toast.success("Diagnostic results verified and signed off successfully.");
      setSelectedResult(null);
      queryClient.invalidateQueries({ queryKey: ["all-lab-results"] });
      queryClient.invalidateQueries({ queryKey: ["lab-results-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update test results.");
    },
  });

  if (isLoadingResults) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading Results Queue..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-red-500">
        Error loading lab test results. Please refresh.
      </div>
    );
  }

  const results = resultsData?.res || [];
  const pagination = resultsData?.pagination;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResult) return;

    updateResultMutation.mutate({
      id: selectedResult._id,
      data: {
        doctorNotes,
        status,
      },
    });
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "reviewed":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1 hover:bg-emerald-100/80">
            <CheckCircle size={10} /> Reviewed
          </Badge>
        );
      case "analyzed":
        return (
          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 gap-1 hover:bg-blue-100/80">
            <ShieldCheck size={10} /> AI Analyzed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 border border-amber-200 gap-1 hover:bg-amber-100/80 animate-pulse">
            <Clock size={10} /> Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Diagnostic Sign-Off
        </h1>
        <p className="text-slate-500 font-medium">
          Verify artificial intelligence radiological analyses, append physician notes, and approve clinical results.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Results Queue Directory (Left 2/3) */}
        <Card className="xl:col-span-2 shadow-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Diagnostic Review Directory</CardTitle>
            <CardDescription>
              Fulfill, verify, and document diagnostics results logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-56 pl-6 font-bold">Patient Details</TableHead>
                    <TableHead className="font-bold text-center">Test Type</TableHead>
                    <TableHead className="font-bold text-center">Target Target</TableHead>
                    <TableHead className="font-bold text-center">Date Completed</TableHead>
                    <TableHead className="font-bold text-center">Status</TableHead>
                    <TableHead className="text-right pr-6 font-bold">Sign-off</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-40 text-center text-slate-400 italic"
                      >
                        No test results in queue.
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map((res: EnrichedLabResult) => {
                      const isSelected = selectedResult?._id === res._id;
                      return (
                        <TableRow
                          key={res._id}
                          onClick={() => setSelectedResult(res)}
                          className={`cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                            isSelected ? "bg-blue-50/40 dark:bg-blue-900/10 border-l-2 border-l-blue-600" : ""
                          }`}
                        >
                          <TableCell className="pl-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {res.patient?.name || "Unknown Patient"}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {res.patient?.email || "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {res.testType}
                          </TableCell>
                          <TableCell className="text-center text-xs text-slate-500 font-medium">
                            {res.bodyPart || "General"}
                          </TableCell>
                          <TableCell className="text-center text-xs text-slate-500 font-medium">
                            {res.createdAt ? format(new Date(res.createdAt), "MMM dd, yyyy") : "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(res.status)}
                          </TableCell>
                          <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedResult(res)}
                              className="h-8 rounded-lg"
                            >
                              Verify
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <CustomPagination
                loading={isLoadingResults}
                totalPages={pagination?.totalPages || 0}
                currentPage={pagination?.currentPage || 0}
                setPage={setPage}
              />
            </div>
          </CardContent>
        </Card>

        {/* Detailed Inspection and Sign-Off (Right 1/3) */}
        <div>
          {selectedResult ? (
            <Card className="shadow-sm rounded-xl overflow-hidden border-blue-100 dark:border-blue-900/30">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                    <FileText size={18} />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Results Sign-Off Panel
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {selectedResult.testType} • {selectedResult.bodyPart} Analysis
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Image Block */}
                {selectedResult.imageUrl && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">X-Ray Scan Image</Label>
                    <div className="relative border rounded-xl overflow-hidden aspect-square group">
                      <img src={selectedResult.imageUrl} alt="Scan review" className="w-full h-full object-cover" />
                      <a
                        href={selectedResult.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute bottom-2 right-2 p-1.5 bg-black/75 hover:bg-black text-white rounded-lg flex items-center gap-1 text-[10px]"
                      >
                        Fullscreen <Eye size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {/* AI Review Description */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={14} className="text-blue-600 animate-pulse" /> AI Computer-Aided Diagnostic Findings
                  </span>
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border leading-relaxed max-h-[200px] overflow-y-auto">
                    {selectedResult.aiAnalysis ? (
                      <p className="whitespace-pre-line">{selectedResult.aiAnalysis}</p>
                    ) : (
                      <span className="italic text-slate-400">Radiology diagnostic pipeline is compiling...</span>
                    )}
                  </div>
                </div>

                {/* Clinical Notes Form */}
                <form onSubmit={handleFormSubmit} className="space-y-4 border-t pt-4">
                  {/* Status Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Workflow Sign-off Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="rounded-lg text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reviewed" className="text-xs">Reviewed & Approved</SelectItem>
                        <SelectItem value="analyzed" className="text-xs">AI Analyzed Only</SelectItem>
                        <SelectItem value="pending" className="text-xs">Pending Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Doctor Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="doc-notes" className="text-xs font-bold">
                      Human Clinical Observations / Notes
                    </Label>
                    <Textarea
                      id="doc-notes"
                      placeholder="Add final clinical observations, recommendations or warnings..."
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      className="rounded-lg min-h-[90px] text-xs"
                      required
                    />
                  </div>

                  {/* Submit button */}
                  <Button
                    type="submit"
                    disabled={updateResultMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 gap-1.5 text-xs font-bold"
                  >
                    {updateResultMutation.isPending ? (
                      <Loader label="Signing..." />
                    ) : (
                      <>
                        <CheckSquareIcon size={16} /> Save & Release Approved Results
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm rounded-xl p-8 text-center text-slate-400 border border-dashed flex flex-col items-center justify-center h-[450px]">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-3 text-slate-500">
                <FileText size={32} />
              </div>
              <p className="font-bold">Queue Empty / Select Result</p>
              <p className="text-xs max-w-[200px] mt-1">
                Select a diagnostic item from the queue to verify the multimodal machine learning evaluation and release reviewed conclusions.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple helper icon
const CheckSquareIcon = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-square">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

export default ResultsEntry;

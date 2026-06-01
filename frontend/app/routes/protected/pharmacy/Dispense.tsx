import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPrescriptions, dispensePrescription } from "@/lib/api";
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
import { Pill, ClipboardList, CheckSquare, Clock, User, FileText, ShoppingCart } from "lucide-react";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { format } from "date-fns";

export function meta() {
  return [{ title: "Dispensation Hub | MedFlow AI" }];
}

const Dispense = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedPres, setSelectedPres] = useState<any | null>(null);

  // Hook up to real-time syncs
  useEffect(() => {
    socket.connect();
    
    const handlePrescriptionSync = () => {
      queryClient.invalidateQueries({ queryKey: ["pending-prescriptions"] });
    };

    socket.on("prescription_created", handlePrescriptionSync);
    socket.on("prescription_dispensed", (data: { prescriptionId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-prescriptions"] });
      if (selectedPres && selectedPres._id === data.prescriptionId) {
        setSelectedPres(null);
      }
    });

    return () => {
      socket.off("prescription_created", handlePrescriptionSync);
      socket.off("prescription_dispensed");
      socket.disconnect();
    };
  }, [queryClient, selectedPres]);

  // Query: Fetch pending prescriptions only
  const { data, isLoading, isError } = useQuery({
    queryKey: ["pending-prescriptions", page],
    queryFn: () => getPrescriptions({ page, limit: 8, status: "pending" }),
    placeholderData: (previousData) => previousData,
  });

  // Mutation: Dispense prescription
  const dispenseMutation = useMutation({
    mutationFn: dispensePrescription,
    onSuccess: (res: any) => {
      toast.success(res.message || "Prescription dispensed successfully and billed.");
      setSelectedPres(null);
      queryClient.invalidateQueries({ queryKey: ["pending-prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to dispense prescription.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading Dispensing Queue..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-red-500">
        Error loading dispensing queue. Please refresh.
      </div>
    );
  }

  const prescriptions = data?.res || [];
  const pagination = data?.pagination;

  const handleDispenseClick = (prescription: any) => {
    dispenseMutation.mutate(prescription._id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Dispensation Hub
        </h1>
        <p className="text-slate-500 font-medium">
          Review, analyze, and dispatch drug formulations and automatically trigger patient checkouts.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Pending Prescriptions List (Left 2/3) */}
        <Card className="xl:col-span-2 shadow-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Dispensing Queue</CardTitle>
            <CardDescription>
              Awaiting verification and physical drug dispatch.
            </CardDescription>
          </CardHeader>
          <CardContent className="">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-56 pl-6 font-bold">Patient Details</TableHead>
                    <TableHead className="font-bold">Prescribed By</TableHead>
                    <TableHead className="font-bold">Drug Summary</TableHead>
                    <TableHead className="font-bold text-center">Fulfillment Status</TableHead>
                    <TableHead className="text-right pr-6 font-bold">Inspection</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-40 text-center text-slate-400 italic"
                      >
                        No pending prescriptions in queue.
                      </TableCell>
                    </TableRow>
                  ) : (
                    prescriptions.map((pres: any) => {
                      const isSelected = selectedPres?._id === pres._id;
                      return (
                        <TableRow
                          key={pres._id}
                          onClick={() => setSelectedPres(pres)}
                          className={`cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                            isSelected ? "bg-blue-50/40 dark:bg-blue-900/10 border-l-2 border-l-blue-600" : ""
                          }`}
                        >
                          <TableCell className="pl-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {pres.patient?.name || "Unknown Patient"}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {pres.patient?.email || "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            Dr. {pres.doctor?.name || "Staff"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium">
                            {pres.medications.length} medication(s) prescribed
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100/80 gap-1 animate-pulse">
                              <Clock size={10} /> Pending
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedPres(pres)}
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
                loading={isLoading}
                totalPages={pagination?.totalPages || 0}
                currentPage={pagination?.currentPage || 0}
                setPage={setPage}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prescription Inspection View (Right 1/3) */}
        <div>
          {selectedPres ? (
            <Card className="shadow-sm rounded-xl overflow-hidden border-blue-100 dark:border-blue-900/30">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                    <ClipboardList size={18} />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Prescription Inspection
                    </CardTitle>
                    <CardDescription className="text-xs">
                      #{selectedPres._id.slice(-8).toUpperCase()} • Dr. {selectedPres.doctor?.name || "Staff"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Patient Block */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg">
                    <User size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {selectedPres.patient?.name || "Unknown Patient"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Patient ID: {selectedPres.patientId}
                    </p>
                  </div>
                </div>

                {/* Formulations List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Pill size={14} /> Drug Checklist
                  </h4>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {selectedPres.medications.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-lg space-y-2"
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {item.medicationId?.name || "Formula"}
                          </span>
                          <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1 rounded-sm">
                            x{item.quantity} Qty
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500 font-semibold">
                          <div>
                            <span className="text-slate-400">Dosage: </span>{item.dosage}
                          </div>
                          <div>
                            <span className="text-slate-400">Freq: </span>{item.frequency}
                          </div>
                          <div>
                            <span className="text-slate-400">Dur: </span>{item.duration}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedPres.notes && (
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase">Fulfillment Notes</h5>
                    <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-900/35 p-3 rounded-lg border border-dashed border-slate-100 dark:border-slate-800">
                      "{selectedPres.notes}"
                    </p>
                  </div>
                )}

                {/* Dispense Trigger */}
                <Button
                  onClick={() => handleDispenseClick(selectedPres)}
                  disabled={dispenseMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 gap-1.5 text-xs font-bold shadow-blue-500/20"
                >
                  {dispenseMutation.isPending ? (
                    <Loader label="Fulfilling..." />
                  ) : (
                    <>
                      <CheckSquare size={16} /> Fulfill & Dispense Drugs
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm rounded-xl p-8 text-center text-slate-400 border border-dashed flex flex-col items-center justify-center h-[450px]">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-3 text-slate-500">
                <FileText size={32} />
              </div>
              <p className="font-bold">Queue Empty / Select Order</p>
              <p className="text-xs max-w-[200px] mt-1">
                Select a pending medication order from the dispensing queue to audit and dispatch formulas.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dispense;

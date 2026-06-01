import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPrescriptions, createPrescription, getUsers, getPharmacyInventory } from "@/lib/api";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, PlusCircle, Trash, Plus, FileText, CheckCircle, Clock } from "lucide-react";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { format } from "date-fns";

export function meta() {
  return [{ title: "Prescriptions Management | MedFlow AI" }];
}

interface MedicationRow {
  medicationId: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
}

const Prescriptions = () => {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role;
  const isDoctor = userRole === "doctor" || userRole === "admin";

  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [notes, setNotes] = useState("");
  
  // Medications list within the prescription being drafted
  const [draftMedications, setDraftMedications] = useState<MedicationRow[]>([
    { medicationId: "", dosage: "", frequency: "", duration: "", quantity: 1 }
  ]);

  // Query: Fetch all prescriptions
  const { data: presData, isLoading: isLoadingPres } = useQuery({
    queryKey: ["pharmacy-prescriptions", page],
    queryFn: () => getPrescriptions({ page, limit: 8 }),
    placeholderData: (previousData) => previousData,
  });

  // Query: Fetch patients list (for selector)
  const { data: patientsData } = useQuery({
    queryKey: ["active-patients-selector"],
    queryFn: () => getUsers({ role: "patient", page: 1, limit: 100 }),
    enabled: isDoctor && isModalOpen,
  });

  // Query: Fetch inventory (for formula selector)
  const { data: medicationsData } = useQuery({
    queryKey: ["active-medications-selector"],
    queryFn: () => getPharmacyInventory({ page: 1, limit: 100 }),
    enabled: isDoctor && isModalOpen,
  });

  // Mutation: Create prescription
  const createPresMutation = useMutation({
    mutationFn: createPrescription,
    onSuccess: (res: any) => {
      toast.success(res.message || "Prescription written successfully.");
      setIsModalOpen(false);
      
      // Reset form
      setSelectedPatientId("");
      setNotes("");
      setDraftMedications([{ medicationId: "", dosage: "", frequency: "", duration: "", quantity: 1 }]);

      queryClient.invalidateQueries({ queryKey: ["pharmacy-prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-prescription-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create prescription.");
    },
  });

  if (isLoadingPres) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading Prescriptions..." />
      </div>
    );
  }

  const prescriptions = presData?.res || [];
  const pagination = presData?.pagination;

  const patientsList = patientsData?.res || [];
  const medsList = medicationsData?.res || [];

  const handleAddMedicationRow = () => {
    setDraftMedications([
      ...draftMedications,
      { medicationId: "", dosage: "", frequency: "", duration: "", quantity: 1 }
    ]);
  };

  const handleRemoveMedicationRow = (index: number) => {
    if (draftMedications.length === 1) return;
    setDraftMedications(draftMedications.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, key: keyof MedicationRow, value: any) => {
    const updated = [...draftMedications];
    updated[index] = { ...updated[index], [key]: value };
    setDraftMedications(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Please select a patient.");
      return;
    }

    // Verify all rows are filled out
    const isInvalid = draftMedications.some(
      (m) => !m.medicationId || !m.dosage || !m.frequency || !m.duration || m.quantity <= 0
    );

    if (isInvalid) {
      toast.error("Please complete all medication details correctly.");
      return;
    }

    createPresMutation.mutate({
      patientId: selectedPatientId,
      medications: draftMedications,
      notes,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "dispensed":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1 hover:bg-emerald-100/80">
            <CheckCircle size={10} /> Dispensed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="gap-1">
            Cancelled
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Medical Prescriptions
          </h1>
          <p className="text-slate-500 font-medium">
            Review prescriptions history, issue new medication orders, and track fulfillment states.
          </p>
        </div>
        {isDoctor && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 gap-1.5 text-xs"
          >
            <PlusCircle size={14} /> Write Prescription
          </Button>
        )}
      </div>

      {/* Main Datatable */}
      <Card className="shadow-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Prescription Logs</CardTitle>
          <CardDescription>
            Audit and check chronological pharmacological prescription releases.
          </CardDescription>
        </CardHeader>
        <CardContent className="">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56 pl-6 font-bold">Patient Name</TableHead>
                  <TableHead className="font-bold">Prescribing Doctor</TableHead>
                  <TableHead className="font-bold">Medications & Directions</TableHead>
                  <TableHead className="font-bold text-center">Written Date</TableHead>
                  <TableHead className="font-bold text-center">Fulfillment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-40 text-center text-slate-400 italic"
                    >
                      No prescriptions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  prescriptions.map((pres: any) => (
                    <TableRow
                      key={pres._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
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
                      <TableCell className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        Dr. {pres.doctor?.name || "Staff"}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1.5 max-w-[320px]">
                          {pres.medications.map((item: any, i: number) => (
                            <div key={i} className="text-xs flex items-start gap-1 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                              <span className="font-bold text-blue-600 dark:text-blue-400">{item.medicationId?.name || "Medication"}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500 font-medium">{item.dosage}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500 italic">{item.frequency}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-[10px] bg-blue-100/50 text-blue-700 px-1 py-0.5 rounded ml-auto">x{item.quantity}</span>
                            </div>
                          ))}
                          {pres.notes && (
                            <p className="text-[10px] text-slate-400 italic mt-1 px-1">
                              Notes: "{pres.notes}"
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500 font-medium">
                        {pres.createdAt ? format(new Date(pres.createdAt), "MMM dd, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(pres.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <CustomPagination
              loading={isLoadingPres}
              totalPages={pagination?.totalPages || 0}
              currentPage={pagination?.currentPage || 0}
              setPage={setPage}
            />
          </div>
        </CardContent>
      </Card>

      {/* Write Prescription Dialog Wizard */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="text-blue-600" size={20} />
              Write Medical Prescription
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Patient selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Patient</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId} required>
                <SelectTrigger className="rounded-lg text-xs h-9">
                  <SelectValue placeholder="Choose Patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patientsList.map((patient: any) => (
                    <SelectItem key={patient._id} value={patient._id} className="text-xs">
                      {patient.name} ({patient.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Medications Rows Builder */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Prescribed Formulas</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddMedicationRow}
                  className="text-xs text-blue-600 hover:text-blue-700 h-7 gap-1 font-bold"
                >
                  <Plus size={14} /> Add Formula
                </Button>
              </div>

              {draftMedications.map((row, index) => (
                <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/30 border rounded-xl space-y-3 relative group">
                  {draftMedications.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMedicationRow(index)}
                      className="absolute right-2 top-2 h-6 w-6 text-red-500 hover:text-red-600"
                    >
                      <Trash size={12} />
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {/* Medication Formula Selector */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold">Formula</Label>
                      <Select
                        value={row.medicationId}
                        onValueChange={(val) => handleRowChange(index, "medicationId", val)}
                        required
                      >
                        <SelectTrigger className="rounded-lg text-xs h-8">
                          <SelectValue placeholder="Choose Drug..." />
                        </SelectTrigger>
                        <SelectContent>
                          {medsList.map((m: any) => (
                            <SelectItem key={m._id} value={m._id} className="text-xs">
                              {m.name} (Stock: {m.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold">Release Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={row.quantity || ""}
                        onChange={(e) => handleRowChange(index, "quantity", Number(e.target.value))}
                        className="rounded-lg h-8 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Dosage */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold">Dosage</Label>
                      <Input
                        placeholder="e.g. 500mg"
                        value={row.dosage}
                        onChange={(e) => handleRowChange(index, "dosage", e.target.value)}
                        className="rounded-lg h-8 text-xs"
                        required
                      />
                    </div>

                    {/* Frequency */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold">Frequency</Label>
                      <Input
                        placeholder="e.g. 2x daily"
                        value={row.frequency}
                        onChange={(e) => handleRowChange(index, "frequency", e.target.value)}
                        className="rounded-lg h-8 text-xs"
                        required
                      />
                    </div>

                    {/* Duration */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold">Duration</Label>
                      <Input
                        placeholder="e.g. 7 days"
                        value={row.duration}
                        onChange={(e) => handleRowChange(index, "duration", e.target.value)}
                        className="rounded-lg h-8 text-xs"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Directions / Clinical Notes</Label>
              <Textarea
                placeholder="Indicate extra guidelines (e.g. 'with meals', 'avoid alcohol')..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-lg min-h-[60px] text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg h-9 text-xs"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPresMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs gap-1"
              >
                {createPresMutation.isPending ? <Loader label="Saving..." /> : "Issue Prescription"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Prescriptions;

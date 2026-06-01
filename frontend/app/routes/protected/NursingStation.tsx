import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNursingPatients, recordVitals, getPatientVitals } from "@/lib/api";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Heart,
  Thermometer,
  Activity,
  User,
  Plus,
  History,
  Droplet,
  Scale,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import GlobalSearch from "@/components/global/GlobalSearch";
import { toast } from "sonner";
import type { User as UserType } from "@/types";

export function meta() {
  return [{ title: "Nursing Station | MedFlow AI" }];
}

interface PatientWithVitals extends UserType {
  latestVitals: any | null;
}

const NursingStation = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientWithVitals | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form State
  const [bloodPressure, setBloodPressure] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  // Connect to socket for real-time updates
  useEffect(() => {
    socket.connect();
    
    const handleVitalsRecorded = (data: { patientId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["nursing-patients"] });
      if (selectedPatient && selectedPatient._id === data.patientId) {
        queryClient.invalidateQueries({ queryKey: ["patient-vitals", data.patientId] });
      }
    };

    socket.on("vitals_recorded", handleVitalsRecorded);
    socket.on("notify_user_updated", () => {
      queryClient.invalidateQueries({ queryKey: ["nursing-patients"] });
    });

    return () => {
      socket.off("vitals_recorded", handleVitalsRecorded);
      socket.disconnect();
    };
  }, [queryClient, selectedPatient]);

  // Query: Fetch patients list
  const { data, isLoading, isError } = useQuery({
    queryKey: ["nursing-patients", page],
    queryFn: () => getNursingPatients({ page, limit: 8 }),
    placeholderData: (previousData) => previousData,
  });

  // Query: Fetch vitals history for selected patient
  const { data: vitalsHistory, isLoading: isLoadingVitals } = useQuery({
    queryKey: ["patient-vitals", selectedPatient?._id],
    queryFn: () => getPatientVitals(selectedPatient!._id),
    enabled: !!selectedPatient,
  });

  // Mutation: Record Vitals
  const recordVitalsMutation = useMutation({
    mutationFn: recordVitals,
    onSuccess: (res: any) => {
      toast.success(res.message || "Vitals recorded successfully.");
      setIsRecordModalOpen(false);
      
      // Reset form
      setBloodPressure("");
      setHeartRate("");
      setTemperature("");
      setRespiratoryRate("");
      setOxygenSaturation("");
      setWeight("");
      setNotes("");

      queryClient.invalidateQueries({ queryKey: ["nursing-patients"] });
      if (selectedPatient) {
        queryClient.invalidateQueries({ queryKey: ["patient-vitals", selectedPatient._id] });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record vitals.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading Nursing Station..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-red-500">
        Error loading Nursing Station data. Please refresh.
      </div>
    );
  }

  const patients: PatientWithVitals[] = data?.res || [];
  const pagination = data?.pagination;

  // Local filtering for quick filter
  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenRecordModal = (patient: PatientWithVitals) => {
    setSelectedPatient(patient);
    setIsRecordModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    if (!bloodPressure || !heartRate || !temperature) {
      toast.error("Please fill out all required fields.");
      return;
    }

    // BP format check (e.g. 120/80)
    const bpRegex = /^\d{2,3}\/\d{2,3}$/;
    if (!bpRegex.test(bloodPressure)) {
      toast.error("Blood pressure must be in 'SYS/DIA' format (e.g., 120/80).");
      return;
    }

    recordVitalsMutation.mutate({
      patientId: selectedPatient._id,
      bloodPressure,
      heartRate: Number(heartRate),
      temperature: Number(temperature),
      respiratoryRate: respiratoryRate ? Number(respiratoryRate) : undefined,
      oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : undefined,
      weight: weight ? Number(weight) : undefined,
      notes,
    });
  };

  // Safe vitals value getters
  const getBPCategoryColor = (bp: string) => {
    if (!bp) return "text-slate-500";
    const [sys, dia] = bp.split("/").map(Number);
    if (sys > 140 || dia > 90) return "text-red-500 font-bold";
    if (sys > 120 || dia > 80) return "text-amber-500 font-bold";
    return "text-emerald-500 font-bold";
  };

  const getHRColor = (hr: number) => {
    if (!hr) return "text-slate-500";
    if (hr > 100 || hr < 60) return "text-red-500 font-bold";
    return "text-emerald-500 font-bold";
  };

  const getTempColor = (temp: number) => {
    if (!temp) return "text-slate-500";
    if (temp > 37.8 || temp < 35.5) return "text-red-500 font-bold";
    return "text-emerald-500 font-bold";
  };

  const getO2Color = (o2: number) => {
    if (!o2) return "text-slate-500";
    if (o2 < 95) return "text-red-500 font-bold";
    return "text-emerald-500 font-bold";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Nursing Station
        </h1>
        <p className="text-slate-500 font-medium">
          Manage admitted patient care plans, monitor physiological vitals, and track recovery state.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Admitted Patient Directory (Left 2/3) */}
        <Card className="xl:col-span-2 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Admitted Patients</CardTitle>
              <CardDescription>
                Select a patient to view full vital trends and logs history.
              </CardDescription>
            </div>
            <GlobalSearch
              search={search}
              setSearch={setSearch}
              title="Search patient..."
            />
          </CardHeader>
          <CardContent className="">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-56 pl-6 font-bold">Patient</TableHead>
                    <TableHead className="font-bold text-center">Age/Gender</TableHead>
                    <TableHead className="font-bold text-center">Admission Reason</TableHead>
                    <TableHead className="font-bold text-center">Latest Vitals</TableHead>
                    <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-40 text-center text-slate-400 italic"
                      >
                        No admitted patients found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map((patient) => {
                      const isSelected = selectedPatient?._id === patient._id;
                      const hasVitals = !!patient.latestVitals;
                      return (
                        <TableRow
                          key={patient._id}
                          onClick={() => setSelectedPatient(patient)}
                          className={`cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                            isSelected ? "bg-blue-50/40 dark:bg-blue-900/10 border-l-2 border-l-blue-600" : ""
                          }`}
                        >
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-slate-100">
                                <AvatarImage src={patient.image || ""} />
                                <AvatarFallback className="font-bold text-xs bg-blue-50 text-blue-600">
                                  {patient.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                  {patient.name}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                                  {patient.email}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                            {patient.age || "N/A"} y/o • {patient.gender || "N/A"}
                          </TableCell>
                          <TableCell className="text-center text-sm text-slate-500 max-w-[200px] truncate">
                            {patient.admissionReason || "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {hasVitals ? (
                              <div className="flex flex-col items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Heart size={10} className="text-red-500 animate-pulse" />
                                  <span className={getBPCategoryColor(patient.latestVitals.bloodPressure)}>
                                    {patient.latestVitals.bloodPressure}
                                  </span>
                                </span>
                                <span className="text-slate-400">
                                  HR: <span className={getHRColor(patient.latestVitals.heartRate)}>{patient.latestVitals.heartRate}</span> • Temp: <span className={getTempColor(patient.latestVitals.temperature)}>{patient.latestVitals.temperature}°C</span>
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300 italic">No vitals logged</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 gap-1"
                              onClick={() => handleOpenRecordModal(patient)}
                            >
                              <Plus size={14} /> Record
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

        {/* Patient Vitals History (Right 1/3) */}
        <div className="space-y-4">
          {selectedPatient ? (
            <Card className="shadow-sm rounded-xl overflow-hidden border-blue-100 dark:border-blue-900/30">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-slate-200">
                    <AvatarImage src={selectedPatient.image || ""} />
                    <AvatarFallback className="font-bold text-xs bg-blue-100 text-blue-700">
                      {selectedPatient.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {selectedPatient.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Primary Dr: {selectedPatient.assignedDoctorName || "Unassigned"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Micro-metrics cards */}
                {selectedPatient.latestVitals && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-red-50/40 dark:bg-red-950/10 border border-red-100/50 dark:border-red-900/20 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Activity size={12} className="text-red-500" /> Blood Pressure
                      </span>
                      <p className={`text-base font-black ${getBPCategoryColor(selectedPatient.latestVitals.bloodPressure)}`}>
                        {selectedPatient.latestVitals.bloodPressure}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50/40 dark:bg-orange-950/10 border border-orange-100/50 dark:border-orange-900/20 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Heart size={12} className="text-orange-500" /> Heart Rate
                      </span>
                      <p className={`text-base font-black ${getHRColor(selectedPatient.latestVitals.heartRate)}`}>
                        {selectedPatient.latestVitals.heartRate} <span className="text-xs font-normal text-slate-400">bpm</span>
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Thermometer size={12} className="text-amber-500" /> Temperature
                      </span>
                      <p className={`text-base font-black ${getTempColor(selectedPatient.latestVitals.temperature)}`}>
                        {selectedPatient.latestVitals.temperature}°C
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Droplet size={12} className="text-blue-500" /> SpO₂ Saturation
                      </span>
                      <p className={`text-base font-black ${getO2Color(selectedPatient.latestVitals.oxygenSaturation)}`}>
                        {selectedPatient.latestVitals.oxygenSaturation ? `${selectedPatient.latestVitals.oxygenSaturation}%` : "N/A"}
                      </p>
                    </div>
                  </div>
                )}

                {/* History Timeline */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1">
                    <History size={14} /> Vitals Log History
                  </h4>
                  {isLoadingVitals ? (
                    <div className="py-10 text-center">
                      <Loader label="Loading history..." />
                    </div>
                  ) : vitalsHistory && vitalsHistory.length > 0 ? (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {vitalsHistory.map((log: any) => (
                        <div
                          key={log._id}
                          className="p-3 bg-slate-50 dark:bg-slate-900/30 border rounded-lg space-y-2 hover:shadow-xs transition-shadow"
                        >
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                            <span className="bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              By: {log.recordedBy?.name || "Staff"}
                            </span>
                            <span>{format(new Date(log.createdAt), "MMM dd, hh:mm a")}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-center">
                            <div className="flex flex-col bg-white dark:bg-slate-800/50 py-1 rounded border border-slate-100 dark:border-slate-800">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">BP</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {log.bloodPressure}
                              </span>
                            </div>
                            <div className="flex flex-col bg-white dark:bg-slate-800/50 py-1 rounded border border-slate-100 dark:border-slate-800">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">HR</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {log.heartRate}
                              </span>
                            </div>
                            <div className="flex flex-col bg-white dark:bg-slate-800/50 py-1 rounded border border-slate-100 dark:border-slate-800">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Temp</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {log.temperature}°C
                              </span>
                            </div>
                          </div>
                          {log.notes && (
                            <p className="text-xs text-slate-500 italic bg-white dark:bg-slate-800/30 p-2 rounded border border-dashed border-slate-100 dark:border-slate-800">
                              "{log.notes}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-400 italic text-xs">
                      No vitals history recorded for this patient.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm rounded-xl p-8 text-center text-slate-400 border border-dashed flex flex-col items-center justify-center h-[450px]">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-3 text-slate-500">
                <User size={32} />
              </div>
              <p className="font-bold">No Patient Selected</p>
              <p className="text-xs max-w-[200px] mt-1">
                Select an admitted patient from the directory to monitor vitals and view history.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Record Vitals Dialog Modal */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} />
              Record Patient Vitals
            </DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="flex items-center gap-3 p-3 bg-blue-50/40 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/20 rounded-xl my-2">
              <Avatar className="h-9 w-9 border border-blue-200">
                <AvatarImage src={selectedPatient.image || ""} />
                <AvatarFallback className="font-bold text-xs bg-blue-100 text-blue-700">
                  {selectedPatient.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {selectedPatient.name}
                </span>
                <span className="text-[10px] text-slate-500">
                  Gender: {selectedPatient.gender || "N/A"} • Blood: {selectedPatient.bloodgroup || "N/A"}
                </span>
              </div>
            </div>
          )}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bp" className="text-xs font-bold">
                  Blood Pressure <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bp"
                  placeholder="e.g., 120/80"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hr" className="text-xs font-bold">
                  Heart Rate (BPM) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hr"
                  type="number"
                  placeholder="e.g., 72"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temp" className="text-xs font-bold">
                  Temperature (°C) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="temp"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 36.8"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rr" className="text-xs font-bold">
                  Respiratory Rate (BPM)
                </Label>
                <Input
                  id="rr"
                  type="number"
                  placeholder="e.g., 16"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spo2" className="text-xs font-bold">
                  SpO₂ Saturation (%)
                </Label>
                <Input
                  id="spo2"
                  type="number"
                  placeholder="e.g., 98"
                  value={oxygenSaturation}
                  onChange={(e) => setOxygenSaturation(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-xs font-bold">
                  Weight (KG)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="e.g., 70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-bold">
                Clinical Observations / Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Describe any abnormal symptoms, pain descriptions, or care recommendations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-lg min-h-[70px] text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg h-9 text-xs"
                onClick={() => setIsRecordModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordVitalsMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs gap-1"
              >
                {recordVitalsMutation.isPending ? <Loader label="Saving..." /> : "Save Vitals"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NursingStation;

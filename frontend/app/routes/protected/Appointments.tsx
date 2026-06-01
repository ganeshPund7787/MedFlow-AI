import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppointments, createAppointment, updateAppointment, getUsers } from "@/lib/api";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, PlusCircle, Video, User, Check, X, Play, RefreshCw } from "lucide-react";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { format } from "date-fns";
import { useNavigate } from "react-router";

export function meta() {
  return [{ title: "Clinical Scheduling | MedFlow AI" }];
}

const Appointments = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role;
  const isPatient = userRole === "patient";
  const canUpdate = userRole === "admin" || userRole === "doctor" || userRole === "nurse";

  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Book Appointment Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);

  // Sync lists on Socket.IO alerts
  useEffect(() => {
    socket.connect();

    const handleApptSync = () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-list"] });
    };

    socket.on("appointment_created", handleApptSync);
    socket.on("appointment_updated", handleApptSync);

    return () => {
      socket.off("appointment_created", handleApptSync);
      socket.off("appointment_updated", handleApptSync);
      socket.disconnect();
    };
  }, [queryClient]);

  // Query: Fetch appointments
  const { data: apptData, isLoading, isError } = useQuery({
    queryKey: ["appointments-list", page],
    queryFn: () => getAppointments({ page, limit: 8 }),
    placeholderData: (previousData) => previousData,
  });

  // Query: Fetch doctors list (for booking wizard)
  const { data: doctorsData } = useQuery({
    queryKey: ["doctors-selector"],
    queryFn: () => getUsers({ role: "doctor", page: 1, limit: 100 }),
    enabled: isModalOpen,
  });

  // Query: Fetch patients list (for admin booking wizard)
  const { data: patientsData } = useQuery({
    queryKey: ["patients-selector"],
    queryFn: () => getUsers({ role: "patient", page: 1, limit: 100 }),
    enabled: isModalOpen && !isPatient,
  });

  // Mutation: Book Appointment
  const bookApptMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: (res: any) => {
      toast.success(res.message || "Appointment scheduled successfully.");
      setIsModalOpen(false);
      
      // Reset form
      setSelectedDoctorId("");
      setSelectedPatientId("");
      setDate("");
      setTime("");
      setReason("");
      setIsVirtual(false);

      queryClient.invalidateQueries({ queryKey: ["appointments-list"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to schedule appointment.");
    },
  });

  // Mutation: Update status
  const updateStatusMutation = useMutation({
    mutationFn: updateAppointment,
    onSuccess: (res: any) => {
      toast.success(res.message || "Appointment status updated.");
      queryClient.invalidateQueries({ queryKey: ["appointments-list"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update status.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading Scheduling Center..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-red-500">
        Error loading scheduling metrics. Please refresh.
      </div>
    );
  }

  const appointments = apptData?.res || [];
  const pagination = apptData?.pagination;

  const doctorsList = doctorsData?.res || [];
  const patientsList = patientsData?.res || [];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !date || !time || !reason) {
      toast.error("Please fill out all required fields.");
      return;
    }

    const patientId = isPatient ? session?.user?.id : selectedPatientId;
    if (!patientId) {
      toast.error("Please select a patient.");
      return;
    }

    bookApptMutation.mutate({
      patientId,
      doctorId: selectedDoctorId,
      date,
      time,
      reason,
      isVirtual,
    });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({
      id,
      data: { status: newStatus },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/80">Completed</Badge>;
      case "confirmed":
        return <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-100/80">Confirmed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "in-progress":
        return <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100/80 animate-pulse">Consultation Active</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100/80">Scheduled</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Clinical Scheduling
          </h1>
          <p className="text-slate-500 font-medium">
            Book medical consultations, organize doctor schedules, and coordinate telemedicine appointments.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 gap-1.5 text-xs shadow-blue-500/10"
        >
          <PlusCircle size={14} /> Schedule Consultation
        </Button>
      </div>

      {/* Main Datatable */}
      <Card className="shadow-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
          <CardDescription>
            Audit and verify upcoming clinical slot rosters.
          </CardDescription>
        </CardHeader>
        <CardContent className="">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 font-bold">Patient Details</TableHead>
                  <TableHead className="font-bold">Attending Doctor</TableHead>
                  <TableHead className="font-bold text-center">Date / Time</TableHead>
                  <TableHead className="font-bold text-center">Format</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="text-right pr-6 font-bold">Slot Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-40 text-center text-slate-400 italic"
                    >
                      No upcoming appointments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((appt: any) => (
                    <TableRow
                      key={appt._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {appt.patient?.name || "Unknown Patient"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Reason: "{appt.reason}"
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        Dr. {appt.doctor?.name || "Staff"}
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500 font-medium">
                        {appt.date ? format(new Date(appt.date), "MMM dd, yyyy") : "N/A"} at <span className="font-bold">{appt.time}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {appt.isVirtual ? (
                          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100/80 gap-1 text-[10px]">
                            <Video size={10} /> Telemedicine
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <User size={10} /> In-Person
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(appt.status)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Live Video consultations launcher */}
                          {appt.isVirtual && appt.status === "in-progress" && (
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white rounded-lg h-8 gap-1 text-xs font-bold animate-pulse"
                              onClick={() => navigate(`/telemedicine?room=${appt.meetingId}`)}
                            >
                              <Play size={12} fill="currentColor" /> Enter Call
                            </Button>
                          )}
                          
                          {canUpdate && appt.status === "scheduled" && (
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleStatusChange(appt._id, "confirmed")}
                              className="h-8 w-8 text-emerald-600 border-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              title="Confirm Appointment"
                            >
                              <Check size={14} />
                            </Button>
                          )}

                          {canUpdate && appt.status === "confirmed" && appt.isVirtual && (
                            <Button
                              size="sm"
                              onClick={() => {
                                handleStatusChange(appt._id, "in-progress");
                                // Proactively navigate to the telemedicine visual feed
                                setTimeout(() => {
                                  navigate(`/telemedicine?room=${appt.meetingId}`);
                                }, 300);
                              }}
                              className="h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1"
                            >
                              <Play size={12} /> Start Call
                            </Button>
                          )}

                          {canUpdate && appt.status === "confirmed" && !appt.isVirtual && (
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleStatusChange(appt._id, "completed")}
                              className="h-8 w-8 text-emerald-600 border-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              title="Complete Visit"
                            >
                              <Check size={14} />
                            </Button>
                          )}

                          {canUpdate && appt.status !== "completed" && appt.status !== "cancelled" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleStatusChange(appt._id, "cancelled")}
                              className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                              title="Cancel Appointment"
                            >
                              <X size={14} />
                            </Button>
                          )}

                          {appt.status === "completed" && (
                            <span className="text-xs text-slate-300 italic pr-2">Signed off</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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

      {/* Book Appointment Dialog Wizard */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              Schedule Medical Consultation
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* If admin, let them choose patient */}
            {!isPatient && (
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
            )}

            {/* Doctor selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Practitioner (Doctor)</Label>
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId} required>
                <SelectTrigger className="rounded-lg text-xs h-9">
                  <SelectValue placeholder="Choose Doctor..." />
                </SelectTrigger>
                <SelectContent>
                  {doctorsList.map((doc: any) => (
                    <SelectItem key={doc._id} value={doc._id} className="text-xs">
                      Dr. {doc.name} ({doc.specialization || "General Medicine"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="appt-date" className="text-xs font-bold">
                  Date
                </Label>
                <Input
                  id="appt-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                  required
                />
              </div>

              {/* Time */}
              <div className="space-y-1.5">
                <Label htmlFor="appt-time" className="text-xs font-bold">
                  Time
                </Label>
                <Input
                  id="appt-time"
                  placeholder="e.g. 09:30 AM"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Telemedicine Option */}
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/35 p-3 rounded-xl border">
              <Checkbox
                id="is-virtual"
                checked={isVirtual}
                onCheckedChange={(checked) => setIsVirtual(Boolean(checked))}
              />
              <div className="grid gap-0.5 leading-none">
                <label
                  htmlFor="is-virtual"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1"
                >
                  Virtual Visit <Video size={12} className="text-blue-500" />
                </label>
                <p className="text-[10px] text-slate-400">
                  Select this to conduct a telemedicine call directly inside MedFlow AI.
                </p>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="appt-reason" className="text-xs font-bold">
                Reason for Appointment
              </Label>
              <Textarea
                id="appt-reason"
                placeholder="Describe your symptoms or primary concern in detail..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-lg min-h-[70px] text-xs"
                required
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
                disabled={bookApptMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs gap-1"
              >
                {bookApptMutation.isPending ? <Loader label="Booking..." /> : "Book Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Appointments;

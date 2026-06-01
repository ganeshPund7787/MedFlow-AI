import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppointments, updateAppointment } from "@/lib/api";
import { useSearchParams, useNavigate, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, VideoOff, Mic, MicOff, ScreenShare, PhoneOff, User, FileText, CheckCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export function meta() {
  return [{ title: "Virtual Consultation Room | MedFlow AI" }];
}

const Telemedicine = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role;
  const isDoctor = userRole === "doctor" || userRole === "admin";

  const [searchParams] = useSearchParams();
  const roomName = searchParams.get("room");

  // Call Settings State
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [callConnected, setCallConnected] = useState(false);

  // Diagnostic Form State (for Doctors)
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Query: Fetch all appointments to locate current virtual consultation
  const { data, isLoading } = useQuery({
    queryKey: ["appointments-list-telemed"],
    queryFn: () => getAppointments({ page: 1, limit: 100 }),
    enabled: !!roomName,
  });

  // Mutation: Complete Appointment
  const completeApptMutation = useMutation({
    mutationFn: updateAppointment,
    onSuccess: (res: any) => {
      toast.success("Telemedicine consultation successfully signed off and billing dispatched.");
      queryClient.invalidateQueries({ queryKey: ["appointments-list"] });
      navigate("/appointments");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete appointment.");
    },
  });

  // Simulated connect timer
  useEffect(() => {
    if (roomName) {
      const timer = setTimeout(() => {
        setCallConnected(true);
        toast.info("Secure end-to-end encrypted link established.");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [roomName]);

  if (!roomName) {
    return (
      <Card className="max-w-md mx-auto my-12 text-center p-8 shadow-sm rounded-xl border border-dashed flex flex-col items-center justify-center">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-3 text-slate-500">
          <ShieldAlert size={32} />
        </div>
        <CardTitle className="text-lg">No Active Room Found</CardTitle>
        <CardDescription className="text-xs mt-1 max-w-[280px]">
          Virtual rooms require an active slot invitation link. Please enter via your schedules directory.
        </CardDescription>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs mt-4">
          <Link to="/appointments">Go to Appointments</Link>
        </Button>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Initiating Encrypted Connection..." />
      </div>
    );
  }

  const appointmentsList = data?.res || [];
  const activeAppointment = appointmentsList.find((a: any) => a.meetingId === roomName);

  if (!activeAppointment) {
    return (
      <Card className="max-w-md mx-auto my-12 text-center p-8 shadow-sm rounded-xl border border-dashed flex flex-col items-center justify-center">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-3 text-slate-500">
          <ShieldAlert size={32} />
        </div>
        <CardTitle className="text-lg">Invalid Telemedicine Link</CardTitle>
        <CardDescription className="text-xs mt-1 max-w-[280px]">
          The requested virtual slot does not exist or has already been signed off.
        </CardDescription>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs mt-4">
          <Link to="/appointments">Go to Appointments</Link>
        </Button>
      </Card>
    );
  }

  const patient = activeAppointment.patient || {};
  const doctor = activeAppointment.doctor || {};

  const handleCompleteCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDoctor) {
      // Patients just leave the call
      navigate("/appointments");
      return;
    }

    if (!clinicalNotes) {
      toast.error("Please record your clinical observations before sign-off.");
      return;
    }

    completeApptMutation.mutate({
      id: activeAppointment._id,
      data: {
        status: "completed",
        reason: activeAppointment.reason + ` | Clinical Observations: ${clinicalNotes}`,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Virtual Consultation
          </h1>
          <p className="text-slate-500 font-medium">
            Room: <span className="font-mono text-blue-600">{roomName.slice(0, 15)}...</span>
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100/80 gap-1.5 text-xs px-2.5 py-1">
          <ShieldCheck size={12} /> Encrypted Session
        </Badge>
      </div>

      {/* Split grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch min-h-[500px]">
        {/* Left Side: Call Streams (2/3) */}
        <div className="xl:col-span-2 flex flex-col space-y-4 h-full">
          <Card className="flex-1 bg-slate-950 dark:bg-black border-none rounded-2xl overflow-hidden relative shadow-lg min-h-[400px] flex flex-col justify-between">
            {/* Header info */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <Badge className="bg-black/60 text-white border-none gap-1.5 py-1 px-2.5 text-[10px]">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                Live: {isDoctor ? patient.name : `Dr. ${doctor.name}`}
              </Badge>
              {callConnected ? (
                <Badge className="bg-emerald-500/80 text-white border-none text-[10px] py-1 px-2.5">
                  1080p HD
                </Badge>
              ) : (
                <Badge className="bg-amber-500/80 text-white border-none text-[10px] py-1 px-2.5">
                  Connecting...
                </Badge>
              )}
            </div>

            {/* Remote feed container */}
            <div className="flex-1 flex items-center justify-center relative">
              {callConnected && cameraActive ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/40 text-slate-400">
                  {/* Remote video avatar representing another user stream */}
                  <div className="h-32 w-32 rounded-full border-4 border-blue-500 bg-blue-100/20 flex items-center justify-center relative shadow-lg">
                    <User size={64} className="text-blue-500 animate-pulse" />
                    <div className="absolute -bottom-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Feed Active
                    </div>
                  </div>
                  {/* Visual microphone wave simulation */}
                  <div className="flex items-center gap-1 mt-6">
                    <span className="h-4 w-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <span className="h-6 w-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <span className="h-5 w-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                    <span className="h-3 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                    <span className="h-7 w-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.5s" }} />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-2">Streaming High-Fidelity peer audio...</p>
                </div>
              ) : (
                <div className="text-slate-600 flex flex-col items-center justify-center">
                  <VideoOff size={48} className="text-slate-700 animate-pulse" />
                  <p className="text-sm font-bold mt-2">Camera disabled by remote user</p>
                </div>
              )}

              {/* Local Self-preview inset card */}
              <div className="absolute bottom-4 right-4 h-32 w-44 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl flex flex-col items-center justify-center">
                {cameraActive ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-blue-950/20 relative">
                    <div className="h-10 w-10 rounded-full bg-slate-800/80 flex items-center justify-center border border-blue-500/30">
                      <User size={16} className="text-blue-400" />
                    </div>
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                      You (Preview)
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-600 flex flex-col items-center justify-center">
                    <VideoOff size={16} />
                    <span className="text-[8px] mt-1 font-bold">Cam Off</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom floating control bar */}
            <div className="bg-slate-900/90 dark:bg-black/90 p-4 border-t border-slate-800 flex justify-center items-center gap-4 z-10">
              <Button
                size="icon"
                variant={cameraActive ? "outline" : "destructive"}
                onClick={() => setCameraActive(!cameraActive)}
                className={`h-10 w-10 rounded-xl border-slate-800 hover:bg-slate-800 ${cameraActive ? "text-slate-300" : "text-white"}`}
              >
                {cameraActive ? <Video size={18} /> : <VideoOff size={18} />}
              </Button>

              <Button
                size="icon"
                variant={micActive ? "outline" : "destructive"}
                onClick={() => setMicActive(!micActive)}
                className={`h-10 w-10 rounded-xl border-slate-800 hover:bg-slate-800 ${micActive ? "text-slate-300" : "text-white"}`}
              >
                {micActive ? <Mic size={18} /> : <MicOff size={18} />}
              </Button>

              <Button
                size="icon"
                variant={sharingScreen ? "outline" : "outline"}
                onClick={() => {
                  setSharingScreen(!sharingScreen);
                  if (!sharingScreen) toast.success("Simulating screen sharing...");
                }}
                className={`h-10 w-10 rounded-xl border-slate-800 hover:bg-slate-800 ${sharingScreen ? "bg-blue-600 border-blue-600 text-white" : "text-slate-300"}`}
              >
                <ScreenShare size={18} />
              </Button>

              <Button
                size="icon"
                variant="destructive"
                onClick={() => navigate("/appointments")}
                className="h-10 w-12 rounded-xl text-white shadow-lg shadow-red-500/20"
                title="Hang Up"
              >
                <PhoneOff size={18} />
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Side: Doctor observations and Sign-off (1/3) */}
        <div>
          <Card className="shadow-sm rounded-xl overflow-hidden border-blue-100 dark:border-blue-900/30 h-full flex flex-col justify-between">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                  <FileText size={18} />
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Clinical EHR Console
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Patient medical record entry portal.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 flex-1 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                {/* Patient summary details */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{patient.name || "Patient"}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      Age: {patient.age || "N/A"} • Gender: {patient.gender || "N/A"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    <span className="font-bold text-slate-400">Chief Complaint:</span> "{activeAppointment.reason}"
                  </p>
                </div>

                {/* Attending Notes or observations */}
                {isDoctor ? (
                  <form onSubmit={handleCompleteCall} className="space-y-4 flex flex-col">
                    <div className="space-y-1.5">
                      <Label htmlFor="clinical-notes" className="text-xs font-bold">
                        Attending Doctor Notes / Prescriptions
                      </Label>
                      <Textarea
                        id="clinical-notes"
                        placeholder="Document physical diagnosis, prescribe formulas, and recommend treatment plans..."
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        className="rounded-lg min-h-[160px] text-xs leading-relaxed"
                        required
                      />
                    </div>
                  </form>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border rounded-xl text-center space-y-2 py-8">
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                      <FileText size={18} />
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">attending doctor notes</h5>
                    <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                      Please wait for the practitioner to document observations and clinical prescriptions. Notes will show in your profile files upon consultation sign-off.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {isDoctor ? (
                  <Button
                    onClick={handleCompleteCall}
                    disabled={completeApptMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-10 gap-1.5 text-xs font-bold shadow-emerald-500/20"
                  >
                    {completeApptMutation.isPending ? (
                      <Loader label="Fulfilling..." />
                    ) : (
                      <>
                        <CheckCircle size={16} /> Fulfill & Sign-off Consultation
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate("/appointments")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 gap-1.5 text-xs font-bold"
                  >
                    Leave Meeting Room
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Telemedicine;

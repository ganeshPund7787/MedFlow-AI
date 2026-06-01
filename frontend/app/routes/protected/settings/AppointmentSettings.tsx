import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { CalendarRange, ShieldAlert, DollarSign, Clock } from "lucide-react";

const AppointmentSettings = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (res: any) => {
      toast.success(res.message || "Appointment settings saved.");
      queryClient.invalidateQueries({ queryKey: ["hospital-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  // Local Form State
  const [slotDuration, setSlotDuration] = useState("30");
  const [consultationFeeDollars, setConsultationFeeDollars] = useState("");

  // Sync state on load
  useEffect(() => {
    if (config) {
      setSlotDuration(String(config.slotDurationMinutes ?? 30));
      // Convert cents to dollars for the UI
      const dollars = (config.consultationFeeInCents ?? 7500) / 100;
      setConsultationFeeDollars(String(dollars));
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading Appointment Rules..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load appointment configurations.</p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const feeInCents = Math.round(Number(consultationFeeDollars) * 100);

    if (isNaN(feeInCents) || feeInCents < 0) {
      toast.error("Please enter a valid consultation fee.");
      return;
    }

    updateMutation.mutate({
      slotDurationMinutes: Number(slotDuration),
      consultationFeeInCents: feeInCents,
    });
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <CalendarRange size={20} className="text-blue-600 animate-pulse" />
          Appointment Rules & Fees
        </CardTitle>
        <CardDescription>
          Configure clinical appointment timeslot durations, scheduling policies, and base booking fees.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="space-y-4 max-w-lg">
          {/* Time Slot Duration */}
          <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="flex items-start gap-3">
              <Clock className="text-blue-600 mt-0.5" size={18} />
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-bold">Default Appointment Timeslot</Label>
                <Select value={slotDuration} onValueChange={setSlotDuration}>
                  <SelectTrigger className="rounded-lg text-xs h-9 max-w-[200px]">
                    <SelectValue placeholder="Select slot duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15" className="text-xs">15 Minutes</SelectItem>
                    <SelectItem value="30" className="text-xs">30 Minutes</SelectItem>
                    <SelectItem value="45" className="text-xs">45 Minutes</SelectItem>
                    <SelectItem value="60" className="text-xs">60 Minutes</SelectItem>
                    <SelectItem value="90" className="text-xs">90 Minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400">
                  Defines the standard block allocated for clinical appointments in doctors' calendars.
                </p>
              </div>
            </div>
          </div>

          {/* Consultation Fee */}
          <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="flex items-start gap-3">
              <DollarSign className="text-emerald-600 mt-0.5" size={18} />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="fee" className="text-xs font-bold">Standard Consultation Fee ($ USD)</Label>
                <div className="flex items-center gap-1.5 max-w-[200px]">
                  <span className="text-xs font-bold text-slate-500">$</span>
                  <Input
                    id="fee"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="75.00"
                    value={consultationFeeDollars}
                    onChange={(e) => setConsultationFeeDollars(e.target.value)}
                    className="rounded-lg h-9 text-xs"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Global baseline consultation fee automatically added to new appointments prior to insurance deductions.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs font-bold shadow-blue-500/10"
          >
            {updateMutation.isPending ? <Loader label="Saving..." /> : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentSettings;

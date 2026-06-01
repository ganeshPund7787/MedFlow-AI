import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { FlaskConical, ShieldAlert, Sparkles, Hourglass } from "lucide-react";

const LabSettings = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (res: any) => {
      toast.success(res.message || "Laboratory settings saved.");
      queryClient.invalidateQueries({ queryKey: ["hospital-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  // Local Form State
  const [labTurnaroundHours, setLabTurnaroundHours] = useState(24);
  const [enableAiXrayReview, setEnableAiXrayReview] = useState(true);

  // Sync state on load
  useEffect(() => {
    if (config) {
      setLabTurnaroundHours(config.labTurnaroundHours ?? 24);
      setEnableAiXrayReview(config.enableAiXrayReview ?? true);
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading Laboratory Settings..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load laboratory configurations.</p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (labTurnaroundHours <= 0) {
      toast.error("Turnaround target must be a positive integer.");
      return;
    }

    updateMutation.mutate({
      labTurnaroundHours: Number(labTurnaroundHours),
      enableAiXrayReview,
    });
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <FlaskConical size={20} className="text-blue-600 animate-pulse" />
          Laboratory Parameters
        </CardTitle>
        <CardDescription>
          Configure default laboratory diagnostic times, AI model X-ray analysis features, and report deadlines.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="space-y-4 max-w-lg">
          {/* Lab Turnaround Target */}
          <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="flex items-start gap-3">
              <Hourglass className="text-blue-600 mt-0.5" size={18} />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="turnaround" className="text-xs font-bold">Standard Lab Report Turnaround (Hours)</Label>
                <div className="flex items-center gap-2 max-w-[200px]">
                  <Input
                    id="turnaround"
                    type="number"
                    min="1"
                    placeholder="24"
                    value={labTurnaroundHours}
                    onChange={(e) => setLabTurnaroundHours(Number(e.target.value))}
                    className="rounded-lg h-9 text-xs"
                    required
                  />
                  <span className="text-xs font-bold text-slate-500">hours</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Target threshold hours to automatically trigger alert highlights in test tables if reports are delayed.
                </p>
              </div>
            </div>
          </div>

          {/* AI Vision Review */}
          <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="flex items-start gap-3">
              <Sparkles className="text-violet-500 mt-0.5" size={18} />
              <div className="flex-1 space-y-1">
                <Label htmlFor="ai-xray" className="text-xs font-bold block mb-1">
                  Computer Vision Diagnostics
                </Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ai-xray"
                    checked={enableAiXrayReview}
                    onCheckedChange={(checked) => setEnableAiXrayReview(!!checked)}
                  />
                  <label
                    htmlFor="ai-xray"
                    className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600 dark:text-slate-300"
                  >
                    Auto-trigger Gemini AI Vision X-Ray reviews
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  When enabled, all newly uploaded radiology, CT scans, and pathology images will automatically be pre-screened by the Gemini vision model.
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

export default LabSettings;

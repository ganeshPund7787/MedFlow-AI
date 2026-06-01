import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { Pill, ShieldAlert, AlertTriangle } from "lucide-react";

const PharmacySettings = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (res: any) => {
      toast.success(res.message || "Pharmacy settings saved.");
      queryClient.invalidateQueries({ queryKey: ["hospital-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  // Local Form State
  const [medicationLowStockThreshold, setMedicationLowStockThreshold] = useState(15);

  // Sync state on load
  useEffect(() => {
    if (config) {
      setMedicationLowStockThreshold(config.medicationLowStockThreshold ?? 15);
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading Pharmacy Settings..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load pharmacy configurations.</p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (medicationLowStockThreshold < 0) {
      toast.error("Threshold target must be a non-negative integer.");
      return;
    }

    updateMutation.mutate({
      medicationLowStockThreshold: Number(medicationLowStockThreshold),
    });
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <Pill size={20} className="text-blue-600 animate-bounce-slow" />
          Pharmacy Thresholds
        </CardTitle>
        <CardDescription>
          Configure default pharmacy stock level metrics, low stock alarms, and automatically triggered notifications.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="space-y-4 max-w-lg">
          {/* Low Stock Threshold */}
          <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-500 mt-0.5" size={18} />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="stock-threshold" className="text-xs font-bold">Automatic Low Stock Alert Threshold</Label>
                <div className="flex items-center gap-2 max-w-[200px]">
                  <Input
                    id="stock-threshold"
                    type="number"
                    min="0"
                    placeholder="15"
                    value={medicationLowStockThreshold}
                    onChange={(e) => setMedicationLowStockThreshold(Number(e.target.value))}
                    className="rounded-lg h-9 text-xs"
                    required
                  />
                  <span className="text-xs font-bold text-slate-500">units</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  When a medication stock falls below this quantity, it triggers alert indicators in the pharmacy dashboard and emails stock managers.
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

export default PharmacySettings;

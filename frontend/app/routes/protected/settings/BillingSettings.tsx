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
import { Receipt, ShieldAlert, BadgePercent, Coins } from "lucide-react";

const BillingSettings = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (res: any) => {
      toast.success(res.message || "Billing settings saved.");
      queryClient.invalidateQueries({ queryKey: ["hospital-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  // Local Form State
  const [taxRatePercentage, setTaxRatePercentage] = useState(5);
  const [enableLiveGateways, setEnableLiveGateways] = useState(false);

  // Sync state on load
  useEffect(() => {
    if (config) {
      setTaxRatePercentage(config.taxRatePercentage ?? 5);
      setEnableLiveGateways(config.enableLiveGateways ?? false);
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading Billing Settings..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load billing configurations.</p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taxRatePercentage < 0 || taxRatePercentage > 100) {
      toast.error("Tax rate must be between 0% and 100%.");
      return;
    }

    updateMutation.mutate({
      taxRatePercentage: Number(taxRatePercentage),
      enableLiveGateways,
    });
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <Receipt size={20} className="text-blue-600 animate-pulse" />
          Billing & Invoice Settings
        </CardTitle>
        <CardDescription>
          Configure the global tax rates, default invoice headers, and billing gateway live modes.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="space-y-4 max-w-lg">
          <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="flex items-start gap-3">
              <BadgePercent className="text-blue-600 mt-0.5" size={18} />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="tax-rate" className="text-xs font-bold">Standard Value-Added Tax (VAT) %</Label>
                <div className="flex items-center gap-2 max-w-[200px]">
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="5"
                    value={taxRatePercentage}
                    onChange={(e) => setTaxRatePercentage(Number(e.target.value))}
                    className="rounded-lg h-9 text-xs"
                    required
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Global sales tax percentage applied dynamically to all new invoices and patient checkout bills.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="flex items-start gap-3">
              <Coins className="text-amber-500 mt-0.5" size={18} />
              <div className="flex-1 space-y-1">
                <Label htmlFor="enable-gateways" className="text-xs font-bold block mb-1">
                  Live Payment Processing Gateways
                </Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enable-gateways"
                    checked={enableLiveGateways}
                    onCheckedChange={(checked) => setEnableLiveGateways(!!checked)}
                  />
                  <label
                    htmlFor="enable-gateways"
                    className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600 dark:text-slate-300"
                  >
                    Enable Polar Live API payments
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  If disabled, payments run in mock mode and instantly approve bills. If enabled, actual secure transactions via Polar will process.
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

export default BillingSettings;

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { Link as LinkIcon, ShieldAlert, Key, Globe, Webhook } from "lucide-react";

const Integrations = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (res: any) => {
      toast.success(res.message || "Integration settings saved.");
      queryClient.invalidateQueries({ queryKey: ["hospital-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  // Local Form State
  const [polarApiKey, setPolarApiKey] = useState("");
  const [polarWebhookSecret, setPolarWebhookSecret] = useState("");
  const [polarProductId, setPolarProductId] = useState("");

  // Sync state on load
  useEffect(() => {
    if (config) {
      setPolarApiKey(config.polarApiKey || "");
      setPolarWebhookSecret(config.polarWebhookSecret || "");
      setPolarProductId(config.polarProductId || "");
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading Integration Settings..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load integration configurations.</p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      polarApiKey,
      polarWebhookSecret,
      polarProductId,
    });
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <LinkIcon size={20} className="text-blue-600 animate-pulse" />
          Hospital Integrations
        </CardTitle>
        <CardDescription>
          Link external billing platforms, Webhook receivers, and payment processor credentials.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="space-y-4 max-w-lg">
          {/* Polar API Key */}
          <div className="space-y-1.5 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Key className="text-blue-600" size={16} />
              <Label htmlFor="polar-key" className="text-xs font-bold">Polar Payment API Access Token</Label>
            </div>
            <Input
              id="polar-key"
              type="password"
              placeholder="polar_sh_..."
              value={polarApiKey}
              onChange={(e) => setPolarApiKey(e.target.value)}
              className="rounded-lg h-9 text-xs"
            />
            <p className="text-[10px] text-slate-400">
              The secret Bearer token to authorize all invoice creations, checkout links, and subscriptions on Polar.sh.
            </p>
          </div>

          {/* Polar Product ID */}
          <div className="space-y-1.5 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="text-emerald-600" size={16} />
              <Label htmlFor="polar-product" className="text-xs font-bold">Polar Baseline Consulting Product ID</Label>
            </div>
            <Input
              id="polar-product"
              placeholder="00000000-0000-0000-0000-000000000000"
              value={polarProductId}
              onChange={(e) => setPolarProductId(e.target.value)}
              className="rounded-lg h-9 text-xs"
            />
            <p className="text-[10px] text-slate-400">
              Unique product key mapped to standard consultation bookings on the Polar platform.
            </p>
          </div>

          {/* Webhook Endpoint Secret */}
          <div className="space-y-1.5 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Webhook className="text-amber-500" size={16} />
              <Label htmlFor="polar-secret" className="text-xs font-bold">Polar Webhook Verification Key</Label>
            </div>
            <Input
              id="polar-secret"
              type="password"
              placeholder="whsec_..."
              value={polarWebhookSecret}
              onChange={(e) => setPolarWebhookSecret(e.target.value)}
              className="rounded-lg h-9 text-xs"
            />
            <p className="text-[10px] text-slate-400">
              Secures callback triggers when patients complete checkouts outside the local application bounds.
            </p>
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

export default Integrations;

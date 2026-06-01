import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { Bell, ShieldAlert } from "lucide-react";

const NotificationSettings = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (res: any) => {
      toast.success(res.message || "Notification preferences saved.");
      queryClient.invalidateQueries({ queryKey: ["hospital-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  // Local Form State
  const [enableEmailAlerts, setEnableEmailAlerts] = useState("true");
  const [enablePushNotifications, setEnablePushNotifications] = useState("true");

  // Sync state on load
  useEffect(() => {
    if (config) {
      setEnableEmailAlerts((config.enableEmailAlerts ?? true).toString());
      setEnablePushNotifications((config.enablePushNotifications ?? true).toString());
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading Preferences..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load notification settings.</p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      enableEmailAlerts: enableEmailAlerts === "true",
      enablePushNotifications: enablePushNotifications === "true",
    });
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <Bell size={20} className="text-blue-600 animate-swing" />
          Notification Toggles
        </CardTitle>
        <CardDescription>
          Toggle email alert triggers and system-wide WebPush alerts.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Email Alerts Channel</Label>
            <Select value={enableEmailAlerts} onValueChange={setEnableEmailAlerts}>
              <SelectTrigger className="rounded-lg text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true" className="text-xs">Enabled (Dispatch alerts on admission/billing)</SelectItem>
                <SelectItem value="false" className="text-xs text-slate-400">Disabled (Suppress clinical email releases)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">WebPush Alerts Channel</Label>
            <Select value={enablePushNotifications} onValueChange={setEnablePushNotifications}>
              <SelectTrigger className="rounded-lg text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true" className="text-xs">Enabled (Push Socket.IO instant notifications)</SelectItem>
                <SelectItem value="false" className="text-xs text-slate-400">Disabled (Mute visual desktop prompts)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs font-bold shadow-blue-500/10"
          >
            {updateMutation.isPending ? <Loader label="Saving..." /> : "Save Preferences"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NotificationSettings;

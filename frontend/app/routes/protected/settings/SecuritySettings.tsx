import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { Shield, ShieldAlert, KeyRound } from "lucide-react";

const SecuritySettings = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (res: any) => {
      toast.success(res.message || "Security protocols saved.");
      queryClient.invalidateQueries({ queryKey: ["hospital-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  // Local Form State
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState("");
  const [passwordMinLength, setPasswordMinLength] = useState("");
  const [requireTwoFactor, setRequireTwoFactor] = useState("false");

  // Sync state on load
  useEffect(() => {
    if (config) {
      setSessionTimeoutMinutes((config.sessionTimeoutMinutes || 30).toString());
      setPasswordMinLength((config.passwordMinLength || 8).toString());
      setRequireTwoFactor((config.requireTwoFactor || false).toString());
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading Security Protocols..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load security protocols.</p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTimeoutMinutes || !passwordMinLength) {
      toast.error("Please fill out all required fields.");
      return;
    }

    updateMutation.mutate({
      sessionTimeoutMinutes: Number(sessionTimeoutMinutes),
      passwordMinLength: Number(passwordMinLength),
      requireTwoFactor: requireTwoFactor === "true",
    });
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <Shield size={20} className="text-blue-600" />
          Security Protocols Settings
        </CardTitle>
        <CardDescription>
          Maintain system defense parameters, configure active login session thresholds, and regulate strength verification keys.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-timeout" className="text-xs font-bold">Session Idle Timeout (Minutes) *</Label>
            <Input
              id="s-timeout"
              type="number"
              min="5"
              max="1440"
              placeholder="30"
              value={sessionTimeoutMinutes}
              onChange={(e) => setSessionTimeoutMinutes(e.target.value)}
              className="rounded-lg h-9 text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-passlen" className="text-xs font-bold">Minimum Password Key Length *</Label>
            <Input
              id="s-passlen"
              type="number"
              min="6"
              max="32"
              placeholder="8"
              value={passwordMinLength}
              onChange={(e) => setPasswordMinLength(e.target.value)}
              className="rounded-lg h-9 text-xs"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Require Two-Factor Authentication (MFA)</Label>
          <Select value={requireTwoFactor} onValueChange={setRequireTwoFactor}>
            <SelectTrigger className="rounded-lg text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false" className="text-xs">Optional (Standard account authorization)</SelectItem>
              <SelectItem value="true" className="text-xs text-blue-600 font-semibold">Strict (Enforce MFA verification on login)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/35 border border-dashed rounded-xl flex items-start gap-3 mt-4">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
            <KeyRound size={16} />
          </div>
          <div className="text-left space-y-0.5">
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Anti-Gravity Integrity Guard</h5>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Clinical settings are verified across a transaction-guarded Express server layer. Unused session keys are automatically terminated upon idle expiration to prevent data exposure.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs font-bold shadow-blue-500/10"
          >
            {updateMutation.isPending ? <Loader label="Saving..." /> : "Save Security Policy"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SecuritySettings;

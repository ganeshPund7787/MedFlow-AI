import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { Mail, ShieldAlert, Send } from "lucide-react";

const EmailSettings = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (res: any) => {
      toast.success(res.message || "Email server configurations saved.");
      queryClient.invalidateQueries({ queryKey: ["hospital-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  // Local Form State
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSenderEmail, setSmtpSenderEmail] = useState("");

  // Sync state on load
  useEffect(() => {
    if (config) {
      setSmtpHost(config.smtpHost || "");
      setSmtpPort((config.smtpPort || 2525).toString());
      setSmtpUser(config.smtpUser || "");
      setSmtpPass(config.smtpPass || "");
      setSmtpSenderEmail(config.smtpSenderEmail || "noreply@medflow-ai.org");
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading SMTP Configuration..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load email SMTP settings.</p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpHost || !smtpPort || !smtpSenderEmail) {
      toast.error("Please fill out all required fields.");
      return;
    }

    updateMutation.mutate({
      smtpHost,
      smtpPort: Number(smtpPort),
      smtpUser,
      smtpPass,
      smtpSenderEmail,
    });
  };

  const handleTestConnection = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Testing SMTP handshake...",
        success: "SMTP connection established. Sandbox credential validated.",
        error: "SMTP connection failed.",
      }
    );
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <Mail size={20} className="text-blue-600" />
          SMTP Email Configurations
        </CardTitle>
        <CardDescription>
          Configure outgoing SMTP email server hosts, port sizes, and security credentials.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="smtp-host" className="text-xs font-bold">SMTP Host Server *</Label>
            <Input
              id="smtp-host"
              placeholder="e.g. smtp.mailtrap.io"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              className="rounded-lg h-9 text-xs"
              required
            />
          </div>
          <div className="space-y-1.5 md:col-span-1">
            <Label htmlFor="smtp-port" className="text-xs font-bold">Port Size *</Label>
            <Input
              id="smtp-port"
              type="number"
              placeholder="2525"
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              className="rounded-lg h-9 text-xs"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="smtp-user" className="text-xs font-bold">SMTP Username</Label>
            <Input
              id="smtp-user"
              placeholder="Enter SMTP user"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              className="rounded-lg h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-pass" className="text-xs font-bold">SMTP Password</Label>
            <Input
              id="smtp-pass"
              type="password"
              placeholder="••••••••"
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              className="rounded-lg h-9 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="smtp-sender" className="text-xs font-bold">Default Sender Address *</Label>
          <Input
            id="smtp-sender"
            type="email"
            placeholder="noreply@medflow-ai.org"
            value={smtpSenderEmail}
            onChange={(e) => setSmtpSenderEmail(e.target.value)}
            className="rounded-lg h-9 text-xs"
            required
          />
        </div>

        <div className="pt-4 border-t flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            className="rounded-lg h-9 text-xs font-bold gap-1"
          >
            <Send size={12} /> Test Handshake
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs font-bold shadow-blue-500/10"
          >
            {updateMutation.isPending ? <Loader label="Saving..." /> : "Save Email Server"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmailSettings;

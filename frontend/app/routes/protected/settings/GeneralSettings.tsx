import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { Settings, ShieldAlert } from "lucide-react";

const GeneralSettings = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (res: any) => {
      toast.success(res.message || "General settings saved.");
      queryClient.invalidateQueries({ queryKey: ["hospital-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  // Local Form State
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [hospitalContact, setHospitalContact] = useState("");
  const [hospitalEmail, setHospitalEmail] = useState("");
  const [operationalHours, setOperationalHours] = useState("");
  const [departments, setDepartments] = useState("");

  // Sync state on load
  useEffect(() => {
    if (config) {
      setHospitalName(config.hospitalName || "");
      setHospitalAddress(config.hospitalAddress || "");
      setHospitalContact(config.hospitalContact || "");
      setHospitalEmail(config.hospitalEmail || "");
      setOperationalHours(config.operationalHours || "");
      setDepartments(config.departments?.join(", ") || "");
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading General Settings..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load general configurations.</p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalName || !hospitalAddress || !hospitalContact || !hospitalEmail) {
      toast.error("Please fill out all required fields.");
      return;
    }

    const deptArray = departments
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    updateMutation.mutate({
      hospitalName,
      hospitalAddress,
      hospitalContact,
      hospitalEmail,
      operationalHours,
      departments: deptArray,
    });
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <Settings size={20} className="text-blue-600 animate-spin-slow" />
          General Settings
        </CardTitle>
        <CardDescription>
          Customize global hospital details, locations, contact info, and department configurations.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="h-name" className="text-xs font-bold">Hospital Name *</Label>
            <Input
              id="h-name"
              placeholder="MedFlow AI General Hospital"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="rounded-lg h-9 text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-email" className="text-xs font-bold">Primary Hospital Email *</Label>
            <Input
              id="h-email"
              type="email"
              placeholder="contact@medflow-ai.org"
              value={hospitalEmail}
              onChange={(e) => setHospitalEmail(e.target.value)}
              className="rounded-lg h-9 text-xs"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="h-address" className="text-xs font-bold">Physical Address *</Label>
          <Input
            id="h-address"
            placeholder="77 Quantum Heights, Suite 101, Metro City"
            value={hospitalAddress}
            onChange={(e) => setHospitalAddress(e.target.value)}
            className="rounded-lg h-9 text-xs"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="h-contact" className="text-xs font-bold">Contact Number *</Label>
            <Input
              id="h-contact"
              placeholder="+1 (555) 019-9000"
              value={hospitalContact}
              onChange={(e) => setHospitalContact(e.target.value)}
              className="rounded-lg h-9 text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-hours" className="text-xs font-bold">Operational Hours</Label>
            <Input
              id="h-hours"
              placeholder="24/7 emergency operations"
              value={operationalHours}
              onChange={(e) => setOperationalHours(e.target.value)}
              className="rounded-lg h-9 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="h-depts" className="text-xs font-bold">
            Hospital Departments (Comma separated)
          </Label>
          <Textarea
            id="h-depts"
            placeholder="Emergency, Radiology, Pediatrics, Cardiology, Pharmacy"
            value={departments}
            onChange={(e) => setDepartments(e.target.value)}
            className="rounded-lg min-h-[60px] text-xs leading-relaxed"
          />
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

export default GeneralSettings;

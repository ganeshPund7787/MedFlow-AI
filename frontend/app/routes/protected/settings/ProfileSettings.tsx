import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { updateUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { User, ShieldAlert, BadgeInfo } from "lucide-react";
import { LogoutButton } from "@/components/auth/Logout";

const ProfileSettings = () => {
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // Local Form State
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [department, setDepartment] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [bloodgroup, setBloodgroup] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");

  useEffect(() => {
    if (session?.user) {
      const u = session.user as any;
      setName(u.name || "");
      setSpecialization(u.specialization || "");
      setDepartment(u.department || "");
      setAge(u.age ? String(u.age) : "");
      setGender(u.gender || "");
      setBloodgroup(u.bloodgroup || "");
      setMedicalHistory(u.medicalHistory || "");
    }
  }, [session]);

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (res: any) => {
      toast.success(res.message || "Profile updated successfully.");
      // Soft reload the auth session to populate modified fields
      authClient.useSession();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update profile.");
    },
  });

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Retrieving Session Profile..." />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">User session profile is not active.</p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your display name.");
      return;
    }

    const payload: Record<string, any> = { name };
    if (specialization) payload.specialization = specialization;
    if (department) payload.department = department;
    if (age) payload.age = age;
    if (gender) payload.gender = gender;
    if (bloodgroup) payload.bloodgroup = bloodgroup;
    if (medicalHistory) payload.medicalHistory = medicalHistory;

    updateMutation.mutate({
      userId: session.user.id,
      userData: payload,
    });
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <User size={20} className="text-blue-600 animate-pulse" />
          Personal Profile Settings
        </CardTitle>
        <CardDescription>
          Customize your clinical credentials, specialties, avatar representations, and contact labels.
        </CardDescription>
      </CardHeader>

      {/* Avatar Showcase */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
        <Avatar className="h-14 w-14 border border-blue-100 shadow-sm">
          <AvatarImage src={session.user.image || ""} />
          <AvatarFallback className="font-bold text-base bg-blue-100 text-blue-700">
            {session.user.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">{session.user.name}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            {session.user.role || "staff"} • {session.user.email}
          </p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="prof-name" className="text-xs font-bold">Display Name *</Label>
            <Input
              id="prof-name"
              placeholder="Dr. Jordan Chase"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg h-9 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-spec" className="text-xs font-bold">Clinical Specialty</Label>
            <Input
              id="prof-spec"
              placeholder="Cardiology / Nurse practitioner"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="rounded-lg h-9 text-xs"
              disabled={session.user.role === "patient"}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="prof-dept" className="text-xs font-bold">Clinical Department</Label>
            <Input
              id="prof-dept"
              placeholder="Cardiovascular / Emergency Room"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-lg h-9 text-xs"
              disabled={session.user.role === "patient"}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="prof-age" className="text-xs font-bold">Age</Label>
              <Input
                id="prof-age"
                type="number"
                placeholder="35"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="rounded-lg h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-gen" className="text-xs font-bold">Gender</Label>
              <Input
                id="prof-gen"
                placeholder="Male / Female"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="rounded-lg h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-blood" className="text-xs font-bold">Blood Group</Label>
              <Input
                id="prof-blood"
                placeholder="O+"
                value={bloodgroup}
                onChange={(e) => setBloodgroup(e.target.value)}
                className="rounded-lg h-9 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prof-history" className="text-xs font-bold">Medical History / Additional Credentials Summary</Label>
          <Textarea
            id="prof-history"
            placeholder="Board certified surgeon with 10+ years of active emergency hospital practice."
            value={medicalHistory}
            onChange={(e) => setMedicalHistory(e.target.value)}
            className="rounded-lg min-h-[80px] text-xs leading-relaxed"
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
      
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold text-red-500 dark:text-red-400">Danger Zone</h3>
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Terminate Active Session</h4>
            <p className="text-xs text-muted-foreground">Sign out of MedFlow AI on this device. Your cache and session registers will be safely cleared.</p>
          </div>
          <LogoutButton
            variant="destructive"
            confirmRequired={true}
            label="Log out securely"
            className="text-xs font-bold w-full md:w-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;

import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { getUserById } from "@/lib/api";
import PatientBillingPanel from "@/components/billing/PatientBillingPanel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, CreditCard } from "lucide-react";
import { STATUS_CONFIG } from "@/components/users/statusBadge";
import Loader from "@/components/global/Loader";
import { LogoutButton } from "@/components/auth/Logout";

export function meta() {
  return [{ title: "User Profile" }];
}

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const loggedInUser = session?.user;

  const targetUserId = id || loggedInUser?.id;
  const isViewingOwnProfile = loggedInUser?.id === targetUserId;
  const isAdmin = loggedInUser?.role === "admin";
  const canPay =
    loggedInUser?.role === "patient" && isViewingOwnProfile;

  const { data: profileUser, isLoading: profileLoading } = useQuery({
    queryKey: ["user", targetUserId],
    queryFn: () => getUserById(targetUserId!),
    enabled: !!targetUserId,
  });

  const isPatient = profileUser?.role === "patient";

  if (sessionLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader label={"Loading profile..."} />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-red-500 font-bold">
        User not found.
      </div>
    );
  }

  const statusConf =
    STATUS_CONFIG[profileUser.status as any] || STATUS_CONFIG["active"];

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-6 pb-20">
      <h1 className="text-3xl font-bold tracking-tight">
        {isViewingOwnProfile ? "My Profile" : `${profileUser.name}'s Profile`}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* --- LEFT COLUMN: IDENTITY --- */}
        <Card className="col-span-1 card shadow-sm h-min">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
              <AvatarImage src={profileUser.image} />
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-700">
                {profileUser.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{profileUser.name}</h2>
            <p className="text-sm text-slate-500 mb-4">{profileUser.email}</p>
            <div className="flex flex-col justify-center items-center gap-2">
              <div className="flex gap-2">
              <Badge variant="secondary" className="capitalize">
                {profileUser.role}
              </Badge>
              <Badge variant="outline" className={statusConf.color}>
                {statusConf.label}
              </Badge>
              </div>
              <LogoutButton
                              variant="ghost"
                              size="icon"
                              confirmRequired={true}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer size-9 rounded-lg"
                              label="Log out"
                              showIcon={true}
                            />
            </div>
          </CardContent>
        </Card>
        {/* --- RIGHT COLUMN: DETAILS & BILLING --- */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          {/* Details Section */}
          <Card className="card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                {isPatient ? "Medical Context" : "Professional Info"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-4 text-sm">
              {isPatient ? (
                <>
                  <DetailItem label="Age" value={profileUser.age} />
                  <DetailItem
                    label="Blood Group"
                    value={profileUser.bloodgroup}
                  />
                  <div className="col-span-2">
                    <DetailItem
                      label="Medical History"
                      value={profileUser.medicalHistory || "Clean record"}
                    />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem
                    label="Department"
                    value={profileUser.department}
                  />
                  <DetailItem
                    label="Specialization"
                    value={profileUser.specialization}
                  />
                </>
              )}
            </CardContent>
          </Card>
          {isPatient && (isViewingOwnProfile || isAdmin) && (
            <div className="space-y-4">
              {canPay && (
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link to="/my-billing">
                    <CreditCard className="h-4 w-4" />
                    Open full billing & payment page
                  </Link>
                </Button>
              )}
              <PatientBillingPanel
                patientId={targetUserId!}
                canPay={canPay}
                patientStatus={profileUser.status}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function DetailItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">
        {label}
      </span>
      <p className="font-semibold text-slate-800 dark:text-slate-200">
        {value || "N/A"}
      </p>
    </div>
  );
}

export default Profile;

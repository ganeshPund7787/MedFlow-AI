import { Navigate } from "react-router";
import { authClient } from "@/lib/auth-client";
import PatientBillingPanel from "@/components/billing/PatientBillingPanel";
import Loader from "@/components/global/Loader";
import { CreditCard } from "lucide-react";

export function meta() {
  return [{ title: "My Billing | MedFlow AI" }];
}

export default function MyBilling() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  if (isPending) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader label="Loading billing..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "patient") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div>
        <div className="flex items-center gap-2 text-blue-600 mb-1">
          <CreditCard className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Patient Portal
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          My Billing
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          View your hospital charges and pay your bill securely online.
        </p>
      </div>

      <PatientBillingPanel
        patientId={user.id}
        canPay
        patientStatus={(user as { status?: string }).status}
      />
    </div>
  );
}

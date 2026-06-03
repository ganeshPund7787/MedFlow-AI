import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/lib/api";
import Loader from "@/components/global/Loader";
import { useNavigate } from "react-router";
import type { Role } from "@/types";
import QuickActions from "@/components/dashboard/QuickActions";
import StatsCards from "@/components/global/StatsCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import ActiveAssignmentsBoard from "@/components/dashboard/ActiveAssignmentsBoard";
import { authClient } from "@/lib/auth-client";
import { getPostLoginPath } from "@/lib/auth-redirect";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function meta() {
  return [{ title: "Dashboard" }];
}

export default function HMSDashboard() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const user = session?.user;

  useEffect(() => {
    if (user?.role === "patient" && user.id) {
      navigate(getPostLoginPath("patient", user.id), { replace: true });
    }
  }, [user?.role, user?.id, navigate]);

  const { data: userData, isLoading: isDataLoading, isError } = useQuery({
    queryKey: ["patients"],
    queryFn: () => getUsers({ role: "patient", limit: 100 }),
    enabled: !!session && user?.role !== "patient",
  });

  if (user?.role === "patient") {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader label="Redirecting..." />
      </div>
    );
  }

  if (isDataLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader label="Preparing Dashboard..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-red-500 font-medium">
        Failed to load dashboard data. Please refresh the page.
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            MedFlow Dashboard
          </h1>
          <p className="text-slate-500 font-medium">
            Welcome back, {user?.name}. Here's what's happening today.
          </p>
        </div>
        <QuickActions role={user?.role as Role} />
      </div>

      <StatsCards data={userData?.res || []} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {isAdmin && (
            <section className="card p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold mb-6">Revenue Overview</h3>
              <RevenueChart />
              <div className="mt-4 flex justify-end">
                <Button asChild variant="outline">
                  <Link to="/ai-insights">Open AI Insights</Link>
                </Button>
              </div>
            </section>
          )}
        </div>
        {isAdmin && (
          <div className="lg:col-span-4 space-y-8">
            <section className="card p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
              <RecentActivity />
            </section>
          </div>
        )}
      </div>
      <section className="card p-6 rounded-xl shadow-sm">
        <ActiveAssignmentsBoard />
      </section>
    </div>
  );
}

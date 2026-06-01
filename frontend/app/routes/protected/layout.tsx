import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/types";
import Loader from "@/components/global/Loader";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { useEffect } from "react";
import { toast } from "sonner";
import { canAccessPath } from "@/lib/navigation-access";
import Header from "@/components/navigation/Header";
import { getRoleFallbackPath } from "@/lib/auth-redirect";
import SafeSuspense from "@/components/global/SafeSuspense";

const Layout = () => {
  const { data: session, isPending } = authClient.useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  
  // Defensive extraction
  const userRole = (session?.user?.role as Role) || "patient";
  const userId = session?.user?.id;

  useEffect(() => {
    if (isPending || !session) return;

    try {
      if (!canAccessPath(pathname, userRole)) {
        const fallback = getRoleFallbackPath(userRole, userId || "");
        if (pathname !== fallback) {
          toast.error("Unauthorized Access Sector");
          navigate(fallback, { replace: true });
        }
      }
    } catch (e) {
      console.error("[Navigation Fault]:", e);
    }
  }, [pathname, userRole, userId, isPending, navigate, session]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader label="Synchronizing Systems..." />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <SafeSuspense errorName="Sidebar">
        <AppSidebar />
      </SafeSuspense>
      <SidebarInset className="bg-background/95 backdrop-blur-sm">
        <SafeSuspense errorName="Header">
          <Header />
        </SafeSuspense>
        <main className="px-4 my-4 flex-1">
          <SafeSuspense errorName="Main Content">
            <Outlet />
          </SafeSuspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;

import { Outlet, Link, useLocation } from "react-router";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Settings,
  Pill,
  FlaskConical,
  Calendar,
  Users,
  Shield,
  Bell,
  Mail,
  Receipt,
  Sliders,
  History,
  Database,
  Link as LinkIcon,
  Sparkles,
  User,
  LayoutGrid,
} from "lucide-react";
import Loader from "@/components/global/Loader";

interface SettingsTab {
  title: string;
  url: string;
  icon: any;
  isAdminOnly: boolean;
}

const SettingsLayout = () => {
  const { data: session, isPending } = authClient.useSession();
  const { pathname } = useLocation();

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading settings environment..." />
      </div>
    );
  }

  const userRole = session?.user?.role || "patient";
  const isAdmin = userRole === "admin";

  // Grouped Settings Tabs
  const groups = [
    {
      label: "Hospital & General",
      tabs: [
        { title: "General Settings", url: "/settings/general", icon: Settings, isAdminOnly: true },
        { title: "Appointment Rules", url: "/settings/appointments", icon: Calendar, isAdminOnly: true },
        { title: "Laboratory Parameters", url: "/settings/lab", icon: FlaskConical, isAdminOnly: true },
        { title: "Pharmacy Thresholds", url: "/settings/pharmacy", icon: Pill, isAdminOnly: true },
      ],
    },
    {
      label: "Access & Security",
      tabs: [
        { title: "User & Role Directory", url: "/settings/roles", icon: Users, isAdminOnly: true },
        { title: "Security Protocols", url: "/settings/security", icon: Shield, isAdminOnly: true },
        { title: "Personal Profile", url: "/settings/profile", icon: User, isAdminOnly: false },
      ],
    },
    {
      label: "Channels & System",
      tabs: [
        { title: "SMTP Email Settings", url: "/settings/email", icon: Mail, isAdminOnly: true },
        { title: "Notification Toggles", url: "/settings/notifications", icon: Bell, isAdminOnly: true },
        { title: "System Preferences", url: "/settings/system", icon: Sliders, isAdminOnly: false },
      ],
    },
    {
      label: "Ledgers & API Keys",
      tabs: [
        { title: "Billing & Invoices", url: "/settings/billing", icon: Receipt, isAdminOnly: true },
        { title: "AI Model Config", url: "/settings/ai", icon: Sparkles, isAdminOnly: true },
        { title: "Hospital Integrations", url: "/settings/integrations", icon: LinkIcon, isAdminOnly: true },
      ],
    },
    {
      label: "Systems Management",
      tabs: [
        { title: "Database Backups", url: "/settings/backup", icon: Database, isAdminOnly: true },
        { title: "Audit Logs Ledger", url: "/settings/audit-logs", icon: History, isAdminOnly: true },
      ],
    },
  ];

  // Filter visible tabs based on roles
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      tabs: g.tabs.filter((t) => !t.isAdminOnly || isAdmin),
    }))
    .filter((g) => g.tabs.length > 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          System Control Center
        </h1>
        <p className="text-slate-500 font-medium">
          Modify clinical thresholds, configure secure SMTP servers, simulate databanks backups, and customize interface details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Settings Sub-Sidebar Navigation */}
        <Card className="lg:col-span-1 shadow-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
          <CardContent className="p-4 space-y-6 max-h-[75vh] overflow-y-auto pr-2">
            {filteredGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2">
                <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-2">
                  {group.label}
                </h5>
                <nav className="flex flex-col space-y-1">
                  {group.tabs.map((tab) => {
                    const isActive = pathname === tab.url || (tab.url === "/settings/general" && pathname === "/settings");
                    return (
                      <Link
                        key={tab.title}
                        to={tab.url}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          isActive
                            ? "bg-blue-600 text-white shadow-xs shadow-blue-500/10"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-950 dark:hover:text-white"
                        }`}
                      >
                        <tab.icon size={14} className={isActive ? "text-white" : "text-slate-400"} />
                        <span className="truncate">{tab.title}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Dynamic Nested View Component Panel */}
        <Card className="lg:col-span-3 shadow-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 min-h-[500px]">
          <Outlet />
        </Card>
      </div>
    </div>
  );
};

export default SettingsLayout;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActivityLogs } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, History, User } from "lucide-react";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import GlobalSearch from "@/components/global/GlobalSearch";

const AuditLogs = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data: logsData, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", page],
    queryFn: () => getActivityLogs({ page, limit: 10 }),
    placeholderData: (previousData) => previousData,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading Audit Logs..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load system activity logs.</p>
      </div>
    );
  }

  const logsList = logsData?.res || [];
  const pagination = logsData?.pagination;

  // Filter logs locally based on search
  const filteredLogs = logsList.filter((log: any) => {
    const term = search.toLowerCase();
    const action = (log.action || "").toLowerCase();
    const details = (log.details || "").toLowerCase();
    const userName = (log.user?.name || "").toLowerCase();
    const userEmail = (log.user?.email || "").toLowerCase();
    return action.includes(term) || details.includes(term) || userName.includes(term) || userEmail.includes(term);
  });

  const getActionBadge = (action: string) => {
    const actLower = action.toLowerCase();
    if (actLower.includes("delete") || actLower.includes("remove") || actLower.includes("ban")) {
      return <Badge variant="destructive">{action}</Badge>;
    }
    if (actLower.includes("create") || actLower.includes("add") || actLower.includes("admit")) {
      return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">{action}</Badge>;
    }
    if (actLower.includes("update") || actLower.includes("modify") || actLower.includes("save")) {
      return <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{action}</Badge>;
    }
    return <Badge variant="outline">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <CardHeader className="p-0">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <History size={20} className="text-blue-600 animate-spin-slow" />
            Audit Logs Ledger
          </CardTitle>
          <CardDescription>
            Trace critical system state events, administrator controls, and clinical modifications in real time.
          </CardDescription>
        </CardHeader>

        <GlobalSearch
          search={search}
          setSearch={setSearch}
          title="Search logs ledger..."
        />
      </div>

      <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-x-auto bg-white dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6 font-bold">Action Event</TableHead>
              <TableHead className="font-bold">Operator</TableHead>
              <TableHead className="font-bold">Detailed Activity Description</TableHead>
              <TableHead className="font-bold text-right pr-6">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-40 text-center text-slate-400 italic"
                >
                  No system events found in ledger.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log: any) => (
                <TableRow
                  key={log._id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <TableCell className="pl-6 py-4">
                    {getActionBadge(log.action || "System Event")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center border border-slate-200">
                        <User size={10} className="text-slate-500" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-slate-850 dark:text-slate-200">
                          {log.user?.name || "System Automated"}
                        </span>
                        {log.user?.email && (
                          <span className="text-[9px] text-slate-400">
                            {log.user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium max-w-sm truncate">
                    {log.details || "No detail logs populated."}
                  </TableCell>
                  <TableCell className="text-right pr-6 text-xs text-slate-400 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <CustomPagination
          loading={isLoading}
          totalPages={pagination?.totalPages || 0}
          currentPage={pagination?.currentPage || 0}
          setPage={setPage}
        />
      </div>
    </div>
  );
};

export default AuditLogs;

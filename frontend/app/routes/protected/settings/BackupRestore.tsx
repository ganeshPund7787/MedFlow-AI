import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBackups, generateBackup, restoreBackup } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, ShieldAlert, CheckCircle2, Play, RefreshCw, HardDrive, Download } from "lucide-react";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";

const BackupRestore = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [backingUp, setBackingUp] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { data: backupData, isLoading, isError } = useQuery({
    queryKey: ["database-backups", page],
    queryFn: () => getBackups({ page, limit: 6 }),
    placeholderData: (previousData) => previousData,
  });

  const generateMutation = useMutation({
    mutationFn: generateBackup,
    onMutate: () => {
      setBackingUp(true);
    },
    onSuccess: (res: any) => {
      toast.success(res.message || "Backup completed successfully.");
      queryClient.invalidateQueries({ queryKey: ["database-backups"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to trigger database dump.");
    },
    onSettled: () => {
      setBackingUp(false);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreBackup,
    onSuccess: (res: any) => {
      toast.success(res.message || "Database state successfully restored.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to restore database state.");
    },
    onSettled: () => {
      setRestoringId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading Backup Archives..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load system backup log archives.</p>
      </div>
    );
  }

  const backupsList = backupData?.res || [];
  const pagination = backupData?.pagination;

  const handleGenerateBackup = () => {
    generateMutation.mutate();
  };

  const handleRestore = (id: string) => {
    setRestoringId(id);
    restoreMutation.mutate(id);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0.00 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <CardHeader className="p-0">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <Database size={20} className="text-blue-600 animate-pulse" />
            Database Backups & Snapshot Recovery
          </CardTitle>
          <CardDescription>
            Generate manual hot-backups of the MongoDB collections, and restore physical states instantly.
          </CardDescription>
        </CardHeader>

        <Button
          onClick={handleGenerateBackup}
          disabled={backingUp}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs font-bold gap-1.5 shadow-blue-500/10"
        >
          {backingUp ? (
            <Loader label="Snapshotting..." />
          ) : (
            <>
              <HardDrive size={14} /> Trigger Snaphot Backup
            </>
          )}
        </Button>
      </div>

      {backingUp && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl flex items-center gap-3.5">
          <RefreshCw className="text-blue-600 animate-spin" size={20} />
          <div className="flex-1 space-y-1">
            <h5 className="text-xs font-bold text-slate-850 dark:text-slate-200">Executing Cold Tarball Dump...</h5>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full animate-progress-mock rounded-full w-[70%]" />
            </div>
            <p className="text-[10px] text-slate-400">Locking collections schemas & compiling index clusters safely.</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-x-auto bg-white dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6 font-bold">Backup File Name</TableHead>
              <TableHead className="font-bold text-center">Uncompressed Size</TableHead>
              <TableHead className="font-bold text-center">Operator Account</TableHead>
              <TableHead className="font-bold text-center">Validation Status</TableHead>
              <TableHead className="font-bold text-center">Creation Date</TableHead>
              <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backupsList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-40 text-center text-slate-400 italic"
                >
                  No database dumps found in the backup catalog.
                </TableCell>
              </TableRow>
            ) : (
              backupsList.map((backup: any) => {
                const isRestoring = restoringId === backup._id;
                return (
                  <TableRow
                    key={backup._id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <TableCell className="pl-6 py-4 font-semibold text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {backup.filename}
                    </TableCell>
                    <TableCell className="text-center text-xs font-semibold text-slate-500 font-mono">
                      {formatSize(backup.sizeBytes)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-500 font-medium">
                      {backup.triggeredByUser?.name || "System Clock"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-50/80 gap-1 text-[10px]">
                        <CheckCircle2 size={10} /> Verified State
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-400">
                      {new Date(backup.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(backup._id)}
                          disabled={!!restoringId}
                          className="h-8 gap-1 rounded-lg text-xs font-bold"
                        >
                          {isRestoring ? (
                            <Loader label="Restoring..." />
                          ) : (
                            <>
                              <Play size={12} className="text-blue-600 fill-blue-600" /> Rollback Recovery
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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

export default BackupRestore;

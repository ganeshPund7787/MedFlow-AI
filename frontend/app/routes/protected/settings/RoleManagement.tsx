import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUser } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, ShieldAlert, CheckCircle2, UserCog, UserMinus } from "lucide-react";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import GlobalSearch from "@/components/global/GlobalSearch";
import { toast } from "sonner";
import type { User as UserType, UserStatus } from "@/types";

const RoleManagement = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for status/banned changes
  const [status, setStatus] = useState("");
  const [banned, setBanned] = useState("false");

  // Query: Fetch all users (admin can view all staff/patients, let's pull all staff roles)
  const { data: usersData, isLoading, isError } = useQuery({
    queryKey: ["all-staff-directory", page],
    queryFn: () => getUsers({ role: "all", page, limit: 8 }),
    placeholderData: (previousData) => previousData,
  });

  // Mutation: Save status/banned details
  const updateStaffMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (res: any) => {
      toast.success(res.message || "User record updated successfully.");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["all-staff-directory"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update user.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading Role Directory..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">Failed to load users directory.</p>
      </div>
    );
  }

  const staffList = usersData?.res || [];
  const pagination = usersData?.pagination;

  const filteredStaff = staffList.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleManageClick = (user: UserType) => {
    setSelectedUser(user);
    setStatus(user.status || "active");
    setBanned(user.banned ? "true" : "false");
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    updateStaffMutation.mutate({
      userId: selectedUser._id,
      userData: {
        status: status as UserStatus,
        banned: banned === "true",
      },
    });
  };

  const getStatusBadge = (s: string, isBanned: boolean) => {
    if (isBanned) {
      return (
        <Badge variant="destructive" className="gap-1">
          <ShieldAlert size={10} /> Banned
        </Badge>
      );
    }
    switch (s?.toLowerCase()) {
      case "active":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/80 gap-1">
            <CheckCircle2 size={10} /> Active
          </Badge>
        );
      case "on_leave":
        return (
          <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100/80">
            On Leave
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100/80">
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="secondary">{s || "Active"}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return <Badge className="bg-red-50 text-red-700 border border-red-100 font-bold">Admin</Badge>;
      case "doctor":
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-100 font-bold">Doctor</Badge>;
      case "nurse":
        return <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold">Nurse</Badge>;
      case "pharmacist":
        return <Badge className="bg-purple-50 text-purple-700 border border-purple-100 font-bold">Pharmacist</Badge>;
      case "lab_tech":
        return <Badge className="bg-orange-50 text-orange-700 border border-orange-100 font-bold">Lab Tech</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <Users size={20} className="text-blue-600 animate-pulse" />
            User & Role Management
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Audit system access roles, check status logs, and configure active session privileges.
          </p>
        </div>
        <GlobalSearch
          search={search}
          setSearch={setSearch}
          title="Search user directory..."
        />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6 font-bold">User Name</TableHead>
              <TableHead className="font-bold text-center">System Role</TableHead>
              <TableHead className="font-bold text-center">Clinical Department</TableHead>
              <TableHead className="font-bold text-center">Account Status</TableHead>
              <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-40 text-center text-slate-400 italic"
                >
                  No staff members found in the directory.
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff: any) => (
                <TableRow
                  key={staff._id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <TableCell className="pl-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-slate-100">
                        <AvatarImage src={staff.image || ""} />
                        <AvatarFallback className="font-bold text-xs bg-blue-50 text-blue-600">
                          {staff.name
                            .split(" ")
                            .map((n: any) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {staff.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {staff.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getRoleBadge(staff.role)}
                  </TableCell>
                  <TableCell className="text-center text-xs text-slate-500 font-semibold">
                    {staff.department || staff.specialization || "General Portal"}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(staff.status, staff.banned)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManageClick(staff)}
                      className="h-8 gap-1 rounded-lg"
                    >
                      <UserCog size={12} /> Manage
                    </Button>
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

      {/* Manage User Status Dialog Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCog className="text-blue-600 animate-spin-slow" size={20} />
              Manage Staff Privileges
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="flex items-center gap-3 p-3 bg-blue-50/40 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/20 rounded-xl my-2">
              <Avatar className="h-9 w-9 border border-blue-200">
                <AvatarImage src={selectedUser.image || ""} />
                <AvatarFallback className="font-bold text-xs bg-blue-100 text-blue-700">
                  {selectedUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {selectedUser.name}
                </span>
                <span className="text-[10px] text-slate-500">
                  Role: {selectedUser.role?.toUpperCase()} • Department: {selectedUser.department || "General"}
                </span>
              </div>
            </div>
          )}
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Operational Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-lg text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">Active Duty</SelectItem>
                  <SelectItem value="on_leave" className="text-xs">On Clinical Leave</SelectItem>
                  <SelectItem value="suspended" className="text-xs">Suspended Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">System Access Bann</Label>
              <Select value={banned} onValueChange={setBanned}>
                <SelectTrigger className="rounded-lg text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false" className="text-xs">Authorized Access (Unbanned)</SelectItem>
                  <SelectItem value="true" className="text-xs text-red-500 font-bold">Banned Access (Block Access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg h-9 text-xs"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateStaffMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs font-bold"
              >
                {updateStaffMutation.isPending ? <Loader label="Saving..." /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagement;

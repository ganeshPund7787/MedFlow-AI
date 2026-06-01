import { authClient } from "@/lib/auth-client";
import type { Role, User, UserStatus } from "@/types";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActityLog, getUsers } from "@/lib/api";
import Loader from "@/components/global/Loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG } from "./statusBadge";
import { toast } from "sonner";
import GlobalSearch from "@/components/global/GlobalSearch";
import CustomPagination from "@/components/global/CustomPagination";
import CreateUserModal from "./CreateUserModal";
import { socket } from "@/lib/socket";
import { DetailsSheet } from "./DetailsSheet";
import StatsCards from "@/components/global/StatsCards";

interface UserManagementProps {
  role: Role;
  title: string;
  description: string;
}

import SafeSuspense from "@/components/global/SafeSuspense";
import EmptyState from "@/components/global/EmptyState";

const UserManagement = ({ role, title, description }: UserManagementProps) => {
  const [page, setPage] = useState(1);
  const fetchQueryKey = ["users", role, page];
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const { data: session } = authClient.useSession();
  
  const statusPropsCount = role === "patient" ? 7 : 5;

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsSheetOpen(true);
  };

  //   fetch using tanstack query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: fetchQueryKey,
    queryFn: () => getUsers({ role, page, limit: 10 }),
    placeholderData: (previousData) => previousData,
    enabled: !!session,
  });

  const users = data?.res || [];
  const pagination = data?.pagination;

  // socket.io listener for real-time updates
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleUpdate = () => refetch();

    socket.on("notify_user_updated", handleUpdate);
    socket.on("notify_user_created", handleUpdate);

    return () => {
      socket.off("notify_user_updated", handleUpdate);
      socket.off("notify_user_created", handleUpdate);
    };
  }, [refetch]);

  // activity mutation
  const activityMutation = useMutation({
    mutationFn: createActityLog,
    onError: (error) => {
      console.log("Activity Log Error:", error);
    },
  });

  // bun users
  const banUser = async (banned: boolean, userId: string) => {
    try {
      setLoading(true);
      if (banned) {
        await authClient.admin.unbanUser({ userId });
        toast.success("User has been unbanned successfully.");
        refetch();
        activityMutation.mutate({
          userId: session?.user.id!,
          action: "ban",
          details: `Unbanned user with ID: ${userId}`,
        });
        setLoading(false);
      } else {
        await authClient.admin.banUser({ userId });
        toast.success("User has been banned successfully.");
        refetch();
        setLoading(false);
        activityMutation.mutate({
          userId: session?.user.id!,
          action: "ban",
          details: `Banned user with ID: ${userId}`,
        });
      }
    } catch (error) {
      setLoading(false);
      console.error("Error banning/unbanning user:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  // delete
  const deleteUser = async (userId: string) => {
    try {
      setLoading(true);
      const { error } = await authClient.admin.removeUser({ userId });
      if (error) {
        toast.error("Failed to delete user.");
        setLoading(false);
      } else {
        toast.success("User has been deleted successfully.");
        refetch();
        setLoading(false);
        activityMutation.mutate({
          userId: session?.user.id!,
          action: "delete",
          details: `Deleted user with ID: ${userId}`,
        });
      }
    } catch (error) {
      setLoading(false);
      console.error("Error deleting user:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader label={`Loading ${title}...`} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <EmptyState 
          title="System Connection Interrupted"
          description="We were unable to establish a secure uplink to the user database."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // filter
  const filteredUsers = (users || []).filter((user) =>
    user?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* startcards */}
      <SafeSuspense errorName="Stats Cards">
        <StatsCards data={users || []} />
      </SafeSuspense>
      
      {/* userDetailsSheet */}
      <DetailsSheet
        user={selectedUser}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
      
      <Card className="card shadow-sm border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 mb-4 pb-6">
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
            <CardDescription className="text-zinc-400">{description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <GlobalSearch
              search={search}
              setSearch={setSearch}
              title={`Search ${title}`}
            />
            <CreateUserModal role={role} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950/50">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  {role === "doctor" && <TableHead>Specialization</TableHead>}
                  {role === "patient" && (
                    <>
                      <TableHead>Age</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Blood Group</TableHead>
                    </>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={statusPropsCount}
                      className="text-center h-64"
                    >
                      <EmptyState 
                        title={`No ${title} Records`}
                        description={`System was unable to locate any active records for ${role} modules.`}
                        onRetry={() => refetch()}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user._id} className="border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-zinc-800">
                            <AvatarImage src={user.image || ""} />
                            <AvatarFallback className="bg-zinc-800 text-zinc-400">
                              {user.name
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("") || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-zinc-200">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-400">{user.email}</TableCell>

                      {role === "doctor" && (
                        <TableCell>
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                            {user.specialization || "General"}
                          </Badge>
                        </TableCell>
                      )}
                      {role === "patient" && (
                        <>
                          <TableCell className="text-zinc-400">{user.age || "N/A"}</TableCell>
                          <TableCell className="text-zinc-400">{user.gender || "N/A"}</TableCell>
                          <TableCell>
                            {user.bloodgroup ? (
                              <Badge
                                variant="outline"
                                className="text-red-500 border-red-500/20 bg-red-500/5"
                              >
                                {user.bloodgroup}
                              </Badge>
                            ) : (
                              <span className="text-zinc-600">N/A</span>
                            )}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        {(() => {
                          const config =
                            STATUS_CONFIG[user.status as UserStatus] ||
                            STATUS_CONFIG["active"];
                          const Icon = config.icon;

                          return (
                            <Badge
                              variant="outline"
                              className={`gap-1.5 py-1 ${config.color} border-current/20 bg-current/5`}
                            >
                              {Icon && <Icon size={12} />}
                              {config.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                          >
                            View
                          </Button>
                          <CreateUserModal
                            role={role}
                            user={user}
                            loading={loading}
                          />
                          {session?.user.role === "admin" && (
                            <>
                              <Button
                                onClick={() => banUser(user?.banned, user._id)}
                                variant="outline"
                                size="sm"
                                disabled={loading}
                                className="border-zinc-800 hover:bg-zinc-800 text-zinc-400"
                              >
                                {user.banned ? "Unban" : "Ban"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteUser(user._id)}
                                disabled={loading}
                                className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {/* pagination */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
              <CustomPagination
                loading={isLoading}
                totalPages={pagination?.totalPages || 0}
                currentPage={pagination?.currentPage || 0}
                setPage={setPage}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;

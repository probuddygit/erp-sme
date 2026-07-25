import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listAllUsers,
  updateUserRoles,
  resetUserPassword,
  impersonateUser,
} from "@/features/admin-platform/admin-platform.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Search, RefreshCw, KeyRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

const ROLES = ["owner", "admin", "manager", "viewer", "sales", "procurement", "finance", "hr"] as const;

function UsersPage() {
  const fetchUsers = useServerFn(listAllUsers);
  const updateRolesFn = useServerFn(updateUserRoles);
  const resetPasswordFn = useServerFn(resetUserPassword);
  const impersonateFn = useServerFn(impersonateUser);

  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleOpen, setRoleOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchUsers({
        data: {
          search: search || undefined,
          role: roleFilter || undefined,
          page,
          limit: 20,
        },
      });
      setRows(res.rows);
      setCount(res.count);
    } catch (e: any) {
      toast.error(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, roleFilter, page]);

  const openRoles = (user: any) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles ?? []);
    setRoleOpen(true);
  };

  const handleUpdateRoles = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await updateRolesFn({
        data: {
          userId: selectedUser.id,
          roles: selectedRoles,
          companyId: selectedUser.companyId ?? undefined,
        },
      });
      toast.success("Roles updated");
      setRoleOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update roles");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (user: any) => {
    try {
      const res = await resetPasswordFn({ data: { userId: user.id } });
      toast.success(`Password reset link sent to ${res.email}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to reset password");
    }
  };

  const handleImpersonate = async (user: any) => {
    try {
      const res = await impersonateFn({ data: { userId: user.id } });
      if (res.magicLink) {
        window.open(res.magicLink, "_blank");
      }
      toast.success(`Impersonation link opened for ${user.email}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to impersonate user");
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-64 pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users ({count})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.fullName || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email}</TableCell>
                      <TableCell className="text-muted-foreground">{row.company?.name ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">none</span>
                          ) : (
                            row.roles.map((r: string) => (
                              <Badge key={r} variant="secondary" className="capitalize">
                                {r.replace("_", " ")}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog open={roleOpen && selectedUser?.id === row.id} onOpenChange={(open) => open && setSelectedUser(row)}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => openRoles(row)}>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Roles
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                          <Button variant="outline" size="sm" onClick={() => handleResetPassword(row)}>
                            <KeyRound className="h-4 w-4 mr-1" />
                            Reset
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleImpersonate(row)}>
                            Impersonate
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button variant="outline" size="sm" disabled={rows.length < 20} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update roles for {selectedUser?.fullName || selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <Button
                  key={role}
                  type="button"
                  variant={selectedRoles.includes(role) ? "default" : "outline"}
                  size="sm"
                  className="capitalize"
                  onClick={() => toggleRole(role)}
                >
                  {role.replace("_", " ")}
                </Button>
              ))}
            </div>
            <Button className="w-full" onClick={handleUpdateRoles} disabled={actionLoading}>
              {actionLoading ? "Saving…" : "Save roles"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

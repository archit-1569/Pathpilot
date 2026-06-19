"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal, Search, User as UserIcon, Trash2, UserX, UserCheck } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const pageSize = 10;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileDetails, setProfileDetails] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = `/admin/users?page=${page}&page_size=${pageSize}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (roleFilter !== "all") url += `&role=${roleFilter}`;
      if (statusFilter !== "all") url += `&status_filter=${statusFilter === "active"}`;

      const data = await apiRequest(url);
      setUsers(data.users);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter, statusFilter]);

  const viewProfile = async (user: User) => {
    setProfileUser(user);
    setProfileLoading(true);
    try {
      const data = await apiRequest(`/admin/users/${user.id}`);
      setProfileDetails(data);
    } catch (e: any) {
      alert("Failed to load profile details: " + e.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const toggleStatus = async (user: User) => {
    if (confirm(`Are you sure you want to ${user.is_active ? 'disable' : 'enable'} this user?`)) {
      try {
        await apiRequest(`/admin/users/${user.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: !user.is_active }),
        });
        fetchUsers();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const deleteUser = async (user: User) => {
    if (confirm(`Are you sure you want to completely delete ${user.email}? This action cannot be undone.`)) {
      try {
        await apiRequest(`/admin/users/${user.id}`, { method: "DELETE" });
        fetchUsers();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card text-card-foreground p-4 rounded-lg border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val || "all"); setPage(1); }}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "all"); setPage(1); }}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Registration</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">Loading users...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">No users found.</TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(user.created_at), "PPp")}</TableCell>
                  <TableCell>
                    {user.last_login ? format(new Date(user.last_login), "PPp") : "Never"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "outline" : "destructive"}>
                      {user.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted focus:outline-none focus:bg-muted">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Actions</div>
                        <DropdownMenuItem onClick={() => viewProfile(user)}>
                          <span className="flex items-center"><UserIcon className="mr-2 h-4 w-4" /> View Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleStatus(user)}>
                          <span className="flex items-center">
                            {user.is_active ? <><UserX className="mr-2 h-4 w-4" /> Disable User</> : <><UserCheck className="mr-2 h-4 w-4" /> Enable User</>}
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteUser(user)} className="text-red-600">
                          <span className="flex items-center"><Trash2 className="mr-2 h-4 w-4" /> Delete User</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {users.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, total)} of {total} results
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * pageSize >= total || loading}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Profile Modal */}
      <Dialog open={!!profileUser} onOpenChange={(open) => !open && setProfileUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              Detailed information for {profileUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {profileLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading profile details...</p>
            ) : profileDetails ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-lg border">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Name</span>
                  <p className="font-medium">{profileDetails.name || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Email</span>
                  <p className="font-medium">{profileDetails.email}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Role</span>
                  <p className="font-medium capitalize">{profileDetails.role}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Age</span>
                  <p className="font-medium">{profileDetails.age || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Gender</span>
                  <p className="font-medium">{profileDetails.gender || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Education</span>
                  <p className="font-medium">{profileDetails.education_level || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Stream</span>
                  <p className="font-medium">{profileDetails.stream || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">CGPA</span>
                  <p className="font-medium">{profileDetails.cgpa || "N/A"}</p>
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Career Goals</span>
                  <p className="text-sm bg-background p-3 rounded border">{profileDetails.career_goals || "No career goals specified."}</p>
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Skills</span>
                  <div className="flex flex-wrap gap-2">
                    {profileDetails.skills?.length ? profileDetails.skills.map((skill: string, i: number) => (
                      <Badge key={i} variant="secondary">{skill}</Badge>
                    )) : <span className="text-sm text-muted-foreground">None</span>}
                  </div>
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Interests</span>
                  <div className="flex flex-wrap gap-2">
                    {profileDetails.interests?.length ? profileDetails.interests.map((interest: string, i: number) => (
                      <Badge key={i} variant="outline">{interest}</Badge>
                    )) : <span className="text-sm text-muted-foreground">None</span>}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-red-500">Failed to load profile.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

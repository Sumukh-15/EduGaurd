"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { createAdminUser, getAdminUsers, updateAdminUserStatus } from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";
import { AdminUser, AdminUserCreatePayload } from "@/types/admin";
import { UserRole } from "@/types/auth";

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    return err.detail;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred.";
}

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();

  // Table state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<AdminUserCreatePayload>({
    email: "",
    password: "",
    role: "faculty",
    full_name: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Deactivation Confirmation Modal State
  const [userToToggle, setUserToToggle] = useState<AdminUser | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const fetchUsers = async (targetPage = page, targetRole = roleFilter) => {
    setIsLoading(true);
    setActionError(null);

    try {
      const data = await getAdminUsers({
        page: targetPage,
        page_size: 15,
        role: targetRole === "all" ? undefined : targetRole,
      });
      setUsers(data.users || data.items || []);
      setTotalUsers(data.total);
      setPage(data.page);
      setTotalPages(data.total_pages);
    } catch (err: unknown) {
      setActionError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      try {
        const data = await getAdminUsers({
          page: 1,
          page_size: 15,
          role: roleFilter === "all" ? undefined : roleFilter,
        });
        if (isMounted) {
          setUsers(data.users || data.items || []);
          setTotalUsers(data.total);
          setPage(data.page);
          setTotalPages(data.total_pages);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setActionError(extractErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [roleFilter]);

  const handleRoleFilterChange = (role: string) => {
    setIsLoading(true);
    setRoleFilter(role);
    setPage(1);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.email.trim()) {
      setCreateError("Email is required.");
      return;
    }
    if (!createForm.password || createForm.password.length < 8) {
      setCreateError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setIsCreating(true);
      const created = await createAdminUser(createForm);
      setIsCreateModalOpen(false);
      setCreateForm({ email: "", password: "", role: "faculty", full_name: "" });
      setActionSuccess(`User account '${created.email}' provisioned successfully.`);
      fetchUsers(1, roleFilter);
    } catch (err: unknown) {
      setCreateError(extractErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!userToToggle) return;

    if (userToToggle.id === currentAdmin?.id && userToToggle.is_active) {
      setActionError("You cannot deactivate your own administrative account.");
      setUserToToggle(null);
      return;
    }

    try {
      setIsTogglingStatus(true);
      const newStatus = !userToToggle.is_active;
      await updateAdminUserStatus(userToToggle.id, { is_active: newStatus });
      setUserToToggle(null);
      setActionSuccess(
        `User '${userToToggle.email}' has been ${newStatus ? "reactivated" : "deactivated"}.`
      );
      fetchUsers(page, roleFilter);
    } catch (err: unknown) {
      setActionError(extractErrorMessage(err));
      setUserToToggle(null);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="max-w-7xl mx-auto space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-softgreen text-edugreen text-xs font-medium mb-2 border border-edugreen/20">
              <Users className="w-3.5 h-3.5" />
              <span>Identity &amp; access management</span>
            </div>
            <h1 className="font-display text-2xl text-ink tracking-tight">
              User Directory &amp; Access Control
            </h1>
            <p className="text-xs text-ink/60 mt-1">
              Manage student, faculty, and administrative accounts with bcrypt-secured credentials and status toggles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchUsers(page, roleFilter)}
              disabled={isLoading}
              className="btn-interactive p-2.5 rounded-xl border border-ink/10 bg-white text-ink hover:bg-paper transition-colors"
              title="Refresh User List"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setIsCreateModalOpen(true);
              }}
              className="btn-interactive inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-edugreen hover:bg-edugreen-dark active:scale-[0.99] text-white text-xs font-semibold transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create user account</span>
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {actionSuccess && (
          <div
            role="status"
            className="p-4 rounded-xl bg-softgreen border border-edugreen/30 text-xs text-edugreen flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-edugreen flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-edugreen hover:text-edugreen-dark"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-coral/10 border border-coral/20 text-xs text-coral flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-coral flex-shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-coral hover:text-coral-dark"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-ink/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-ink/40" />
            <span className="text-xs font-medium text-ink-muted">
              Role filter:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { label: "All Roles", value: "all" },
                { label: "Admin", value: "admin" },
                { label: "Faculty", value: "faculty" },
                { label: "Student", value: "student" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => handleRoleFilterChange(filter.value)}
                  className={`btn-interactive px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    roleFilter === filter.value
                      ? "bg-ink text-paper shadow-sm"
                      : "text-ink/60 hover:bg-paper"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-ink/60 font-medium">
            Total matching: <strong className="text-ink tabular-nums font-bold">{totalUsers}</strong> users
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl bg-white border border-ink/10 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-7 h-7 text-edugreen animate-spin mx-auto mb-2" />
              <p className="text-xs text-ink/60">Loading user accounts...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Users className="w-10 h-10 text-ink/20 mx-auto" />
              <p className="text-sm font-semibold text-ink">No users found</p>
              <p className="text-xs text-ink/50">No registered accounts matched the selected filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" role="table">
                <thead className="bg-paper border-b border-ink/10 text-xs font-medium text-ink-muted">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">User ID</th>
                    <th className="py-2.5 px-4 font-medium">Account / email</th>
                    <th className="py-2.5 px-4 font-medium">Full name</th>
                    <th className="py-2.5 px-4 font-medium">Role</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Created date</th>
                    <th className="py-2.5 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5 text-ink/80">
                  {users.map((u) => {
                    const isSelf = currentAdmin?.id === u.id;

                    return (
                      <tr key={u.id} className="table-row-hover">
                        <td className="py-3 px-4 font-mono text-xs text-ink-muted tabular-nums">
                          #{u.id}
                        </td>
                        <td className="py-3 px-4 font-semibold text-ink">
                          <div className="flex items-center gap-2">
                            <span>{u.email}</span>
                            {isSelf && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-softgreen text-edugreen">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-ink/70">
                          {u.full_name || "—"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-medium text-[11px] border ${
                              u.role === "admin"
                                ? "bg-ink text-paper border-ink"
                                : u.role === "faculty"
                                ? "bg-softgreen text-edugreen border-edugreen/20"
                                : "bg-paper text-ink border-ink/10"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-[11px] ${
                              u.is_active
                                ? "bg-softgreen text-edugreen"
                                : "bg-coral/10 text-coral"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.is_active ? "bg-edugreen" : "bg-coral"
                              }`}
                            />
                            {u.is_active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-ink-muted tabular-nums">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isSelf ? (
                            <span
                              className="text-xs text-ink-muted italic"
                              title="You cannot deactivate your own account"
                            >
                              Self account
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setUserToToggle(u)}
                              className={`btn-interactive px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                u.is_active
                                  ? "text-coral hover:bg-coral/10"
                                  : "text-edugreen hover:bg-softgreen"
                              }`}
                            >
                              {u.is_active ? "Deactivate" : "Reactivate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-ink/10 bg-paper/40 flex items-center justify-between text-xs">
              <span className="text-ink/60">
                Page <strong className="text-ink">{page}</strong> of{" "}
                <strong className="text-ink">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchUsers(page - 1, roleFilter)}
                  disabled={page <= 1 || isLoading}
                  className="p-1.5 rounded-lg border border-ink/10 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fetchUsers(page + 1, roleFilter)}
                  disabled={page >= totalPages || isLoading}
                  className="p-1.5 rounded-lg border border-ink/10 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Create User */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-ink/10 shadow-2xl max-w-md w-full p-6 space-y-5 modal-panel-enter">
              <div className="flex items-center justify-between pb-3 border-b border-ink/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-softgreen text-edugreen flex items-center justify-center font-bold">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-lg text-ink">
                    Create User Account
                  </h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreating}
                  className="text-ink/40 hover:text-ink transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {createError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-coral/10 border border-coral/20 text-xs text-coral flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Email address *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    placeholder="name@university.edu"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-ink/10 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Full name (optional)
                  </label>
                  <input
                    type="text"
                    value={createForm.full_name || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, full_name: e.target.value })
                    }
                    placeholder="Prof. John Doe"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-ink/10 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Password (bcrypt encrypted) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    placeholder="At least 8 characters"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-ink/10 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen font-mono"
                  />
                  <span className="text-[11px] text-ink-muted mt-1 block">
                    Passwords are never logged or stored in plaintext.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Role *
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-ink/10 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen font-medium"
                  >
                    <option value="faculty">Faculty Member</option>
                    <option value="admin">Administrator</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-ink/5">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isCreating}
                    className="btn-interactive px-4 py-2 rounded-xl text-xs font-semibold text-ink/60 hover:bg-paper"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="btn-interactive px-4 py-2 rounded-xl bg-edugreen hover:bg-edugreen-dark active:scale-[0.99] text-white text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-sm"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Save user</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirmation for Deactivation / Reactivation */}
        {userToToggle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-ink/10 shadow-2xl max-w-md w-full p-6 space-y-4 modal-panel-enter">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    userToToggle.is_active
                      ? "bg-coral/10 text-coral"
                      : "bg-softgreen text-edugreen"
                  }`}
                >
                  {userToToggle.is_active ? (
                    <UserX className="w-5 h-5" />
                  ) : (
                    <UserCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-lg text-ink">
                    {userToToggle.is_active
                      ? "Confirm Account Deactivation"
                      : "Confirm Account Reactivation"}
                  </h3>
                  <p className="text-xs text-ink/60 mt-0.5">
                    User: {userToToggle.email}
                  </p>
                </div>
              </div>

              <p className="text-xs text-ink/70 leading-relaxed">
                {userToToggle.is_active ? (
                  <>
                    Deactivating this account will prevent the user from logging into EduGuard. Active sessions will be terminated and login attempts will return a generic credentials rejection to protect account privacy.
                  </>
                ) : (
                  <>
                    Reactivating this account will immediately restore portal access using the user&apos;s existing credentials.
                  </>
                )}
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-ink/5">
                <button
                  type="button"
                  onClick={() => setUserToToggle(null)}
                  disabled={isTogglingStatus}
                  className="btn-interactive px-4 py-2 rounded-xl text-xs font-semibold text-ink/60 hover:bg-paper"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmToggleStatus}
                  disabled={isTogglingStatus}
                  className={`btn-interactive px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all shadow-sm inline-flex items-center gap-2 ${
                    userToToggle.is_active
                      ? "bg-coral hover:bg-coral-dark"
                      : "bg-edugreen hover:bg-edugreen-dark"
                  }`}
                >
                  {isTogglingStatus ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>
                      {userToToggle.is_active ? "Yes, deactivate account" : "Yes, reactivate account"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

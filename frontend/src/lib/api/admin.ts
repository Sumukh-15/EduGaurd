import { api } from "./client";
import {
  AdminUser,
  AdminUserCreatePayload,
  AdminUserListResponse,
  AdminUserUpdatePayload,
  AuditLogListResponse,
  ModelInfo,
  SystemUsage,
} from "@/types/admin";

export interface AdminUserFilterParams {
  page?: number;
  page_size?: number;
  role?: string;
}

/**
 * Fetch paginated user accounts with optional role filter.
 * Admin only.
 */
export async function getAdminUsers(
  params: AdminUserFilterParams = {}
): Promise<AdminUserListResponse> {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }
  if (params.page_size !== undefined) {
    searchParams.set("page_size", String(params.page_size));
  }
  if (params.role && params.role !== "all") {
    searchParams.set("role", params.role);
  }

  const queryStr = searchParams.toString();
  const endpoint = queryStr ? `/api/admin/users?${queryStr}` : "/api/admin/users";

  return api.get<AdminUserListResponse>(endpoint);
}

/**
 * Create a new user with bcrypt-hashed credentials and audit logging.
 * Admin only.
 */
export async function createAdminUser(
  payload: AdminUserCreatePayload
): Promise<AdminUser> {
  return api.post<AdminUser>("/api/admin/users", payload);
}

/**
 * Activate or deactivate a user account.
 * Admin cannot deactivate their own account.
 * Admin only.
 */
export async function updateAdminUserStatus(
  userId: number,
  payload: AdminUserUpdatePayload
): Promise<AdminUser> {
  return api.patch<AdminUser>(`/api/admin/users/${userId}`, payload);
}

/**
 * Retrieve current ML model metadata, test metrics, and decision thresholds.
 * Admin only.
 */
export async function getAdminModelInfo(): Promise<ModelInfo> {
  return api.get<ModelInfo>("/api/admin/model-info");
}

/**
 * Retrieve system-wide telemetry, user counts, prediction counts, and uploads.
 * Admin only.
 */
export async function getAdminUsage(): Promise<SystemUsage> {
  return api.get<SystemUsage>("/api/admin/usage");
}

/**
 * Retrieve system audit logs with optional filtering.
 * Admin only.
 */
export async function getAdminAuditLogs(params: {
  limit?: number;
  offset?: number;
  action?: string;
} = {}): Promise<AuditLogListResponse> {
  const searchParams = new URLSearchParams();

  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    searchParams.set("offset", String(params.offset));
  }
  if (params.action) {
    searchParams.set("action", params.action);
  }

  const queryStr = searchParams.toString();
  const endpoint = queryStr ? `/api/admin/audit-logs?${queryStr}` : "/api/admin/audit-logs";

  return api.get<AuditLogListResponse>(endpoint);
}

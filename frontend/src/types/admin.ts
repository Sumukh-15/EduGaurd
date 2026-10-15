/**
 * TypeScript types for EduGuard Admin role and endpoints.
 * Strictly corresponds to backend/app/schemas/admin.py.
 */

import { UserRole } from "@/types/auth";

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AdminUserListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  users: AdminUser[];
  items?: AdminUser[];
}

export interface AdminUserCreatePayload {
  email: string;
  password: string;
  role: UserRole;
  full_name?: string;
}

export interface AdminUserUpdatePayload {
  is_active: boolean;
}

export interface ModelTestMetrics {
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  roc_auc: number | null;
  confusion_matrix: number[][] | null;
  classification_report: Record<string, unknown> | null;
}

export interface ModelInfo {
  model_version: string;
  algorithm: string;
  training_date: string | null;
  metrics: ModelTestMetrics;
  classification_threshold: number;
  risk_thresholds: Record<string, number>;
  feature_count: number;
  feature_names: string[];
  artifact_details: Record<string, unknown>;
}

export interface RecentUploadAudit {
  filename: string;
  actor_email: string;
  timestamp: string;
  details: string | null;
}

export interface SystemUsage {
  total_users: number;
  users_by_role: {
    admin: number;
    faculty: number;
    student: number;
  };
  active_users: number;
  inactive_users: number;
  total_students: number;
  total_academic_records: number;
  predictions_last_7_days: number;
  predictions_last_30_days: number;
  total_dataset_uploads: number;
  recent_uploads: RecentUploadAudit[];
}

export interface AuditLogItem {
  id: number;
  actor_user_id: number;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target: string;
  details: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  total: number;
  items: AuditLogItem[];
}

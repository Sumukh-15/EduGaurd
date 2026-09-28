/**
 * Authentication and authorization types for EduGuard.
 * Strictly mirrors the backend schemas in backend/app/schemas/auth.py.
 */

export type UserRole = "student" | "faculty" | "admin";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  expires_in: number;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  student_id: number | null;
  student_code: string | null;
}

export interface ApiError {
  status: number;
  detail: string;
}

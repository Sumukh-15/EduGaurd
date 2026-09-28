import { api } from "./client";
import { LoginRequest, LoginResponse, User } from "@/types/auth";

/**
 * Authenticates user credentials with the backend.
 *
 * @param credentials User email and password
 * @returns TokenResponse containing signed JWT, token type, user role, and expiry seconds
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/auth/login", credentials, { skipAuth: true });
}

/**
 * Retrieves the currently authenticated user's profile and linked student ID.
 * Automatically transmits Bearer token via the centralized client.
 *
 * @returns User object including role, id, full_name, and linked student identifiers
 */
export async function getCurrentUser(): Promise<User> {
  return api.get<User>("/api/auth/me");
}

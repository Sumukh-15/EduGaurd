"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, login as apiLogin } from "@/lib/api/auth";
import {
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
} from "@/lib/api/client";
import { LoginRequest, User } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Initialize session from client storage
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedToken) {
          if (isMounted) {
            setToken(null);
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setToken(storedToken);
        }

        // Fetch fresh authoritative user profile from backend
        const currentUser = await getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
        }
      } catch {
        // Token invalid, expired, or backend rejected
        if (isMounted) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for unauthorized 401 events dispatched by API client
  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      setToken(null);
      setUser(null);
      router.push("/login?expired=1");
    };

    window.addEventListener("eduguard:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("eduguard:unauthorized", handleUnauthorized);
    };
  }, [router]);

  const login = useCallback(
    async (credentials: LoginRequest): Promise<User> => {
      setIsLoading(true);
      try {
        // 1. Authenticate with backend and receive JWT
        const tokenResponse = await apiLogin(credentials);

        // 2. Persist access token in localStorage
        localStorage.setItem(TOKEN_STORAGE_KEY, tokenResponse.access_token);
        setToken(tokenResponse.access_token);

        // 3. Immediately fetch complete user profile including linked student identifiers
        const userProfile = await getCurrentUser();

        // 4. Persist user identity and update state
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
        setUser(userProfile);

        return userProfile;
      } catch (err) {
        // Clean up on failure
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        setToken(null);
        setUser(null);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const updatedUser = await getCurrentUser();
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

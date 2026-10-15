"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiClientError } from "@/lib/api/client";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your academic email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your account password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await login({ email: cleanEmail, password });

      // Role-based destination routing
      if (user.role === "student") {
        router.push("/dashboard/student");
      } else if (user.role === "admin") {
        router.push("/dashboard/admin");
      } else {
        router.push("/dashboard/faculty");
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 401) {
          setErrorMessage("Incorrect email or password.");
        } else if (err.status === 400 && err.detail.toLowerCase().includes("inactive")) {
          setErrorMessage("Your account is inactive. Please contact your administrator.");
        } else if (err.status === 422) {
          setErrorMessage("Please enter a valid email address format.");
        } else if (err.status === 0) {
          setErrorMessage("Unable to connect to EduGuard. Please make sure the backend service is running.");
        } else {
          setErrorMessage(err.detail || "Authentication failed. Please try again.");
        }
      } else {
        setErrorMessage("An unexpected error occurred. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-ink/10 transition-all paper-surface modal-panel-enter">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ink text-mint mb-4 shadow-sm ring-4 ring-softgreen">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="font-display text-2xl text-ink tracking-tight">
          EduGuard Portal
        </h1>
        <p className="text-sm text-ink/60 mt-1 font-medium">
          Academic risk early-warning & decision support system
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 p-4 rounded-xl bg-coral/10 border border-coral/30 text-ink text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-coral mt-0.5" />
          <span className="font-medium leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-ink/75 mb-1.5"
          >
            Academic email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink/40">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student@school.edu"
              className="w-full pl-10 pr-4 py-2.5 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/35 text-sm focus:outline-none focus:ring-2 focus:ring-edugreen focus:border-edugreen transition-all disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-ink/75 mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink/40">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-10 pr-11 py-2.5 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/35 text-sm focus:outline-none focus:ring-2 focus:ring-edugreen focus:border-edugreen transition-all disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              tabIndex={0}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink/40 hover:text-ink transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-4 bg-edugreen hover:bg-edugreen-dark text-white text-sm font-semibold rounded-xl shadow-md shadow-edugreen/20 hover:shadow-edugreen/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-edugreen focus:ring-offset-2 btn-interactive"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <span>Sign In to Dashboard</span>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-ink/10 text-center">
        <p className="text-xs text-ink/50">
          Authorized academic personnel & students only.
          <br />
          Protected under institutional educational data standards.
        </p>
      </div>
    </div>
  );
}

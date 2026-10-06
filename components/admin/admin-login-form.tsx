"use client";

import { useActionState } from "react";
import { loginAdmin, type AdminLoginState } from "@/app/admin/actions";

export function AdminLoginForm({ isConfigured }: { isConfigured: boolean }) {
  const [state, action, isPending] = useActionState<AdminLoginState, FormData>(loginAdmin, undefined);

  return (
    <form action={action} className="admin-login-form">
      <label htmlFor="admin-password">Admin password</label>
      <input
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        minLength={16}
        maxLength={256}
        required
        disabled={!isConfigured || isPending}
      />
      {state?.error && <p className="admin-login-error" role="alert">{state.error}</p>}
      {!isConfigured && (
        <p className="admin-login-note">Set ADMIN_PASSWORD and a random ADMIN_SESSION_SECRET in the server environment to enable access.</p>
      )}
      <button type="submit" disabled={!isConfigured || isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

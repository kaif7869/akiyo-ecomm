"use server";

import { redirect } from "next/navigation";
import {
  createAdminSession,
  deleteAdminSession,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export type AdminLoginState = { error: string } | undefined;

export async function loginAdmin(
  _previousState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const password = formData.get("password");
  if (!isAdminConfigured()) {
    return { error: "Admin access has not been configured on this server." };
  }
  if (typeof password !== "string" || password.length > 256 || !verifyAdminPassword(password)) {
    return { error: "Unable to sign in with those credentials." };
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAdmin(): Promise<void> {
  await deleteAdminSession();
  redirect("/admin");
}

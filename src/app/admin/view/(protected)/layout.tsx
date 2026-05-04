import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSuperAdminFromCookie } from "@/lib/admin-auth";
import { AdminShell } from "../_components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const admin = await getSuperAdminFromCookie();
  if (!admin) redirect("/admin/view/login");
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}

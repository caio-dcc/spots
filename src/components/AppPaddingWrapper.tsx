"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export function AppPaddingWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin");

  // Global padding removed to allow pages to control their own layout/hero sections
  const paddingTop = "0px";

  return (
    <div style={{ paddingTop }} className="flex-1 flex flex-col min-h-screen">
      {children}
    </div>
  );
}

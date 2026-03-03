"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function ConditionalSidebar() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.getElementById("root-container");
    if (!root) return;
    const isAuth = !!(pathname && (pathname.startsWith("/auth") || pathname === "/login"));
    if (isAuth) root.classList.add("auth-mode");
    else root.classList.remove("auth-mode");
    return () => root.classList.remove("auth-mode");
  }, [pathname]);

  // Hide sidebar for any auth routes and the top-level /login page
  if (pathname && (pathname.startsWith("/auth") || pathname === "/login")) return null;

  return <Sidebar />;
}

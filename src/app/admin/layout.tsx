"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { getStoredUser } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/login");
    } else if (user.role !== "admin") {
      router.replace("/entrada");
    }
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden linen-bg">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

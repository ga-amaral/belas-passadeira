"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { getStoredUser } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPedidosRoute = pathname.startsWith("/admin/pedidos");

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
        <div className={`p-8 mx-auto ${isPedidosRoute ? "max-w-none" : "max-w-7xl"}`}>
          {children}
        </div>
      </main>
    </div>
  );
}

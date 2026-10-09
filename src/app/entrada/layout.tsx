"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import FuncionariaTopbar from "@/components/layout/FuncionariaTopbar";
import { getStoredUser } from "@/lib/auth";

export default function EntradaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPedidosRoute = pathname.startsWith("/entrada/pedidos");

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <FuncionariaTopbar />
      <main className={`flex-1 p-6 mx-auto w-full ${isPedidosRoute ? "max-w-none" : "max-w-6xl"}`}>
        {children}
      </main>
    </div>
  );
}

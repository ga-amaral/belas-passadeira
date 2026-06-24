"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FuncionariaTopbar from "@/components/layout/FuncionariaTopbar";
import { getStoredUser } from "@/lib/auth";

export default function EntradaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen linen-bg flex flex-col">
      <FuncionariaTopbar />
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

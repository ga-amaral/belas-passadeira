"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Users } from "lucide-react";
import { clearAuth, getStoredUser } from "@/lib/auth";

export default function FuncionariaTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    setUserName(user?.name ?? null);
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  const initial = userName?.charAt(0).toUpperCase() ?? "F";
  const displayName = userName ?? "Funcionária";

  return (
    <header className="w-full bg-white border-b border-brand-gold/10 shadow-card px-6 py-3 flex items-center justify-between">
      <Image src="/brand/logo-plum.png" alt="Belas Passadeiras" width={1446} height={503} className="h-auto w-40 max-w-[35vw]" />

      <nav className="flex items-center gap-1">
        <Link
          href="/entrada"
          className={`px-3 py-1.5 rounded-lg text-sm font-poppins transition-colors ${
            pathname === "/entrada" ? "bg-brand-gold/10 text-brand-gold font-semibold" : "text-brand-text/60 hover:text-brand-text"
          }`}
        >
          Nova entrada
        </Link>
        <Link
          href="/entrada/clientes"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-poppins transition-colors ${
            pathname === "/entrada/clientes" ? "bg-brand-gold/10 text-brand-gold font-semibold" : "text-brand-text/60 hover:text-brand-text"
          }`}
        >
          <Users size={14} strokeWidth={1.5} />
          Clientes
        </Link>
        <Link
          href="/entrada/pedidos"
          className={`px-3 py-1.5 rounded-lg text-sm font-poppins transition-colors ${
            pathname === "/entrada/pedidos" ? "bg-brand-gold/10 text-brand-gold font-semibold" : "text-brand-text/60 hover:text-brand-text"
          }`}
        >
          Pedidos
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-rose/20 flex items-center justify-center">
            <span className="text-xs font-medium text-brand-text">{initial}</span>
          </div>
          <span className="text-sm text-brand-text/70 font-poppins">{displayName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-brand-text/40 hover:text-red-500 transition-colors"
        >
          <LogOut size={15} strokeWidth={1.5} />
          <span className="font-poppins">Sair</span>
        </button>
      </div>
    </header>
  );
}

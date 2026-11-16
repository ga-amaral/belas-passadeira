"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Search, Users } from "lucide-react";
import { clearAuth, getStoredUser } from "@/lib/auth";
import type { User } from "@/types";
import ProfileModal from "./ProfileModal";

export default function FuncionariaTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    setUser(user);
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  const initial = user?.name?.charAt(0).toUpperCase() ?? "F";
  const displayName = user?.name ?? "Funcionária";

  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-brand-gold/10 bg-white px-3 py-3 shadow-card sm:px-6 lg:flex-nowrap">
      <Image src="/brand/logo-plum.png" alt="Belas Passadeiras" width={1446} height={503} className="h-auto w-40 max-w-[35vw]" />

      <nav aria-label="Navegação da funcionária" className="order-3 -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1 overflow-x-auto px-1 pb-0.5 lg:order-none lg:mx-0 lg:w-auto lg:flex-1 lg:justify-center">
        <Link
          href="/entrada"
          className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-poppins transition-colors ${
            pathname === "/entrada" ? "bg-brand-gold/10 text-brand-gold font-semibold" : "text-brand-text/60 hover:text-brand-text"
          }`}
        >
          Nova entrada
        </Link>
        <Link
          href="/entrada/clientes"
          className={`flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-poppins transition-colors ${
            pathname === "/entrada/clientes" ? "bg-brand-gold/10 text-brand-gold font-semibold" : "text-brand-text/60 hover:text-brand-text"
          }`}
        >
          <Users size={14} strokeWidth={1.5} />
          Clientes
        </Link>
        <Link
          href="/entrada/pedidos"
          className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-poppins transition-colors ${
            pathname === "/entrada/pedidos" ? "bg-brand-gold/10 text-brand-gold font-semibold" : "text-brand-text/60 hover:text-brand-text"
          }`}
        >
          Pedidos
        </Link>
        <Link
          href="/entrada/perdidos"
          aria-current={pathname === "/entrada/perdidos" ? "page" : undefined}
          className={`flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-poppins transition-colors ${
            pathname === "/entrada/perdidos" ? "bg-brand-gold/10 text-brand-gold font-semibold" : "text-brand-text/60 hover:text-brand-text"
          }`}
        >
          <Search size={14} strokeWidth={1.7} aria-hidden="true" />
          Perdidos
        </Link>
      </nav>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <button type="button" aria-label="Abrir meu perfil" onClick={() => setProfileOpen(true)} className="flex items-center gap-2 rounded-xl p-2 hover:bg-brand-gold/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold">
          <div className="w-7 h-7 rounded-full bg-brand-rose/20 flex items-center justify-center">
            <span className="text-xs font-medium text-brand-text">{initial}</span>
          </div>
          <span className="hidden text-sm text-brand-text/70 font-poppins sm:inline">{displayName}</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-brand-text/40 hover:text-red-500 transition-colors"
        >
          <LogOut size={15} strokeWidth={1.5} />
          <span className="font-poppins">Sair</span>
        </button>
      </div>
      <ProfileModal open={profileOpen} user={user} onClose={() => setProfileOpen(false)} onUpdated={setUser} />
    </header>
  );
}

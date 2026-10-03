"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  History,
  Tag,
  LogOut,
  Shirt,
  UserCircle,
} from "lucide-react";
import { clearAuth, getStoredUser } from "@/lib/auth";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/precos", label: "Preços", icon: Tag },
  { href: "/admin/funcionarias", label: "Funcionárias", icon: Users },
  { href: "/admin/historico", label: "Histórico", icon: History },
  { href: "/admin/clientes", label: "Clientes", icon: UserCircle },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function isActive(item: typeof navItems[0]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-white border-r border-brand-gold/10 shadow-card">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-brand-gold/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center shadow-gold">
            <Shirt size={18} className="text-white" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-poppins font-semibold text-brand-text leading-tight">Belas</p>
            <p className="text-xs text-brand-gold font-poppins font-medium">Passadeiras</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200
                ${
                  active
                    ? "bg-brand-gold text-white shadow-gold"
                    : "text-brand-text/60 hover:bg-brand-gold/8 hover:text-brand-text"
                }
              `}
            >
              <item.icon size={18} strokeWidth={1.5} />
              <span className="font-poppins">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-brand-gold/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-rose/20 flex items-center justify-center">
            <span className="text-sm font-medium text-brand-rose">
              {user?.name?.charAt(0).toUpperCase() ?? "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold font-poppins text-brand-text truncate">{user?.name ?? "Admin"}</p>
            <p className="text-[11px] text-brand-text/40 truncate">{user?.email ?? ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-brand-text/50 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut size={15} strokeWidth={1.5} />
          <span className="font-poppins">Sair</span>
        </button>
      </div>
    </aside>
  );
}

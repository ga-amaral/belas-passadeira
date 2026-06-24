"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { clearAuth, getStoredUser, saveAuth } from "@/lib/auth";
import { login as apiLogin } from "@/lib/api";
import toast from "react-hot-toast";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setLoading(false);
  }, []);

  async function login(email: string, senha: string) {
    try {
      const res = await apiLogin(email, senha);
      saveAuth(res.token, res.user);
      setUser(res.user);
      if (res.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/entrada");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer login";
      toast.error(msg);
      throw err;
    }
  }

  function logout() {
    clearAuth();
    setUser(null);
    router.push("/login");
  }

  return { user, loading, login, logout };
}

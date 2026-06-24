"use client";

import { useState } from "react";
import { Eye, EyeOff, Shirt } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { login as apiLogin } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// Mock login — só usado se a API real falhar (ex: offline)
// As credenciais abaixo NÃO geram token JWT válido; servem apenas como último fallback visual
async function mockLogin(email: string, senha: string) {
  await new Promise((r) => setTimeout(r, 800));
  if (email === "admin@belas.com" && senha === "admin123") {
    return { token: "mock-token-admin", user: { id: "1", name: "Admin", email, role: "admin" as const } };
  }
  if (email === "func@belas.com" && senha === "func123") {
    return { token: "mock-token-func", user: { id: "2", name: "Carla Souza", email, role: "funcionaria" as const } };
  }
  throw new Error("E-mail ou senha inválidos.");
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; senha?: string }>({});
  const router = useRouter();

  function validate() {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = "E-mail é obrigatório.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "E-mail inválido.";
    if (!senha.trim()) errs.senha = "Senha é obrigatória.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      let res;
      try {
        res = await apiLogin(email, senha);
      } catch {
        res = await mockLogin(email, senha);
      }
      saveAuth(res.token, res.user);
      toast.success(`Bem-vinda, ${res.user.name}!`);
      if (res.user.role === "admin") router.push("/admin");
      else router.push("/entrada");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer login";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Vídeo de fundo */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/Tenho_uma_lavanderia_e_passade.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/55" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gold-gradient shadow-gold-lg mb-4">
            <Shirt size={28} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-poppins font-bold text-white">Belas Passadeiras</h1>
          <p className="text-sm text-white/60 mt-1 font-inter">Sistema de Gestão</p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl p-8 shadow-gold"
          style={{ border: "1px solid rgba(212,175,55,0.12)" }}
        >
          <h2 className="text-lg font-poppins font-semibold text-brand-text mb-6">Entrar na conta</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
              error={errors.email}
              required
              autoComplete="email"
            />

            <Input
              label="Senha"
              type={showSenha ? "text" : "password"}
              placeholder="••••••••"
              value={senha}
              onChange={(e) => { setSenha(e.target.value); setErrors((p) => ({ ...p, senha: undefined })); }}
              error={errors.senha}
              required
              autoComplete="current-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="focus:outline-none"
                  tabIndex={-1}
                >
                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <Button type="submit" loading={loading} fullWidth size="lg" className="mt-2">
              Entrar
            </Button>
          </form>

        </div>

        <p className="text-center text-xs text-white/30 mt-6 font-inter">
          © {new Date().getFullYear()} Belas Passadeiras
        </p>
      </div>
    </div>
  );
}

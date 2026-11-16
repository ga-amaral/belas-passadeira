"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import type { User } from "@/types";
import { atualizarPerfil } from "@/lib/api";
import { updateStoredUser } from "@/lib/auth";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ProfileModal({ open, user, onClose, onUpdated }: { open: boolean; user: User | null; onClose: () => void; onUpdated: (user: User) => void }) {
  const [name, setName] = useState("");
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [visivel, setVisivel] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setName(user?.name ?? ""); setAtual(""); setNova(""); setConfirmar(""); setErrors({}); setError(""); setVisivel(false); }
  }, [open, user]);

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Informe seu nome.";
    if (nova || confirmar || atual) {
      if (!atual) next.atual = "Informe a senha atual.";
      if (nova.length < 6) next.nova = "A nova senha deve ter pelo menos 6 caracteres.";
      else if (nova === atual) next.nova = "A nova senha deve ser diferente da atual.";
      if (confirmar !== nova || !confirmar) next.confirmar = "A confirmação deve ser igual à nova senha.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    if (name.trim() === user.name && !nova) { onClose(); return; }
    setSaving(true); setError("");
    try {
      const result = await atualizarPerfil({ ...(name.trim() !== user.name ? { name: name.trim() } : {}), ...(nova ? { senhaAtual: atual, novaSenha: nova, confirmarSenha: confirmar } : {}) });
      updateStoredUser(result.user);
      onUpdated(result.user);
      onClose();
      toast.success("Perfil atualizado!");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o perfil."); }
    finally { setSaving(false); }
  }

  return <Modal open={open} onClose={() => { if (!saving) onClose(); }} title="Meu perfil">
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <Input label="Nome" aria-label="Nome" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <div className="border-t border-brand-gold/10 pt-4"><h3 className="font-poppins font-semibold text-brand-text">Alterar senha <span className="font-normal text-sm text-brand-text/50">(opcional)</span></h3><p className="mt-1 text-sm text-brand-text/50">Preencha os campos para trocar sua senha.</p></div>
      <Input label="Senha atual" aria-label="Senha atual" type={visivel ? "text" : "password"} autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} error={errors.atual} />
      <Input label="Nova senha" aria-label="Nova senha" type={visivel ? "text" : "password"} autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} error={errors.nova} />
      <Input label="Confirmar nova senha" aria-label="Confirmar nova senha" type={visivel ? "text" : "password"} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} error={errors.confirmar} />
      <button type="button" onClick={() => setVisivel(!visivel)} className="flex items-center gap-2 self-start rounded text-sm text-brand-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold">{visivel ? <EyeOff size={16} /> : <Eye size={16} />}{visivel ? "Ocultar senhas" : "Mostrar senhas"}</button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="submit" loading={saving}>Salvar</Button></div>
    </form>
  </Modal>;
}

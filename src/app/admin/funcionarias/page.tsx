"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, UserCheck, Pencil } from "lucide-react";
import { Funcionaria } from "@/types";
import { createFuncionaria, updateFuncionaria, deleteFuncionaria, getFuncionarias } from "@/lib/api";
import { mockFuncionarias } from "@/lib/mocks";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import toast from "react-hot-toast";

export default function FuncionariasPage() {
  const [funcionarias, setFuncionarias] = useState<Funcionaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", senha: "" });
  const [formErrors, setFormErrors] = useState<Partial<typeof form>>({});

  // Edição
  const [editando, setEditando] = useState<Funcionaria | null>(null);
  const [formEdit, setFormEdit] = useState({ name: "", email: "", senha: "", ativo: true });
  const [formErrorsEdit, setFormErrorsEdit] = useState<Partial<typeof formEdit>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    getFuncionarias()
      .catch(() => mockFuncionarias)
      .then(setFuncionarias)
      .finally(() => setLoading(false));
  }, []);

  function validateForm() {
    const errs: Partial<typeof form> = {};
    if (!form.name.trim()) errs.name = "Nome é obrigatório.";
    if (!form.email.trim()) errs.email = "E-mail é obrigatório.";
    if (!form.senha.trim()) errs.senha = "Senha é obrigatória.";
    else if (form.senha.length < 6) errs.senha = "Mínimo 6 caracteres.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreate() {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const nova = await createFuncionaria(form).catch(() => ({
        id: String(Date.now()),
        name: form.name,
        email: form.email,
        ativo: true,
      }));
      setFuncionarias((prev) => [...prev, nova]);
      toast.success("Funcionária cadastrada com sucesso!");
      setShowModal(false);
      setForm({ name: "", email: "", senha: "" });
    } catch {
      toast.error("Erro ao cadastrar funcionária.");
    } finally {
      setSaving(false);
    }
  }

  function handleAbrirEdicao(f: Funcionaria) {
    setEditando(f);
    setFormEdit({
      name: f.name,
      email: f.email,
      senha: "",
      ativo: f.ativo ?? true,
    });
    setFormErrorsEdit({});
  }

  async function handleAtualizar() {
    if (!editando) return;
    const errs: Partial<typeof formEdit> = {};
    if (!formEdit.name.trim()) errs.name = "Nome é obrigatório.";
    if (!formEdit.email.trim()) errs.email = "E-mail é obrigatório.";
    if (formEdit.senha && formEdit.senha.length < 6) errs.senha = "Mínimo 6 caracteres.";
    setFormErrorsEdit(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingEdit(true);
    try {
      const atualizada = await updateFuncionaria(editando.id, {
        name: formEdit.name.trim(),
        email: formEdit.email.trim(),
        senha: formEdit.senha ? formEdit.senha : undefined,
        active: formEdit.ativo,
      }).catch(() => ({
        ...editando,
        name: formEdit.name.trim(),
        email: formEdit.email.trim(),
        ativo: formEdit.ativo,
      }));

      setFuncionarias((prev) =>
        prev.map((f) => (f.id === editando.id ? { ...f, ...atualizada } : f))
      );
      toast.success("Funcionária atualizada com sucesso!");
      setEditando(null);
    } catch {
      toast.error("Erro ao atualizar funcionária.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFuncionaria(id).catch(() => {});
      setFuncionarias((prev) => prev.filter((f) => f.id !== id));
      toast.success("Funcionária removida.");
    } catch {
      toast.error("Erro ao remover.");
    } finally {
      setShowDeleteId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-brand-text">Funcionárias</h1>
          <p className="text-sm text-brand-text/50 mt-1">Gerencie a equipe</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="md">
          <Plus size={16} /> Nova Funcionária
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse shadow-card" />
          ))}
        </div>
      ) : funcionarias.length === 0 ? (
        <div className="text-center py-16 text-brand-text/40">
          <UserCheck size={40} className="mx-auto mb-3 opacity-30" strokeWidth={1} />
          <p className="font-inter">Nenhuma funcionária cadastrada.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {funcionarias.map((f) => (
            <div
              key={f.id}
              onClick={() => handleAbrirEdicao(f)}
              className="bg-white rounded-xl px-5 py-4 flex items-center gap-4 shadow-card border border-brand-gold/8 hover:border-brand-gold/30 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-brand-rose/20 group-hover:bg-brand-gold/20 flex items-center justify-center shrink-0 transition-colors">
                <span className="text-sm font-semibold text-brand-rose group-hover:text-brand-gold-dark transition-colors">
                  {f.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-poppins font-semibold text-brand-text truncate group-hover:text-brand-gold-dark transition-colors">{f.name}</p>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand-bg text-brand-text/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    Editar
                  </span>
                </div>
                <p className="text-xs text-brand-text/50 truncate">{f.email}</p>
              </div>
              <Badge label={f.ativo ? "Ativa" : "Inativa"} variant={f.ativo ? "mint" : "gray"} />
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleAbrirEdicao(f)}
                  className="p-2 rounded-full text-brand-gold hover:text-brand-gold-dark hover:bg-brand-gold/10 transition-all"
                  title="Editar funcionária"
                >
                  <Pencil size={15} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setShowDeleteId(f.id)}
                  className="p-2 rounded-full text-brand-text/30 hover:text-red-500 hover:bg-red-50 transition-all"
                  title="Remover funcionária"
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Funcionária */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setFormErrors({}); }} title="Nova Funcionária">
        <div className="flex flex-col gap-4">
          <Input
            label="Nome completo"
            value={form.name}
            onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setFormErrors((p) => ({ ...p, name: undefined })); }}
            error={formErrors.name}
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); setFormErrors((p) => ({ ...p, email: undefined })); }}
            error={formErrors.email}
            required
          />
          <Input
            label="Senha temporária"
            type="password"
            value={form.senha}
            onChange={(e) => { setForm((p) => ({ ...p, senha: e.target.value })); setFormErrors((p) => ({ ...p, senha: undefined })); }}
            error={formErrors.senha}
            hint="Mínimo 6 caracteres"
            required
          />
          <div className="flex gap-3 mt-2 justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={saving}>Cadastrar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Funcionária */}
      <Modal open={!!editando} onClose={() => { setEditando(null); setFormErrorsEdit({}); }} title="Editar Funcionária">
        <div className="flex flex-col gap-4">
          <Input
            label="Nome completo"
            value={formEdit.name}
            onChange={(e) => { setFormEdit((p) => ({ ...p, name: e.target.value })); setFormErrorsEdit((p) => ({ ...p, name: undefined })); }}
            error={formErrorsEdit.name}
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={formEdit.email}
            onChange={(e) => { setFormEdit((p) => ({ ...p, email: e.target.value })); setFormErrorsEdit((p) => ({ ...p, email: undefined })); }}
            error={formErrorsEdit.email}
            required
          />
          <Input
            label="Nova senha"
            type="password"
            value={formEdit.senha}
            onChange={(e) => { setFormEdit((p) => ({ ...p, senha: e.target.value })); setFormErrorsEdit((p) => ({ ...p, senha: undefined })); }}
            error={formErrorsEdit.senha}
            hint="Deixe em branco para manter a senha atual"
            placeholder="Nova senha (opcional)"
          />
          <div>
            <label className="text-sm font-medium font-poppins text-brand-text/80 block mb-1.5">Status</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormEdit((p) => ({ ...p, ativo: true }))}
                className={`px-4 py-2 rounded-xl text-xs font-semibold font-poppins transition-colors ${
                  formEdit.ativo
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 text-brand-text/60 hover:bg-gray-200"
                }`}
              >
                Ativa
              </button>
              <button
                type="button"
                onClick={() => setFormEdit((p) => ({ ...p, ativo: false }))}
                className={`px-4 py-2 rounded-xl text-xs font-semibold font-poppins transition-colors ${
                  !formEdit.ativo
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 text-brand-text/60 hover:bg-gray-200"
                }`}
              >
                Inativa
              </button>
            </div>
          </div>
          <div className="flex gap-3 mt-2 justify-end">
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={handleAtualizar} loading={savingEdit}>Salvar Alterações</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar exclusão */}
      <Modal open={!!showDeleteId} onClose={() => setShowDeleteId(null)} title="Confirmar exclusão" size="sm">
        <p className="text-sm text-brand-text/70 mb-6">
          Tem certeza que deseja remover esta funcionária? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => showDeleteId && handleDelete(showDeleteId)}>
            Remover
          </Button>
        </div>
      </Modal>
    </div>
  );
}

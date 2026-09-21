"use client";

import { useEffect, useState } from "react";
import {
  Search, UserCircle, Clock, X, ChevronDown, ChevronUp,
  Image as ImageIcon, Plus, Trash2, Pencil,
} from "lucide-react";
import { Cliente, HistoricoCliente, HistoricoPedido } from "@/types";
import { searchClientes, getHistoricoCliente, createCliente, updateCliente, deleteCliente } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { maskCpfCnpj, maskWhatsapp, maskCep, unmask, formatCurrency, formatDate } from "@/lib/masks";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const FORM_EMPTY = {
  nome: "", cpfCnpj: "", whatsapp: "", logradouro: "", numero: "",
  complemento: "", bairro: "", cidade: "", estado: "", cep: "", preferencias: "",
};

function fotoSrc(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
}

function PecasFotos({ pecas }: { pecas: HistoricoPedido["pecas"] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!pecas || pecas.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {pecas.map((p, i) => {
          const src = fotoSrc(p.fotoUrl);
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              {src ? (
                <button
                  onClick={() => setLightbox(src)}
                  className="w-14 h-14 rounded-lg overflow-hidden border border-brand-gold/20 hover:border-brand-gold/60 transition-colors"
                >
                  <img src={src} alt={p.descricao} className="w-full h-full object-cover" />
                </button>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-brand-bg border border-brand-gold/10 flex items-center justify-center">
                  <ImageIcon size={18} className="text-brand-text/20" />
                </div>
              )}
              <span className="text-[10px] text-brand-text/50 text-center max-w-[56px] truncate">{p.descricao}</span>
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <X size={28} />
          </button>
          <img
            src={lightbox}
            alt="Foto da peça"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function PedidoCard({ pedido }: { pedido: HistoricoPedido }) {
  const [expanded, setExpanded] = useState(false);
  const temFotos = pedido.pecas.some((p) => p.fotoUrl);

  return (
    <div className="rounded-xl bg-brand-bg border border-brand-gold/8 overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div>
          <p className="text-sm font-inter text-brand-text">{formatDate(pedido.data)}</p>
          {pedido.funcionaria && <p className="text-xs text-brand-text/40">{pedido.funcionaria}</p>}
          {pedido.pecas.length > 0 && (
            <p className="text-xs text-brand-text/50 mt-0.5">
              {pedido.pecas.length} peça{pedido.pecas.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-brand-gold font-poppins">{formatCurrency(pedido.total)}</span>
          {pedido.pdfUrl && (
            <a
              href={pedido.pdfUrl.startsWith("http") ? pedido.pdfUrl : `${BASE_URL}${pedido.pdfUrl}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-rose underline"
              onClick={(e) => e.stopPropagation()}
            >
              PDF
            </a>
          )}
          {pedido.pecas.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-brand-text/30 hover:text-brand-gold transition-colors"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {expanded && pedido.pecas.length > 0 && (
        <div className="border-t border-brand-gold/8 px-3 pb-3">
          {temFotos ? (
            <PecasFotos pecas={pedido.pecas} />
          ) : (
            <div className="flex flex-col gap-1 mt-2">
              {pedido.pecas.map((p, i) => (
                <p key={i} className="text-xs text-brand-text/60">
                  {p.descricao}{p.tamanho ? ` – ${p.tamanho}` : ""}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientesView() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Histórico
  const [historico, setHistorico] = useState<{ cliente: Cliente; data: HistoricoCliente } | null>(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // Novo cliente
  const [showNovo, setShowNovo] = useState(false);
  const [form, setForm] = useState(FORM_EMPTY);
  const [formErrors, setFormErrors] = useState<Partial<typeof FORM_EMPTY>>({});
  const [saving, setSaving] = useState(false);

  // Edição de cliente
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [formEdit, setFormEdit] = useState(FORM_EMPTY);
  const [formErrorsEdit, setFormErrorsEdit] = useState<Partial<typeof FORM_EMPTY>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Confirmação de delete
  const [confirmDelete, setConfirmDelete] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    setIsAdmin(user?.role === "admin");
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await searchClientes("").catch(() => [] as Cliente[]);
    setClientes(data);
    setLoading(false);
  }

  async function handleVerHistorico(c: Cliente) {
    setLoadingHistorico(true);
    const data = await getHistoricoCliente(c.id).catch(() => ({ pedidos: [], itensEmpresa: undefined }));
    setHistorico({ cliente: c, data });
    setLoadingHistorico(false);
  }

  function validateForm() {
    const errs: Partial<typeof FORM_EMPTY> = {};
    if (!form.nome.trim()) errs.nome = "Nome é obrigatório.";
    if (!form.whatsapp.trim()) errs.whatsapp = "WhatsApp é obrigatório.";
    else if (unmask(form.whatsapp).length < 10) errs.whatsapp = "WhatsApp inválido.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSalvar() {
    if (!validateForm()) return;
    setSaving(true);
    try {
      await createCliente({
        nome: form.nome.trim(),
        cpfCnpj: unmask(form.cpfCnpj) || undefined,
        whatsapp: form.whatsapp.trim(),
        logradouro: form.logradouro || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        bairro: form.bairro || undefined,
        cidade: form.cidade || undefined,
        estado: form.estado || undefined,
        cep: unmask(form.cep) || undefined,
        preferencias: form.preferencias ? form.preferencias.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      toast.success("Cliente cadastrado!");
      setShowNovo(false);
      setForm(FORM_EMPTY);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar cliente.");
    } finally {
      setSaving(false);
    }
  }

  function handleAbrirEdicao(c: Cliente) {
    setClienteEditando(c);
    setFormEdit({
      nome: c.nome || "",
      cpfCnpj: c.cpfCnpj ? maskCpfCnpj(c.cpfCnpj) : "",
      whatsapp: c.whatsapp ? maskWhatsapp(c.whatsapp) : "",
      logradouro: c.logradouro || "",
      numero: c.numero || "",
      complemento: c.complemento || "",
      bairro: c.bairro || "",
      cidade: c.cidade || "",
      estado: c.estado || "",
      cep: c.cep ? maskCep(c.cep) : "",
      preferencias: Array.isArray(c.preferencias) ? c.preferencias.join(", ") : (c.preferencias || ""),
    });
    setFormErrorsEdit({});
  }

  async function handleAtualizar() {
    if (!clienteEditando) return;
    const errs: Partial<typeof FORM_EMPTY> = {};
    if (!formEdit.nome.trim()) errs.nome = "Nome é obrigatório.";
    if (!formEdit.whatsapp.trim()) errs.whatsapp = "WhatsApp é obrigatório.";
    else if (unmask(formEdit.whatsapp).length < 10) errs.whatsapp = "WhatsApp inválido.";
    setFormErrorsEdit(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingEdit(true);
    try {
      const atualizado = await updateCliente(clienteEditando.id, {
        nome: formEdit.nome.trim(),
        cpfCnpj: unmask(formEdit.cpfCnpj) || undefined,
        whatsapp: formEdit.whatsapp.trim(),
        logradouro: formEdit.logradouro || undefined,
        numero: formEdit.numero || undefined,
        complemento: formEdit.complemento || undefined,
        bairro: formEdit.bairro || undefined,
        cidade: formEdit.cidade || undefined,
        estado: formEdit.estado || undefined,
        cep: unmask(formEdit.cep) || undefined,
        preferencias: formEdit.preferencias ? formEdit.preferencias.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      toast.success("Cliente atualizado com sucesso!");
      setClientes((prev) => prev.map((c) => (c.id === clienteEditando.id ? { ...c, ...atualizado } : c)));
      setClienteEditando(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar cliente.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteCliente(confirmDelete.id);
      toast.success("Cliente removido.");
      setConfirmDelete(null);
      setClientes((prev) => prev.filter((c) => c.id !== confirmDelete.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover cliente.");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = clientes.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.nome.toLowerCase().includes(s) || c.whatsapp.includes(s);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-brand-text">Clientes</h1>
          <p className="text-sm text-brand-text/50 mt-1">Base de clientes cadastrados</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setForm(FORM_EMPTY); setFormErrors({}); setShowNovo(true); }}>
            <Plus size={16} /> Novo Cliente
          </Button>
        )}
      </div>

      <Input
        placeholder="Buscar por nome ou WhatsApp..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search size={15} />}
      />

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse shadow-card" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => handleAbrirEdicao(c)}
              className="bg-white rounded-xl px-5 py-4 flex items-center gap-4 shadow-card border border-brand-gold/8 hover:border-brand-gold/30 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-brand-rose/15 group-hover:bg-brand-gold/20 flex items-center justify-center shrink-0 transition-colors">
                <span className="font-semibold text-brand-rose group-hover:text-brand-gold-dark transition-colors">{c.nome.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-poppins font-semibold text-brand-text truncate group-hover:text-brand-gold-dark transition-colors">{c.nome}</p>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand-bg text-brand-text/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    Editar
                  </span>
                </div>
                <p className="text-xs text-brand-text/50">{c.whatsapp}</p>
                {(c.cidade || c.bairro) && (
                  <p className="text-xs text-brand-text/40">
                    {[c.bairro, c.cidade, c.estado].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleAbrirEdicao(c)}
                  className="flex items-center gap-1 text-sm text-brand-gold hover:text-brand-gold-dark font-poppins px-2 py-1 rounded-lg hover:bg-brand-gold/10 transition-colors"
                  title="Editar dados do cliente"
                >
                  <Pencil size={14} strokeWidth={1.5} />
                  Editar
                </button>
                {isAdmin && (
                <button
                  onClick={() => handleVerHistorico(c)}
                  disabled={loadingHistorico}
                  className="flex items-center gap-1.5 text-sm text-brand-text/60 hover:text-brand-text font-poppins px-2 py-1 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-50"
                >
                  <Clock size={15} strokeWidth={1.5} />
                  Histórico
                </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setConfirmDelete(c)}
                    className="p-1.5 rounded-lg text-brand-text/30 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remover cliente"
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-brand-text/40">
              <UserCircle size={40} className="mx-auto mb-3 opacity-30" strokeWidth={1} />
              <p className="font-inter">Nenhum cliente encontrado.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Histórico */}
      <Modal
        open={!!historico}
        onClose={() => setHistorico(null)}
        title={historico ? `Histórico – ${historico.cliente.nome}` : ""}
        size="lg"
      >
        {historico && (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-brand-text/50 font-inter">
              {historico.data.pedidos.length} pedido{historico.data.pedidos.length !== 1 ? "s" : ""} no total
            </div>
            {historico.data.pedidos.length === 0 ? (
              <p className="text-sm text-brand-text/40 text-center py-6">Nenhum pedido anterior.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {historico.data.pedidos.map((p) => (
                  <PedidoCard key={p.id} pedido={p} />
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Novo Cliente */}
      <Modal open={showNovo} onClose={() => setShowNovo(false)} title="Cadastrar Novo Cliente" size="xl">
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Nome completo / Razão Social"
            value={form.nome}
            onChange={(e) => { setForm((p) => ({ ...p, nome: e.target.value })); setFormErrors((p) => ({ ...p, nome: undefined })); }}
            error={formErrors.nome}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="CPF / CNPJ"
              value={form.cpfCnpj}
              onChange={(e) => setForm((p) => ({ ...p, cpfCnpj: maskCpfCnpj(e.target.value) }))}
              placeholder="000.000.000-00"
              maxLength={18}
            />
            <Input
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(e) => { setForm((p) => ({ ...p, whatsapp: maskWhatsapp(e.target.value) })); setFormErrors((p) => ({ ...p, whatsapp: undefined })); }}
              error={formErrors.whatsapp}
              placeholder="(11) 99999-9999"
              maxLength={15}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Logradouro" value={form.logradouro} onChange={(e) => setForm((p) => ({ ...p, logradouro: e.target.value }))} />
            </div>
            <Input label="Número" value={form.numero} onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Complemento" value={form.complemento} onChange={(e) => setForm((p) => ({ ...p, complemento: e.target.value }))} />
            <Input label="Bairro" value={form.bairro} onChange={(e) => setForm((p) => ({ ...p, bairro: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="CEP" value={form.cep} onChange={(e) => setForm((p) => ({ ...p, cep: maskCep(e.target.value) }))} placeholder="00000-000" maxLength={9} />
            <Input label="Cidade" value={form.cidade} onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))} />
            <div>
              <label className="text-sm font-medium font-poppins text-brand-text/80 block mb-1.5">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}
                className="w-full rounded-xl border border-brand-gold/20 bg-white px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
              >
                <option value="">UF</option>
                {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
          <Input
            label="Preferências especiais"
            value={form.preferencias}
            onChange={(e) => setForm((p) => ({ ...p, preferencias: e.target.value }))}
            placeholder="Cabides, Sem amaciante, ... (separadas por vírgula)"
            hint="Separe as preferências por vírgula"
          />
          <div className="flex gap-3 mt-2 justify-end">
            <Button variant="outline" onClick={() => setShowNovo(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} loading={saving}>Cadastrar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Cliente */}
      <Modal
        open={!!clienteEditando}
        onClose={() => setClienteEditando(null)}
        title={clienteEditando ? `Editar Cliente – ${clienteEditando.nome}` : "Editar Cliente"}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nome completo"
            value={formEdit.nome}
            onChange={(e) => { setFormEdit((p) => ({ ...p, nome: e.target.value })); setFormErrorsEdit((p) => ({ ...p, nome: undefined })); }}
            error={formErrorsEdit.nome}
            placeholder="Nome do cliente"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="CPF / CNPJ"
              value={formEdit.cpfCnpj}
              onChange={(e) => setFormEdit((p) => ({ ...p, cpfCnpj: maskCpfCnpj(e.target.value) }))}
              placeholder="000.000.000-00"
              maxLength={18}
            />
            <Input
              label="WhatsApp"
              value={formEdit.whatsapp}
              onChange={(e) => { setFormEdit((p) => ({ ...p, whatsapp: maskWhatsapp(e.target.value) })); setFormErrorsEdit((p) => ({ ...p, whatsapp: undefined })); }}
              error={formErrorsEdit.whatsapp}
              placeholder="(11) 99999-9999"
              maxLength={15}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Logradouro" value={formEdit.logradouro} onChange={(e) => setFormEdit((p) => ({ ...p, logradouro: e.target.value }))} />
            </div>
            <Input label="Número" value={formEdit.numero} onChange={(e) => setFormEdit((p) => ({ ...p, numero: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Complemento" value={formEdit.complemento} onChange={(e) => setFormEdit((p) => ({ ...p, complemento: e.target.value }))} />
            <Input label="Bairro" value={formEdit.bairro} onChange={(e) => setFormEdit((p) => ({ ...p, bairro: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="CEP" value={formEdit.cep} onChange={(e) => setFormEdit((p) => ({ ...p, cep: maskCep(e.target.value) }))} placeholder="00000-000" maxLength={9} />
            <Input label="Cidade" value={formEdit.cidade} onChange={(e) => setFormEdit((p) => ({ ...p, cidade: e.target.value }))} />
            <div>
              <label className="text-sm font-medium font-poppins text-brand-text/80 block mb-1.5">Estado</label>
              <select
                value={formEdit.estado}
                onChange={(e) => setFormEdit((p) => ({ ...p, estado: e.target.value }))}
                className="w-full rounded-xl border border-brand-gold/20 bg-white px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
              >
                <option value="">UF</option>
                {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
          <Input
            label="Preferências especiais"
            value={formEdit.preferencias}
            onChange={(e) => setFormEdit((p) => ({ ...p, preferencias: e.target.value }))}
            placeholder="Cabides, Sem amaciante, ... (separadas por vírgula)"
            hint="Separe as preferências por vírgula"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-gold/10">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  const c = clienteEditando;
                  setClienteEditando(null);
                  setConfirmDelete(c);
                }}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-poppins font-medium transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={14} />
                Excluir cliente
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setClienteEditando(null)}>Cancelar</Button>
              <Button onClick={handleAtualizar} loading={savingEdit}>Salvar Alterações</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Delete */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remover cliente"
        size="sm"
      >
        {confirmDelete && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-brand-text/70 font-inter">
              Tem certeza que deseja remover <strong className="text-brand-text">{confirmDelete.nome}</strong>?
              Esta ação não pode ser desfeita e todos os pedidos vinculados serão perdidos.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-poppins font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Removendo..." : "Sim, remover"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

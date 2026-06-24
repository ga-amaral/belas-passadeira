"use client";

import { useState, useCallback } from "react";
import { Search, Plus, Clock, ChevronRight, User } from "lucide-react";
import { Cliente } from "@/types";
import { searchClientes, createCliente, getHistoricoCliente } from "@/lib/api";
import { mockClientes, mockHistorico, delay } from "@/lib/mocks";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { maskCpfCnpj, maskWhatsapp, maskCep, unmask, formatCurrency, formatDate } from "@/lib/masks";
import toast from "react-hot-toast";

interface Props {
  onSelect: (cliente: Cliente) => void;
}

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function Step1Cliente({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [showNovo, setShowNovo] = useState(false);
  const [showHistorico, setShowHistorico] = useState<{ cliente: Cliente; data: typeof mockHistorico } | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome: "", cpfCnpj: "", whatsapp: "", logradouro: "", numero: "",
    complemento: "", bairro: "", cidade: "", estado: "", cep: "", preferencias: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<typeof form>>({});

  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados([]); return; }
    setBuscando(true);
    const data = await searchClientes(q).catch(async () => {
      await delay(400);
      return mockClientes.filter(
        (c) => c.nome.toLowerCase().includes(q.toLowerCase()) || c.whatsapp.includes(q)
      );
    });
    setResultados(data);
    setBuscando(false);
  }, []);

  function handleQuery(v: string) {
    setQuery(v);
    buscar(v);
  }

  async function handleVerHistorico(c: Cliente, e: React.MouseEvent) {
    e.stopPropagation();
    const data = await getHistoricoCliente(c.id).catch(async () => { await delay(400); return mockHistorico; });
    setShowHistorico({ cliente: c, data });
  }

  function validateForm() {
    const errs: Partial<typeof form> = {};
    if (!form.nome.trim()) errs.nome = "Nome é obrigatório.";
    if (!form.whatsapp.trim()) errs.whatsapp = "WhatsApp é obrigatório.";
    else if (unmask(form.whatsapp).length < 10) errs.whatsapp = "WhatsApp inválido.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSalvar() {
    if (!validateForm()) return;
    setSaving(true);
    let cliente: Cliente;
    try {
      cliente = await createCliente({
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
    } catch {
      // Fallback local caso a API falhe
      cliente = {
        id: String(Date.now()),
        nome: form.nome.trim(),
        whatsapp: form.whatsapp.trim(),
        cpfCnpj: form.cpfCnpj || undefined,
        bairro: form.bairro || undefined,
        cidade: form.cidade || undefined,
        estado: form.estado || undefined,
      };
    }
    toast.success("Cliente cadastrado!");
    setShowNovo(false);
    setSaving(false);
    onSelect(cliente);
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">
      <div className="text-center mb-2">
        <h2 className="text-xl font-poppins font-bold text-brand-text">Selecionar Cliente</h2>
        <p className="text-sm text-brand-text/50 mt-1">Busque pelo nome ou WhatsApp</p>
      </div>

      {/* Busca */}
      <div className="relative">
        <Input
          placeholder="Nome ou WhatsApp do cliente..."
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          leftIcon={<Search size={16} className={buscando ? "animate-pulse text-brand-gold" : ""} />}
        />
        {resultados.length > 0 && query.length >= 2 && (
          <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-gold-md border border-brand-gold/15 z-20 overflow-hidden">
            {resultados.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-gold/5 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-brand-rose/15 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-brand-rose">{c.nome.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-poppins font-semibold text-brand-text text-sm truncate">{c.nome}</p>
                  <p className="text-xs text-brand-text/40">{c.whatsapp}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleVerHistorico(c, e)}
                    className="p-1 rounded hover:bg-brand-gold/10 text-brand-text/40 hover:text-brand-gold"
                    title="Ver histórico"
                  >
                    <Clock size={14} strokeWidth={1.5} />
                  </button>
                  <ChevronRight size={14} className="text-brand-text/30" />
                </div>
              </button>
            ))}
          </div>
        )}
        {query.length >= 2 && resultados.length === 0 && !buscando && (
          <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-gold-md border border-brand-gold/15 z-20 p-4 text-center">
            <p className="text-sm text-brand-text/50">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-brand-gold/10" />
        <span className="text-xs text-brand-text/40 font-inter">ou</span>
        <div className="flex-1 h-px bg-brand-gold/10" />
      </div>

      <Button variant="outline" fullWidth onClick={() => setShowNovo(true)}>
        <Plus size={16} /> Novo Cliente
      </Button>

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
            <div className="col-span-1">
              <Input label="CEP" value={form.cep} onChange={(e) => setForm((p) => ({ ...p, cep: maskCep(e.target.value) }))} placeholder="00000-000" maxLength={9} />
            </div>
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

      {/* Modal Histórico */}
      <Modal open={!!showHistorico} onClose={() => setShowHistorico(null)} title={showHistorico ? `Histórico – ${showHistorico.cliente.nome}` : ""} size="lg">
        {showHistorico && (
          <div className="flex flex-col gap-4">
            {showHistorico.data.itensEmpresa && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-brand-bg border border-brand-gold/8 text-center">
                  <p className="text-2xl font-bold font-poppins text-brand-gold">{showHistorico.data.itensEmpresa.sacos ?? 0}</p>
                  <p className="text-xs text-brand-text/50">Sacos utilizados</p>
                </div>
                <div className="p-3 rounded-xl bg-brand-bg border border-brand-gold/8 text-center">
                  <p className="text-2xl font-bold font-poppins text-brand-rose">{showHistorico.data.itensEmpresa.cabides ?? 0}</p>
                  <p className="text-xs text-brand-text/50">Cabides utilizados</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-poppins font-semibold text-brand-text/70 mb-2">Últimos pedidos</p>
              {showHistorico.data.pedidos.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-brand-bg border border-brand-gold/8 mb-2">
                  <p className="text-sm font-inter text-brand-text">{formatDate(p.data)}</p>
                  <span className="font-semibold text-brand-gold">{formatCurrency(p.total)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { onSelect(showHistorico.cliente); setShowHistorico(null); }}>
                <User size={15} /> Selecionar este cliente
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

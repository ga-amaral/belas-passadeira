"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, LoaderCircle, PackageSearch, Search, Upload, UserRound, X } from "lucide-react";
import type { Cliente, PecaPerdida } from "@/types";
import { searchClientes, searchPecasPerdidas, searchPecasPerdidasPorImagem } from "@/lib/api";
import { formatDate } from "@/lib/masks";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

export default function PerdidosView() {
  const [clienteQuery, setClienteQuery] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [erroClientes, setErroClientes] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pecas, setPecas] = useState<PecaPerdida[]>([]);
  const [buscando, setBuscando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<"texto" | "imagem">("texto");
  const [limitado, setLimitado] = useState(false);
  const [fotoBuscada, setFotoBuscada] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<{ url: string; descricao: string } | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const fotoPreview = useObjectUrl(foto);

  useEffect(() => {
    const normalized = clienteQuery.trim();
    if (cliente || normalized.length < 2) {
      setClientes([]);
      setErroClientes(null);
      setBuscandoClientes(false);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setBuscandoClientes(true);
      setErroClientes(null);
      try {
        const result = await searchClientes(normalized);
        if (active) setClientes(result);
      } catch (cause) {
        if (active) {
          setClientes([]);
          setErroClientes(cause instanceof Error ? cause.message : "Não foi possível buscar clientes.");
        }
      } finally {
        if (active) setBuscandoClientes(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [clienteQuery, cliente]);

  useEffect(() => {
    if (modo !== "texto") return;

    const requestId = ++requestIdRef.current;
    let active = true;
    setBuscando(true);
    const timeout = window.setTimeout(async () => {
      setBuscando(true);
      setErro(null);
      try {
        const result = await searchPecasPerdidas(cliente?.id, query);
        if (active && requestId === requestIdRef.current) setPecas(result);
      } catch (cause) {
        if (active && requestId === requestIdRef.current) {
          setPecas([]);
          setErro(cause instanceof Error ? cause.message : "Não foi possível buscar as peças.");
        }
      } finally {
        if (active && requestId === requestIdRef.current) setBuscando(false);
      }
    }, query.trim() ? 350 : 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [cliente, query, modo]);

  function selecionarCliente(selecionado: Cliente) {
    requestIdRef.current += 1;
    setCliente(selecionado);
    setClienteQuery(selecionado.nome);
    setQuery("");
    setModo("texto");
    setFoto(null);
    setPecas([]);
    setErro(null);
    setLimitado(false);
    setFotoBuscada(false);
  }

  function trocarCliente() {
    requestIdRef.current += 1;
    setCliente(null);
    setClienteQuery("");
    setQuery("");
    setFoto(null);
    setPecas([]);
    setErro(null);
    setBuscando(false);
    setModo("texto");
    setLimitado(false);
    setFotoBuscada(false);
  }

  function handleFoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErro("Escolha um arquivo de imagem para buscar a peça.");
      return;
    }
    requestIdRef.current += 1;
    setFoto(file);
    setModo("imagem");
    setPecas([]);
    setErro(null);
    setBuscando(false);
    setLimitado(false);
    setFotoBuscada(false);
  }

  async function buscarPorFoto() {
    if (!foto || buscando) return;
    const requestId = ++requestIdRef.current;
    setBuscando(true);
    setErro(null);
    setPecas([]);
    try {
      const result = await searchPecasPerdidasPorImagem(foto, cliente?.id);
      if (requestId === requestIdRef.current) { setPecas(result.pecas); setLimitado(!cliente && !!result.limitado); setFotoBuscada(true); }
    } catch (cause) {
      if (requestId === requestIdRef.current) {
        setErro(cause instanceof Error ? cause.message : "Não foi possível buscar pela foto.");
      }
    } finally {
      if (requestId === requestIdRef.current) setBuscando(false);
    }
  }

  function limparFoto() {
    requestIdRef.current += 1;
    setFoto(null);
    setModo("texto");
    setPecas([]);
    setErro(null);
    setBuscando(false);
    setLimitado(false);
    setFotoBuscada(false);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
      <header className="max-w-2xl">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gold/10 text-brand-gold">
          <PackageSearch size={23} strokeWidth={1.7} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold font-poppins text-brand-text sm:text-3xl">Localizar peça perdida</h1>
        <p className="mt-2 text-sm leading-6 text-brand-text/60 sm:text-base">
          Procure peças de pedidos concluídos por descrição ou foto. Se quiser, filtre por cliente.
        </p>
      </header>

      <section aria-labelledby="cliente-heading" className="rounded-2xl border border-brand-gold/15 bg-white p-4 shadow-card sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold"><UserRound size={17} /></span>
          <div>
            <h2 id="cliente-heading" className="font-poppins font-semibold text-brand-text">Filtrar por cliente (opcional)</h2>
            <p className="text-xs text-brand-text/50">Busque pelo nome do cliente</p>
          </div>
        </div>

        {cliente ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-gold/15 bg-brand-bg/60 p-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-gold">
                <UserRound size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-poppins font-semibold text-brand-text">{cliente.nome}</p>
                <p className="text-xs text-brand-text/50">Cliente selecionado</p>
              </div>
            </div>
            <button type="button" onClick={trocarCliente} className="min-h-10 rounded-lg px-3 text-sm font-medium text-brand-gold hover:bg-brand-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">
              Trocar / limpar cliente
            </button>
          </div>
        ) : (
          <div className="relative">
            <p className="mb-3 inline-flex rounded-full bg-brand-gold/10 px-3 py-1 text-sm font-medium text-brand-gold">Todos os clientes</p>
            <Input
              label="Nome do cliente"
              placeholder="Digite pelo menos 2 letras..."
              aria-label="Nome do cliente"
              value={clienteQuery}
              onChange={(event) => {
                setClienteQuery(event.target.value);
                setClientes([]);
                setErroClientes(null);
              }}
              leftIcon={<Search size={16} aria-hidden="true" />}
              autoComplete="off"
            />
            {buscandoClientes && <p className="mt-2 text-xs text-brand-text/50">Buscando clientes...</p>}
            {erroClientes && <p role="alert" className="mt-2 text-sm text-red-700">{erroClientes}</p>}
            {clientes.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-brand-gold/15 bg-white p-1 shadow-gold-md" aria-label="Resultados de clientes">
                {clientes.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => selecionarCliente(item)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-brand-gold/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">
                      <span className="truncate font-medium text-brand-text">{item.nome}</span>
                      <span className="shrink-0 text-xs text-brand-text/45">{item.whatsapp}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!buscandoClientes && clienteQuery.trim().length >= 2 && clientes.length === 0 && !erroClientes && (
              <p className="mt-2 text-sm text-brand-text/55">Nenhum cliente encontrado com esse nome.</p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="peca-heading" className="rounded-2xl border border-brand-gold/15 bg-white p-4 shadow-card sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold"><Search size={17} /></span>
          <div>
            <h2 id="peca-heading" className="font-poppins font-semibold text-brand-text">Qual peça vamos procurar?</h2>
            <p className="text-xs text-brand-text/50">Pesquise por descrição ou use uma foto</p>
          </div>
        </div>

        <fieldset className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label="Descrição da peça"
                placeholder="Ex.: toalha de banho, lençol..."
                aria-label="Descrição da peça"
                value={query}
                onChange={(event) => {
                  requestIdRef.current += 1;
                  setModo("texto");
                  setQuery(event.target.value);
                  setFoto(null);
                  setPecas([]);
                  setErro(null);
                  setBuscando(false);
                  setLimitado(false);
                  setFotoBuscada(false);
                  if (inputFotoRef.current) inputFotoRef.current.value = "";
                }}
                leftIcon={<Search size={16} aria-hidden="true" />}
                autoComplete="off"
              />
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-52">
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                id="foto-peca-perdida"
                onChange={(event) => handleFoto(event.target.files?.[0])}
              />
              <label htmlFor="foto-peca-perdida" className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-brand-gold/40 px-5 py-2.5 text-sm font-medium text-brand-text transition-colors hover:border-brand-gold hover:bg-brand-gold/5 focus-within:ring-2 focus-within:ring-brand-gold/40">
                <Upload size={16} aria-hidden="true" />
                Buscar por foto
              </label>
            </div>
          </div>

          {foto && fotoPreview && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-gold/15 bg-brand-bg/60 p-3">
              <img src={fotoPreview} alt="Prévia da foto escolhida" className="h-20 w-20 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-text">{foto.name}</p>
                <p className="text-xs text-brand-text/50">Foto pronta para comparar</p>
              </div>
              <button type="button" onClick={limparFoto} aria-label="Limpar foto" className="flex h-10 w-10 items-center justify-center rounded-full text-brand-text/55 hover:bg-white hover:text-brand-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">
                <X size={18} aria-hidden="true" />
              </button>
              <Button type="button" onClick={buscarPorFoto} loading={buscando} className="w-full sm:w-auto">
                Buscar peças
              </Button>
            </div>
          )}
        </fieldset>
      </section>

      {
        <section aria-labelledby="resultados-heading" aria-live="polite" className="min-h-24">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="resultados-heading" className="font-poppins text-lg font-semibold text-brand-text">Peças encontradas</h2>
            {!buscando && pecas.length > 0 && <span className="text-xs text-brand-text/50">{pecas.length} {pecas.length === 1 ? "peça" : "peças"}</span>}
          </div>

          {buscando && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-brand-gold/10 bg-white p-8 text-sm text-brand-text/60" role="status">
              <LoaderCircle size={20} className="animate-spin text-brand-gold" aria-hidden="true" />
              Procurando peças...
            </div>
          )}
          {erro && !buscando && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{erro}</div>}
          {limitado && !buscando && !erro && <p className="mb-4 rounded-xl bg-brand-gold/10 px-4 py-3 text-sm text-brand-text/70">Analisamos as 200 peças mais recentes; escolha um cliente para busca completa.</p>}
          {!buscando && !erro && pecas.length === 0 && (modo !== "imagem" || fotoBuscada) && (
            <div className="rounded-2xl border border-dashed border-brand-gold/25 bg-white/70 px-5 py-8 text-center">
              <ImageIcon size={25} className="mx-auto mb-2 text-brand-gold/65" aria-hidden="true" />
              <p className="font-medium text-brand-text">
                {modo === "imagem" ? "Nenhuma peça semelhante encontrada em pedidos concluídos." : cliente && !query.trim() ? "Esse cliente ainda não tem peças de pedidos concluídos." : "Nenhuma peça encontrada em pedidos concluídos."}
              </p>
              <p className="mt-1 text-sm text-brand-text/50">{modo === "imagem" ? "Tente uma foto mais nítida ou pesquise pela descrição." : "As peças de pedidos concluídos aparecerão aqui."}</p>
            </div>
          )}
          {!buscando && pecas.length > 0 && (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pecas.map((peca) => (
                <li key={peca.id} className="overflow-hidden rounded-2xl border border-brand-gold/12 bg-white shadow-card">
                  {peca.fotoUrl ? (
                    <button type="button" onClick={() => setFotoAmpliada({ url: peca.fotoUrl!, descricao: peca.descricao })} aria-label={`Ampliar foto: ${peca.descricao}`} className="group relative block aspect-[4/3] w-full overflow-hidden bg-brand-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold">
                      <img src={peca.fotoUrl} alt={peca.descricao} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                      <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-brand-text shadow">Ampliar foto</span>
                    </button>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-brand-bg text-brand-gold/40">
                      <ImageIcon size={34} strokeWidth={1.4} aria-label="Foto indisponível" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="mb-1 font-poppins text-sm font-semibold text-brand-gold">{peca.clienteNome}</p>
                    <h3 className="font-poppins font-semibold text-brand-text">{peca.descricao}</h3>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      {peca.tamanho && <div><dt className="text-xs text-brand-text/45">Tamanho</dt><dd className="text-brand-text/80">{peca.tamanho}</dd></div>}
                      <div><dt className="text-xs text-brand-text/45">Quantidade</dt><dd className="text-brand-text/80">{peca.quantidade}</dd></div>
                    </dl>
                    <p className="mt-4 border-t border-brand-gold/10 pt-3 text-xs text-brand-text/55">
                      Pedido #{peca.pedidoId} - {formatDate(peca.pedidoData)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      }

      <Modal open={!!fotoAmpliada} onClose={() => setFotoAmpliada(null)} title={fotoAmpliada?.descricao} size="xl">
        {fotoAmpliada && <img src={fotoAmpliada.url} alt={fotoAmpliada.descricao} className="mx-auto max-h-[70vh] w-auto max-w-full rounded-xl object-contain" />}
      </Modal>
    </div>
  );
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
}

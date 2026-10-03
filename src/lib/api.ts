import { AuthResponse, Cliente, Entrada, EntradaPayload, Funcionaria, HistoricoCliente, Preco, OpcaoPreco, DashboardResumo, PedidoKanban, PedidoStatus, PedidoStatusResponse, PedidosKanbanResponse } from "@/types";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bp_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bp_token");
      localStorage.removeItem("bp_user");
      window.location.href = "/login";
    }
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Erro desconhecido" }));
    throw new Error(error.message || `Erro ${res.status}`);
  }

  return res.json();
}

// Auth
export async function login(email: string, senha: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) });
}

// Funcionárias
export async function getFuncionarias(): Promise<Funcionaria[]> {
  return request<Funcionaria[]>("/funcionarias");
}
export async function createFuncionaria(data: { name: string; email: string; senha: string }): Promise<Funcionaria> {
  return request<Funcionaria>("/funcionarias", { method: "POST", body: JSON.stringify(data) });
}
export async function updateFuncionaria(id: string, data: { name?: string; email?: string; senha?: string; active?: boolean }): Promise<Funcionaria> {
  return request<Funcionaria>(`/funcionarias/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export async function deleteFuncionaria(id: string): Promise<void> {
  return request<void>(`/funcionarias/${id}`, { method: "DELETE" });
}

// Clientes
export async function searchClientes(search: string): Promise<Cliente[]> {
  return request<Cliente[]>(`/clientes?search=${encodeURIComponent(search)}`);
}
export async function createCliente(data: Omit<Cliente, "id" | "createdAt">): Promise<Cliente> {
  return request<Cliente>("/clientes", { method: "POST", body: JSON.stringify(data) });
}
export async function updateCliente(id: string, data: Partial<Omit<Cliente, "id" | "createdAt">>): Promise<Cliente> {
  return request<Cliente>(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export async function getHistoricoCliente(id: string): Promise<HistoricoCliente> {
  return request<HistoricoCliente>(`/clientes/${id}/historico`);
}
export async function deleteCliente(id: string): Promise<void> {
  return request<void>(`/clientes/${id}`, { method: "DELETE" });
}


// Entradas
export async function createEntrada(payload: EntradaPayload): Promise<{ id: string; success: boolean }> {
  const formData = new FormData();
  formData.append("clienteId", payload.clienteId);
  formData.append("avulsos", String(payload.avulsos));
  formData.append("volumes", JSON.stringify(payload.volumes));
  payload.pecas.forEach((peca, i) => {
    formData.append(`pecas[${i}][descricao]`, peca.descricao);
    if (peca.tamanho) formData.append(`pecas[${i}][tamanho]`, peca.tamanho);
    formData.append(`pecas[${i}][quantidade]`, String(peca.quantidade));
    formData.append(`pecas[${i}][foto]`, peca.foto, `peca_${i}.jpg`);
  });
  return request<{ id: string; success: boolean }>("/entrada", { method: "POST", body: formData });
}

export async function getEntradas(filters?: { dataInicio?: string; dataFim?: string; clienteId?: string; funcionariaId?: string }): Promise<Entrada[]> {
  const params = new URLSearchParams();
  if (filters?.dataInicio) params.set("dataInicio", filters.dataInicio);
  if (filters?.dataFim) params.set("dataFim", filters.dataFim);
  if (filters?.clienteId) params.set("clienteId", filters.clienteId);
  if (filters?.funcionariaId) params.set("funcionariaId", filters.funcionariaId);
  return request<Entrada[]>(`/entradas?${params.toString()}`);
}

export async function getEntradaPdf(id: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`/api/entradas/${id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error("Erro ao baixar PDF");
  return res.blob();
}

export async function reenviarPdf(id: string): Promise<void> {
  return request<void>(`/entradas/${id}/reenviar-pdf`, { method: "POST" });
}

// Pedidos (Kanban)
export async function getPedidosKanban(): Promise<PedidoKanban[]> {
  const response = await request<PedidosKanbanResponse>("/pedidos");
  return response.pedidos;
}

export async function updatePedidoStatus(id: number, status: PedidoStatus): Promise<PedidoStatusResponse> {
  return request<PedidoStatusResponse>(`/pedidos/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Preços
export async function getPrecos(): Promise<Preco[]> {
  return request<Preco[]>("/precos");
}
export async function getOpcoesPreco(): Promise<OpcaoPreco[]> {
  return request<OpcaoPreco[]>("/precos/opcoes");
}
export async function updatePrecos(precos: Preco[]): Promise<Preco[]> {
  return request<Preco[]>("/precos", { method: "PUT", body: JSON.stringify({ precos }) });
}

// Dashboard
export async function getDashboardResumo(): Promise<DashboardResumo> {
  return request<DashboardResumo>("/dashboard/resumo");
}

// Detecta se há peça de roupa na frente da câmera (usado na captura automática)
export async function detectarPeca(blob: Blob): Promise<boolean> {
  const formData = new FormData();
  formData.append("foto", blob, "frame.jpg");
  const res = await request<{ temPeca: boolean }>("/entradas/detectar-peca", { method: "POST", body: formData });
  return res.temPeca;
}

// Identificação de peça via IA
export async function identificarPeca(blob: Blob): Promise<{ descricao: string; tipo: string; tamanhoSugerido: string | null }> {
  const formData = new FormData();
  formData.append("foto", blob, "peca.jpg");
  return request("/entradas/identificar-peca", { method: "POST", body: formData });
}

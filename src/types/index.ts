export type UserRole = "admin" | "funcionaria";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Cliente {
  id: string;
  nome: string;
  cpfCnpj?: string;
  whatsapp: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  preferencias?: string[];
  createdAt?: string;
}

export interface Funcionaria {
  id: string;
  name: string;
  email: string;
  ativo: boolean;
  createdAt?: string;
}

export interface Preco {
  id: string;
  nome: string;
  volume?: string;
  preco: number;
  tipo: "volume" | "avulso";
}

export interface PecaItem {
  id: string;
  foto: string; // base64 or blob URL
  fotoBlob?: Blob;
  descricao: string;
  tamanho?: string;
  tipo?: "lencol" | "toalha" | "outro";
}

export interface VolumeQuantidade {
  precoId: string;
  nome: string;
  preco: number;
  quantidade: number;
}

export interface OpcaoPreco {
  id: string;
  nome: string;
  volume?: string;
  tipo: "volume" | "avulso";
}

export interface VolumeSelecionado {
  precoId: string;
  nome: string;
  quantidade: number;
}

export interface EntradaPayload {
  clienteId: string;
  pecas: {
    descricao: string;
    tamanho?: string;
    foto: Blob;
  }[];
  volumes: VolumeSelecionado[];
  avulsos: number;
  funcionariaId?: string;
}

export interface Entrada {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteWhatsapp: string;
  funcionariaId: string;
  funcionariaNome: string;
  totalGeral: number;
  status: string;
  pecas: {
    descricao: string;
    tamanho?: string;
    fotoUrl?: string;
  }[];
  volumes: VolumeQuantidade[];
  avulsos: number;
  createdAt: string;
}

export interface HistoricoPeca {
  descricao: string;
  tamanho?: string | null;
  fotoUrl?: string | null;
}

export interface HistoricoPedido {
  id: string;
  data: string;
  total: number;
  funcionaria?: string | null;
  pdfUrl?: string | null;
  pecas: HistoricoPeca[];
}

export interface HistoricoCliente {
  pedidos: HistoricoPedido[];
  itensEmpresa?: {
    sacos?: number;
    cabides?: number;
  };
}

export interface DashboardDailyRevenue {
  date: string; // Ex: "17/09"
  fullDate: string; // Ex: "2026-09-17"
  diaSemana: string; // Ex: "Qui"
  total: number;
  pedidos: number;
}

export interface DashboardTopCliente {
  id: string | number;
  nome: string;
  whatsapp: string;
  pedidos: number;
  total: number;
}

export interface DashboardFuncionariaPerf {
  id: string | number;
  nome: string;
  pedidos: number;
  total: number;
  ticketMedio: number;
  percentual: number;
}

export interface DashboardPedidoRecente {
  id: string | number;
  clienteId?: string | number;
  clienteNome: string;
  clienteWhatsapp: string;
  funcionariaNome: string;
  totalGeral: number;
  status: string;
  volumesQtd: number;
  volumesDesc: string[];
  avulsosQtd: number;
  createdAt: string;
  pdfUrl?: string | null;
}

export interface DashboardResumo {
  pedidosHoje: number;
  pedidosSemana: number;
  pedidosMes: number;
  totalHoje: number;
  totalSemana: number;
  totalMes: number;

  // Métricas financeiras calculadas
  ticketMedioHoje?: number;
  ticketMedioSemana?: number;
  ticketMedioMes?: number;
  ticketMedioGeral?: number;
  
  pedidosOntem?: number;
  totalOntem?: number;
  variacaoHojeOntem?: number; // percentual de variação

  pedidosMesAnterior?: number;
  totalMesAnterior?: number;
  variacaoMesAnterior?: number;

  totalClientesAtivos?: number;
  totalPecasProcessadas?: number;

  receitaVolumes?: number;
  receitaAvulsos?: number;
  qtdVolumes?: number;
  qtdAvulsos?: number;

  graficoFaturamento?: DashboardDailyRevenue[];
  topFuncionarias?: DashboardFuncionariaPerf[];
  topClientes?: DashboardTopCliente[];
  pedidosRecentes?: DashboardPedidoRecente[];
}

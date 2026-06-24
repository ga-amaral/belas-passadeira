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

export interface EntradaPayload {
  clienteId: string;
  pecas: {
    descricao: string;
    tamanho?: string;
    foto: Blob;
  }[];
  volumes: VolumeQuantidade[];
  avulsos: number;
  totalAvulso: number;
  totalGeral: number;
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

export interface DashboardResumo {
  pedidosHoje: number;
  pedidosSemana: number;
  pedidosMes: number;
  totalHoje: number;
  totalSemana: number;
  totalMes: number;
}

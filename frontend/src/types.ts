export type Perfil = "CLIENTE" | "EMPRESA" | "BANCO";
export type Status =
  "EM_ANALISE" | "APROVADO" | "REPROVADO" | "CANCELADO" | "CONTRATADO";
export interface Conta {
  id: string;
  usuario: string;
  nome: string;
  perfil: Perfil;
}
export interface Cliente {
  id: string;
  rg: string;
  cpf: string;
  nome: string;
  endereco: string;
  profissao: string;
}
export interface Emprego {
  entidade: string;
  rendimento: number;
}
export interface ClienteDetalhe {
  cliente: Cliente;
  empregos: Emprego[];
}
export interface Automovel {
  id: string;
  matricula: string;
  ano: number;
  marca: string;
  modelo: string;
  placa: string;
  proprietarioId: string;
  proprietarioNome: string;
  proprietarioTipo: Perfil;
}
export interface Pedido {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  agenteId: string;
  agenteNome: string;
  automovelId: string;
  automovelNome: string;
  placa: string;
  inicio: string;
  fim: string;
  tipoContrato: Perfil;
  bancoId: string | null;
  bancoNome: string | null;
  status: Status;
  revisao: number;
  criadoEm: string;
}
export interface DetalhePedido {
  pedido: Pedido;
  automovel: Automovel;
  avaliacoes: {
    id: string;
    agenteNome: string;
    revisao: number;
    aprovado: boolean;
    parecer: string;
    criadoEm: string;
  }[];
  contrato: {
    id: string;
    creditoReferencia: string | null;
    criadoEm: string;
  } | null;
}

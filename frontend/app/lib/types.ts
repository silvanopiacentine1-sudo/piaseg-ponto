export type PunchType = "entrada" | "saida_almoco" | "retorno_almoco" | "saida";

export interface Jornada {
  entrada: string;
  saida_almoco: string;
  retorno_almoco: string;
  saida: string;
}

export interface AdminUser {
  username: string;
  name: string;
  role: "admin";
  employee_id: number | null;
}

export const EMPRESAS = ["Corretora", "Franchising"] as const;
export type Empresa = (typeof EMPRESAS)[number];

export interface Employee {
  id: number;
  nome: string;
  email: string;
  empresa: Empresa | null;
  cargo: string;
  data_admissao: string | null;
  cpf: string | null;
  jornada: Jornada;
  jornada_semanal: string | null;
  status: "ativo" | "inativo";
}

export interface TimeEntry {
  id: number;
  employee_id: number;
  tipo: PunchType;
  timestamp: string;
  data_local: string;
  origem: "funcionario" | "admin";
  corrected: boolean;
  original_timestamp: string | null;
  correction_reason: string | null;
  corrected_by: string | null;
  corrected_at: string | null;
}

export type LeaveStatus = "pendente" | "aprovado" | "rejeitado";

export interface LeaveRequest {
  id: number;
  employee_id: number;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  observacao: string;
  anexo: string | null;
  status: LeaveStatus;
  criado_em: string;
  decidido_por: string | null;
  decidido_em: string | null;
  observacao_admin: string;
}

export interface ReportDay {
  data: string;
  status: string;
  minutos_trabalhados: number;
  minutos_esperados: number;
  saldo_minutos: number;
  incompleto: boolean;
}

export interface EmployeeReport {
  employee_id: number;
  nome: string;
  empresa: Empresa | null;
  dias_trabalhados: number;
  minutos_trabalhados_total: number;
  saldo_minutos_total: number;
  ausencias_por_tipo: Record<string, number>;
  dias: ReportDay[];
}

export interface DashboardData {
  total_funcionarios_ativos: number;
  solicitacoes_pendentes: number;
  ferias_pendentes: number;
  minutos_trabalhados_total: number;
  saldo_minutos_medio: number;
  minutos_extras_total: number;
  ausencias_por_tipo: Record<string, number>;
  saldo_por_funcionario: { nome: string; saldo_minutos: number }[];
}

export type VacationStatus = "pendente" | "aprovado" | "rejeitado";

export interface VacationHistoryEntry {
  data_inicio: string;
  data_fim: string;
  por: "funcionario" | "admin";
  motivo: string;
  criado_em: string;
}

export interface VacationSchedule {
  id: number;
  employee_id: number;
  ano: number;
  data_inicio: string;
  data_fim: string;
  observacao: string;
  historico: VacationHistoryEntry[];
  status: VacationStatus;
  proposto_por: "funcionario" | "admin";
  criado_em: string;
  atualizado_em: string;
  decidido_por: string | null;
  decidido_em: string | null;
  observacao_admin: string;
  leave_request_id: number | null;
}

export const PUNCH_LABELS: Record<PunchType, string> = {
  entrada: "Entrada",
  saida_almoco: "Saída Almoço",
  retorno_almoco: "Retorno Almoço",
  saida: "Saída",
};

export function formatMinutes(min: number): string {
  const sign = min < 0 ? "-" : "";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${String(m).padStart(2, "0")}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

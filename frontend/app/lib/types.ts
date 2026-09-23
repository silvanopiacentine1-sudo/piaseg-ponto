export type PunchType = "entrada" | "saida_almoco" | "retorno_almoco" | "saida" | "saida_intermediaria" | "retorno_intermediaria";

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
  saida_intermediaria: "Saída Intermediária",
  retorno_intermediaria: "Retorno Intermediário",
};

export function formatMinutes(min: number): string {
  const sign = min < 0 ? "-" : "";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${String(m).padStart(2, "0")}`;
}

// horário sempre fixo no fuso da empresa (Mato Grosso do Sul, UTC-4 — NÃO é horário de
// Brasília), nunca no fuso do dispositivo de quem está olhando a tela — celular/computador
// com fuso mal configurado mostrava hora errada mesmo com o timestamp certo salvo no servidor.
// Trocado de America/Sao_Paulo pra America/Campo_Grande em 2026-09-23.
export const TZ_EMPRESA = "America/Campo_Grande";

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: TZ_EMPRESA });
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// valor pro campo <input type="datetime-local"> (ex: formulário de correção do admin) no
// fuso da empresa — mesmo motivo do TZ_EMPRESA acima, senão o campo pré-preenchia com a hora
// errada quando o dispositivo do admin não estava no fuso de Mato Grosso do Sul
export function toDatetimeLocalSP(iso: string): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_EMPRESA,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  const hora = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hora}:${get("minute")}`;
}

// extrai hora/minuto no fuso da empresa, não no fuso do dispositivo (mesmo motivo do TZ_EMPRESA acima)
function horaMinutoSP(d: Date): [number, number] {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: TZ_EMPRESA, hour12: false, hour: "2-digit", minute: "2-digit" }).formatToParts(d);
  const h = Number(partes.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(partes.find((p) => p.type === "minute")?.value ?? "0");
  return [h === 24 ? 0 : h, m];
}

// tolerância antes de marcar "atrasado"/"pós" — pedido do Silvano em 2026-09-23, pra não
// pegar diferenças de poucos minutos (ex: relógio arredondando, trânsito no elevador)
export const TOLERANCIA_PONTO_MIN = 5;

function diffMinutos(entry: { timestamp: string }, horarioEsperado: string): number {
  const [hEsperado, mEsperado] = horarioEsperado.split(":").map(Number);
  const [hReal, mReal] = horaMinutoSP(new Date(entry.timestamp));
  return hReal * 60 + mReal - (hEsperado * 60 + mEsperado);
}

export function entradaAtrasada(entry: { tipo: PunchType; timestamp: string }, jornadaEntrada: string | null | undefined): boolean {
  if (entry.tipo !== "entrada" || !jornadaEntrada) return false;
  return diffMinutos(entry, jornadaEntrada) > TOLERANCIA_PONTO_MIN;
}

// saída registrada depois do fim do expediente (com tolerância) — pedido do Silvano em
// 2026-09-23, mesmo princípio do entradaAtrasada() mas pro outro lado do dia
export function saidaPosExpediente(entry: { tipo: PunchType; timestamp: string }, jornadaSaida: string | null | undefined): boolean {
  if (entry.tipo !== "saida" || !jornadaSaida) return false;
  return diffMinutos(entry, jornadaSaida) > TOLERANCIA_PONTO_MIN;
}

export type PontoStatus = "atrasado" | "em_dia" | "pos";

// status do ponto conforme a regra de horário — pedido do Silvano em 2026-09-23. "Chegada"
// (entrada, retorno de almoço): Atrasado quando bate depois do esperado, Em dia se não.
// "Saída" (saída pro almoço, saída do fim de expediente): Pós quando bate depois do
// esperado (ficou trabalhando além do horário), Em dia se não. Os outros tipos (saída/
// retorno intermediário) não têm horário esperado configurável, retorna null.
export function pontoStatus(entry: { tipo: PunchType; timestamp: string }, jornada: Jornada | null | undefined): PontoStatus | null {
  if (!jornada) return null;
  switch (entry.tipo) {
    case "entrada":
      return diffMinutos(entry, jornada.entrada) > TOLERANCIA_PONTO_MIN ? "atrasado" : "em_dia";
    case "retorno_almoco":
      return diffMinutos(entry, jornada.retorno_almoco) > TOLERANCIA_PONTO_MIN ? "atrasado" : "em_dia";
    case "saida_almoco":
      return diffMinutos(entry, jornada.saida_almoco) > TOLERANCIA_PONTO_MIN ? "pos" : "em_dia";
    case "saida":
      return diffMinutos(entry, jornada.saida) > TOLERANCIA_PONTO_MIN ? "pos" : "em_dia";
    default:
      return null;
  }
}

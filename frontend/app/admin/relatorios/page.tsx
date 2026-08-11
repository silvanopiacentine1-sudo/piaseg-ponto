"use client";

import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import { apiJson } from "../../lib/api";
import { DashboardData, Employee, EMPRESAS, EmployeeReport, formatDate, formatMinutes } from "../../lib/types";

const TIPO_COLORS: Record<string, string> = {
  "Férias": "#1baf7a",
  "Folga": "#2a78d6",
  "Atestado Médico": "#4a3aa7",
  "Falta Justificada": "#eda100",
  "Falta Injustificada": "#e34948",
  "Licença": "#e87ba4",
  "Atraso": "#eb6834",
};
const COR_PADRAO = "#8a8a8a";

function KpiCard({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-heading text-2xl text-tiber mt-1">{valor}</p>
    </div>
  );
}

export default function RelatoriosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [expandido, setExpandido] = useState<number | null>(null);

  async function carregarEmployees() {
    setEmployees(await apiJson<Employee[]>("/admin/funcionarios"));
  }

  async function carregarRelatorios() {
    const params = new URLSearchParams();
    if (employeeId) params.set("employee_id", employeeId);
    if (empresa) params.set("empresa", empresa);
    if (inicio) params.set("inicio", inicio);
    if (fim) params.set("fim", fim);
    setReports(await apiJson<EmployeeReport[]>(`/admin/relatorios?${params.toString()}`));

    const dashParams = new URLSearchParams();
    if (empresa) dashParams.set("empresa", empresa);
    if (inicio) dashParams.set("inicio", inicio);
    if (fim) dashParams.set("fim", fim);
    setDashboard(await apiJson<DashboardData>(`/admin/dashboard?${dashParams.toString()}`));
  }

  useEffect(() => {
    carregarEmployees();
  }, []);

  useEffect(() => {
    carregarRelatorios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, empresa, inicio, fim]);

  const maxAbsSaldo = Math.max(1, ...(dashboard?.saldo_por_funcionario.map((s) => Math.abs(s.saldo_minutos)) ?? [1]));
  const maxAusencia = Math.max(1, ...Object.values(dashboard?.ausencias_por_tipo ?? {}));

  return (
    <div className="min-h-dvh bg-respiro flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <h1 className="font-heading text-tiber text-xl mb-1">Relatórios e Indicadores</h1>
        <p className="text-xs text-gray-500 mb-5">
          Sem período selecionado, mostra do dia 1º do mês atual até hoje. Fins de semana e feriados nacionais são
          ignorados automaticamente no cálculo de faltas.
        </p>

        <div className="bg-white rounded-xl shadow p-4 mb-6 grid sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Empresa</label>
            <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todas</option>
              {EMPRESAS.map((emp) => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Funcionário</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {employees.filter((e) => !empresa || e.empresa === empresa).map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">De</label>
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Até</label>
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {dashboard && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <KpiCard label="Funcionários ativos" valor={dashboard.total_funcionarios_ativos} />
              <KpiCard label="Solicitações pendentes" valor={dashboard.solicitacoes_pendentes} />
              <KpiCard label="Férias pendentes" valor={dashboard.ferias_pendentes} />
              <KpiCard
                label="Saldo médio do período"
                valor={<span className={dashboard.saldo_minutos_medio >= 0 ? "text-[#1baf7a]" : "text-[#e34948]"}>{formatMinutes(dashboard.saldo_minutos_medio)}</span>}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="font-heading text-tiber text-sm mb-4">Banco de horas por funcionário</h2>
                <div className="space-y-3">
                  {dashboard.saldo_por_funcionario.map((s) => {
                    const positivo = s.saldo_minutos >= 0;
                    const largura = (Math.abs(s.saldo_minutos) / maxAbsSaldo) * 100;
                    return (
                      <div key={s.nome} className="flex items-center gap-3 text-sm">
                        <span className="w-24 shrink-0 truncate text-gray-700">{s.nome}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className={`h-full rounded-full ${positivo ? "bg-[#1baf7a]" : "bg-[#e34948]"}`} style={{ width: `${largura}%` }} />
                        </div>
                        <span className={`w-14 text-right tabular-nums text-xs ${positivo ? "text-[#1baf7a]" : "text-[#e34948]"}`}>
                          {formatMinutes(s.saldo_minutos)}
                        </span>
                      </div>
                    );
                  })}
                  {dashboard.saldo_por_funcionario.length === 0 && <p className="text-sm text-gray-400">Sem dados para o período selecionado.</p>}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="font-heading text-tiber text-sm mb-4">Ausências por tipo (todos os funcionários)</h2>
                <div className="space-y-3">
                  {Object.entries(dashboard.ausencias_por_tipo).sort((a, b) => b[1] - a[1]).map(([tipo, qtd]) => {
                    const cor = TIPO_COLORS[tipo] ?? COR_PADRAO;
                    const largura = (qtd / maxAusencia) * 100;
                    return (
                      <div key={tipo} className="flex items-center gap-3 text-sm">
                        <span className="w-32 shrink-0 truncate text-gray-700">{tipo}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${largura}%`, backgroundColor: cor }} />
                        </div>
                        <span className="w-8 text-right tabular-nums text-xs text-gray-600">{qtd}</span>
                      </div>
                    );
                  })}
                  {Object.keys(dashboard.ausencias_por_tipo).length === 0 && <p className="text-sm text-gray-400">Nenhuma ausência no período.</p>}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2 px-4">Funcionário</th>
                <th className="py-2 px-4">Dias trabalhados</th>
                <th className="py-2 px-4">Horas trabalhadas</th>
                <th className="py-2 px-4">Saldo</th>
                <th className="py-2 px-4">Ausências</th>
                <th className="py-2 px-4" />
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <React.Fragment key={r.employee_id}>
                  <tr className="border-b border-gray-50">
                    <td className="py-2 px-4">{r.nome}</td>
                    <td className="py-2 px-4">{r.dias_trabalhados}</td>
                    <td className="py-2 px-4 tabular-nums">{formatMinutes(r.minutos_trabalhados_total)}</td>
                    <td className={`py-2 px-4 tabular-nums ${r.saldo_minutos_total >= 0 ? "text-[#1baf7a]" : "text-[#e34948]"}`}>
                      {formatMinutes(r.saldo_minutos_total)}
                    </td>
                    <td className="py-2 px-4 text-gray-500">
                      {Object.entries(r.ausencias_por_tipo).map(([tipo, qtd]) => `${tipo}: ${qtd}`).join(", ") || "—"}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <button onClick={() => setExpandido(expandido === r.employee_id ? null : r.employee_id)} className="text-tiber hover:underline text-xs">
                        {expandido === r.employee_id ? "Ocultar dias" : "Ver dias"}
                      </button>
                    </td>
                  </tr>
                  {expandido === r.employee_id && (
                    <tr>
                      <td colSpan={6} className="bg-respiro px-4 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left py-1">Data</th>
                              <th className="text-left py-1">Trabalhado</th>
                              <th className="text-left py-1">Esperado</th>
                              <th className="text-left py-1">Saldo</th>
                              <th className="text-left py-1">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.dias.map((d) => (
                              <tr key={d.data}>
                                <td className="py-1">{formatDate(d.data)}</td>
                                <td className="py-1 tabular-nums">{formatMinutes(d.minutos_trabalhados)}</td>
                                <td className="py-1 tabular-nums">{formatMinutes(d.minutos_esperados)}</td>
                                <td className={`py-1 tabular-nums ${d.saldo_minutos >= 0 ? "text-[#1baf7a]" : "text-[#e34948]"}`}>{formatMinutes(d.saldo_minutos)}</td>
                                <td className="py-1">
                                  {d.status === "trabalhado" ? (
                                    d.incompleto && <span className="text-[#eda100]">Incompleto</span>
                                  ) : (
                                    <span className={d.status === "Falta Injustificada" ? "text-[#e34948] font-medium" : "text-[#2a78d6]"}>
                                      {d.status}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {reports.length === 0 && <p className="text-sm text-gray-400 p-4">Sem dados para o período selecionado.</p>}
        </div>
      </main>
    </div>
  );
}

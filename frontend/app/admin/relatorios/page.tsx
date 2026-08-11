"use client";

import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import { apiJson } from "../../lib/api";
import { Employee, EmployeeReport, formatDate, formatMinutes } from "../../lib/types";

export default function RelatoriosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [expandido, setExpandido] = useState<number | null>(null);

  async function carregarEmployees() {
    setEmployees(await apiJson<Employee[]>("/admin/funcionarios"));
  }

  async function carregarRelatorios() {
    const params = new URLSearchParams();
    if (employeeId) params.set("employee_id", employeeId);
    if (inicio) params.set("inicio", inicio);
    if (fim) params.set("fim", fim);
    setReports(await apiJson<EmployeeReport[]>(`/admin/relatorios?${params.toString()}`));
  }

  useEffect(() => {
    carregarEmployees();
  }, []);

  useEffect(() => {
    carregarRelatorios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, inicio, fim]);

  const maxAbsSaldo = Math.max(1, ...reports.map((r) => Math.abs(r.saldo_minutos_total)));

  return (
    <div className="min-h-dvh bg-respiro flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <h1 className="font-heading text-tiber text-xl mb-1">Relatórios e Indicadores</h1>
        <p className="text-xs text-gray-500 mb-5">
          Sem período selecionado, mostra do dia 1º do mês atual até hoje. Fins de semana e feriados nacionais são
          ignorados automaticamente no cálculo de faltas.
        </p>

        <div className="bg-white rounded-xl shadow p-4 mb-6 grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Funcionário</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {employees.map((e) => (
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

        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="font-heading text-tiber text-sm mb-4">Banco de horas (saldo no período)</h2>
          <div className="space-y-3">
            {reports.map((r) => {
              const positivo = r.saldo_minutos_total >= 0;
              const largura = (Math.abs(r.saldo_minutos_total) / maxAbsSaldo) * 100;
              return (
                <div key={r.employee_id} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 truncate text-gray-700">{r.nome}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${positivo ? "bg-[#1baf7a]" : "bg-[#e34948]"}`}
                      style={{ width: `${largura}%` }}
                    />
                  </div>
                  <span className={`w-16 text-right tabular-nums ${positivo ? "text-[#1baf7a]" : "text-[#e34948]"}`}>
                    {formatMinutes(r.saldo_minutos_total)}
                  </span>
                </div>
              );
            })}
            {reports.length === 0 && <p className="text-sm text-gray-400">Sem dados para o período selecionado.</p>}
          </div>
        </div>

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

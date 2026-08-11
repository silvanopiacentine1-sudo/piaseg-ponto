"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { apiJson, downloadFile } from "../../lib/api";
import { Employee, EMPRESAS, formatDateTime, PUNCH_LABELS, TimeEntry } from "../../lib/types";

export default function RegistrosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [corrigindo, setCorrigindo] = useState<TimeEntry | null>(null);
  const [novoHorario, setNovoHorario] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");

  async function carregarEmployees() {
    setEmployees(await apiJson<Employee[]>("/admin/funcionarios"));
  }

  async function carregarEntries() {
    const params = new URLSearchParams();
    if (employeeId) params.set("employee_id", employeeId);
    if (empresa) params.set("empresa", empresa);
    if (inicio) params.set("inicio", inicio);
    if (fim) params.set("fim", fim);
    setEntries(await apiJson<TimeEntry[]>(`/admin/registros?${params.toString()}`));
  }

  useEffect(() => {
    carregarEmployees();
  }, []);

  useEffect(() => {
    carregarEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, empresa, inicio, fim]);

  function nomeDe(id: number): string {
    return employees.find((e) => e.id === id)?.nome ?? `#${id}`;
  }

  function abrirCorrecao(e: TimeEntry) {
    setCorrigindo(e);
    const d = new Date(e.timestamp);
    const pad = (n: number) => String(n).padStart(2, "0");
    setNovoHorario(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setMotivo("");
    setErro("");
  }

  async function salvarCorrecao(ev: React.FormEvent) {
    ev.preventDefault();
    if (!corrigindo) return;
    setErro("");
    try {
      await apiJson(`/admin/registros/${corrigindo.id}/corrigir`, {
        method: "POST",
        body: JSON.stringify({ novo_timestamp: novoHorario, motivo }),
      });
      setCorrigindo(null);
      await carregarEntries();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível corrigir.");
    }
  }

  return (
    <div className="min-h-dvh bg-respiro flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-heading text-tiber text-xl">Registros de Ponto</h1>
          <div className="flex gap-2">
            <button
              onClick={() => downloadFile(`/admin/export/excel?${new URLSearchParams({ ...(empresa && { empresa }), ...(inicio && { inicio }), ...(fim && { fim }) })}`, "registros_ponto.xlsx")}
              className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              Exportar Excel
            </button>
            <button
              onClick={() => downloadFile(`/admin/export/afd?${new URLSearchParams({ ...(empresa && { empresa }), ...(inicio && { inicio }), ...(fim && { fim }) })}`, "afd_aproximado.txt")}
              className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              Exportar AFD
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-4 grid sm:grid-cols-4 gap-3">
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

        {corrigindo && (
          <form onSubmit={salvarCorrecao} className="bg-white rounded-xl shadow p-5 mb-4 space-y-3">
            <h2 className="font-heading text-tiber text-sm">
              Corrigir registro — {nomeDe(corrigindo.employee_id)} ({PUNCH_LABELS[corrigindo.tipo]})
            </h2>
            <p className="text-xs text-gray-500">Original: {formatDateTime(corrigindo.original_timestamp ?? corrigindo.timestamp)}</p>
            {erro && <div className="rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2">{erro}</div>}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Novo horário</label>
                <input type="datetime-local" required value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Motivo da correção (obrigatório)</label>
                <input required value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-twine text-tiber font-medium px-4 py-2 rounded-lg text-sm hover:bg-twine-dark hover:text-white transition">Salvar correção</button>
              <button type="button" onClick={() => setCorrigindo(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">Cancelar</button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2 px-4">Funcionário</th>
                <th className="py-2 px-4">Data/Hora</th>
                <th className="py-2 px-4">Tipo</th>
                <th className="py-2 px-4">Origem</th>
                <th className="py-2 px-4">Corrigido</th>
                <th className="py-2 px-4" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-50">
                  <td className="py-2 px-4">{nomeDe(e.employee_id)}</td>
                  <td className="py-2 px-4 tabular-nums">{formatDateTime(e.timestamp)}</td>
                  <td className="py-2 px-4">{PUNCH_LABELS[e.tipo]}</td>
                  <td className="py-2 px-4 text-gray-500">{e.origem === "admin" ? "Admin" : "Funcionário"}</td>
                  <td className="py-2 px-4">
                    {e.corrected ? <span title={e.correction_reason ?? ""} className="text-xs text-twine-dark cursor-help">Sim</span> : ""}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <button onClick={() => abrirCorrecao(e)} className="text-tiber hover:underline text-xs">Corrigir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && <p className="text-sm text-gray-400 p-4">Nenhum registro encontrado.</p>}
        </div>
      </main>
    </div>
  );
}

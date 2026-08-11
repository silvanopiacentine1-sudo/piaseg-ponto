"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { apiJson } from "../../lib/api";
import { Employee, VacationSchedule } from "../../lib/types";

const STATUS_LABELS: Record<string, string> = { pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Rejeitado" };
const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-50 text-yellow-800 border-yellow-300",
  aprovado: "bg-green-50 text-green-800 border-green-300",
  rejeitado: "bg-red-50 text-red-800 border-red-300",
};

const ANO_ATUAL = new Date().getFullYear();

export default function AdminFeriasPage() {
  const [schedules, setSchedules] = useState<VacationSchedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ano, setAno] = useState(String(ANO_ATUAL + 1));
  const [status, setStatus] = useState("pendente");
  const [processando, setProcessando] = useState<number | null>(null);

  const [ajustando, setAjustando] = useState<number | null>(null);
  const [ajusteInicio, setAjusteInicio] = useState("");
  const [ajusteFim, setAjusteFim] = useState("");
  const [ajusteMotivo, setAjusteMotivo] = useState("");

  async function carregar() {
    const params = new URLSearchParams();
    if (ano) params.set("ano", ano);
    if (status) params.set("status", status);
    const [s, e] = await Promise.all([
      apiJson<VacationSchedule[]>(`/admin/ferias/agendamentos?${params.toString()}`),
      apiJson<Employee[]>("/admin/funcionarios"),
    ]);
    setSchedules(s);
    setEmployees(e);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, status]);

  function nomeDe(id: number): string {
    return employees.find((e) => e.id === id)?.nome ?? `#${id}`;
  }

  async function decidir(id: number, acao: "aprovar" | "rejeitar") {
    setProcessando(id);
    try {
      await apiJson(`/admin/ferias/agendamentos/${id}/${acao}`, { method: "POST", body: JSON.stringify({}) });
      await carregar();
    } finally {
      setProcessando(null);
    }
  }

  function abrirAjuste(s: VacationSchedule) {
    setAjustando(s.id);
    setAjusteInicio(s.data_inicio);
    setAjusteFim(s.data_fim);
    setAjusteMotivo("");
  }

  async function salvarAjuste(id: number) {
    try {
      await apiJson(`/admin/ferias/agendamentos/${id}/ajustar`, {
        method: "PUT",
        body: JSON.stringify({ data_inicio: ajusteInicio, data_fim: ajusteFim, motivo: ajusteMotivo }),
      });
      setAjustando(null);
      await carregar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível ajustar.");
    }
  }

  return (
    <div className="min-h-dvh bg-respiro flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-heading text-tiber text-xl">Agendamento de Férias</h1>
          <div className="flex gap-2">
            <input type="number" value={ano} onChange={(e) => setAno(e.target.value)} placeholder="Ano" className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovados</option>
              <option value="rejeitado">Rejeitados</option>
              <option value="">Todos</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {schedules.map((s) => (
            <div key={s.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <p className="font-heading text-tiber text-sm">{nomeDe(s.employee_id)} — Férias {s.ano}</p>
                <span className={`text-xs border rounded-full px-2.5 py-1 ${STATUS_COLORS[s.status]}`}>{STATUS_LABELS[s.status]}</span>
              </div>
              <p className="text-sm text-gray-700">{s.data_inicio} a {s.data_fim}</p>
              {s.observacao && <p className="text-xs text-gray-500 mt-1">{s.observacao}</p>}
              {s.status === "pendente" && (
                <p className="text-xs text-gray-400 mt-1">
                  Última proposta de: {s.proposto_por === "admin" ? "gestor (aguardando funcionário)" : "funcionário (aguardando decisão)"}
                </p>
              )}
              {s.status !== "pendente" && s.decidido_por && (
                <p className="text-xs text-gray-400 mt-1">Decidido por {s.decidido_por} em {s.decidido_em ? new Date(s.decidido_em).toLocaleDateString("pt-BR") : ""}</p>
              )}

              {s.historico.length > 1 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer">Ver histórico de ajustes ({s.historico.length})</summary>
                  <ul className="mt-1 space-y-1">
                    {s.historico.map((h, i) => (
                      <li key={i} className="text-xs text-gray-500">
                        {h.data_inicio} a {h.data_fim} — proposto por {h.por === "admin" ? "gestor" : "funcionário"}{h.motivo ? ` (${h.motivo})` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {s.status === "pendente" && (
                ajustando === s.id ? (
                  <div className="mt-3 grid sm:grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nova data início</label>
                      <input type="date" value={ajusteInicio} onChange={(e) => setAjusteInicio(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nova data fim</label>
                      <input type="date" value={ajusteFim} onChange={(e) => setAjusteFim(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Motivo (opcional)</label>
                      <input value={ajusteMotivo} onChange={(e) => setAjusteMotivo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <div className="sm:col-span-2 flex gap-2">
                      <button onClick={() => salvarAjuste(s.id)} className="text-sm bg-twine text-tiber font-medium px-3 py-1.5 rounded-lg hover:bg-twine-dark hover:text-white transition">Propor essas datas</button>
                      <button onClick={() => setAjustando(null)} className="text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button
                      disabled={processando === s.id}
                      onClick={() => decidir(s.id, "aprovar")}
                      className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition disabled:opacity-60"
                    >
                      Aprovar
                    </button>
                    <button onClick={() => abrirAjuste(s)} className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                      Ajustar datas
                    </button>
                    <button
                      disabled={processando === s.id}
                      onClick={() => decidir(s.id, "rejeitar")}
                      className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition disabled:opacity-60"
                    >
                      Rejeitar
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
          {schedules.length === 0 && <p className="text-sm text-gray-400">Nenhum agendamento encontrado.</p>}
        </div>
      </main>
    </div>
  );
}

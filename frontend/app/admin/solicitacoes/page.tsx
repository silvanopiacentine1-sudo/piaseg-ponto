"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { apiJson } from "../../lib/api";
import { Employee, LeaveRequest } from "../../lib/types";

const STATUS_LABELS: Record<string, string> = { pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Rejeitado" };
const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-50 text-yellow-800 border-yellow-300",
  aprovado: "bg-green-50 text-green-800 border-green-300",
  rejeitado: "bg-red-50 text-red-800 border-red-300",
};

export default function SolicitacoesPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtro, setFiltro] = useState("pendente");
  const [processando, setProcessando] = useState<number | null>(null);

  async function carregar() {
    const params = filtro ? `?status=${filtro}` : "";
    const [r, e] = await Promise.all([
      apiJson<LeaveRequest[]>(`/admin/solicitacoes${params}`),
      apiJson<Employee[]>("/admin/funcionarios"),
    ]);
    setRequests(r);
    setEmployees(e);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  function nomeDe(id: number): string {
    return employees.find((e) => e.id === id)?.nome ?? `#${id}`;
  }

  async function decidir(id: number, acao: "aprovar" | "rejeitar") {
    setProcessando(id);
    try {
      await apiJson(`/admin/solicitacoes/${id}/${acao}`, { method: "POST", body: JSON.stringify({}) });
      await carregar();
    } finally {
      setProcessando(null);
    }
  }

  return (
    <div className="min-h-dvh bg-respiro flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-heading text-tiber text-xl">Solicitações</h1>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="pendente">Pendentes</option>
            <option value="aprovado">Aprovadas</option>
            <option value="rejeitado">Rejeitadas</option>
            <option value="">Todas</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
          {requests.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-gray-800">{nomeDe(r.employee_id)} — {r.tipo}</p>
                <p className="text-xs text-gray-500">{r.data_inicio} a {r.data_fim}{r.observacao ? ` — ${r.observacao}` : ""}</p>
                {r.status !== "pendente" && (
                  <p className="text-xs text-gray-400 mt-1">Decidido por {r.decidido_por} em {r.decidido_em ? new Date(r.decidido_em).toLocaleDateString("pt-BR") : ""}</p>
                )}
              </div>
              {r.status === "pendente" ? (
                <div className="flex gap-2">
                  <button
                    disabled={processando === r.id}
                    onClick={() => decidir(r.id, "aprovar")}
                    className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition disabled:opacity-60"
                  >
                    Aprovar
                  </button>
                  <button
                    disabled={processando === r.id}
                    onClick={() => decidir(r.id, "rejeitar")}
                    className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition disabled:opacity-60"
                  >
                    Rejeitar
                  </button>
                </div>
              ) : (
                <span className={`text-xs border rounded-full px-2.5 py-1 ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
              )}
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-gray-400 p-4">Nenhuma solicitação encontrada.</p>}
        </div>
      </main>
    </div>
  );
}

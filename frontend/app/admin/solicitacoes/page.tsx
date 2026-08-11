"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { apiJson, downloadFile } from "../../lib/api";
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
  const [tipos, setTipos] = useState<string[]>([]);
  const [filtro, setFiltro] = useState("pendente");
  const [processando, setProcessando] = useState<number | null>(null);

  const [showAbono, setShowAbono] = useState(false);
  const [abonoData, setAbonoData] = useState("");
  const [abonoTipo, setAbonoTipo] = useState("Falta Justificada");
  const [abonoMotivo, setAbonoMotivo] = useState("");
  const [abonoEnviando, setAbonoEnviando] = useState(false);
  const [abonoResultado, setAbonoResultado] = useState("");
  const [abonoErro, setAbonoErro] = useState("");

  async function carregar() {
    const params = filtro ? `?status=${filtro}` : "";
    const [r, e, t] = await Promise.all([
      apiJson<LeaveRequest[]>(`/admin/solicitacoes${params}`),
      apiJson<Employee[]>("/admin/funcionarios"),
      apiJson<string[]>("/solicitacoes/tipos"),
    ]);
    setRequests(r);
    setEmployees(e);
    setTipos(t);
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

  async function enviarAbonoLote(ev: React.FormEvent) {
    ev.preventDefault();
    setAbonoErro("");
    setAbonoResultado("");
    setAbonoEnviando(true);
    try {
      const res = await apiJson<{ criados: number; pulados: number }>("/admin/abonar-lote", {
        method: "POST",
        body: JSON.stringify({ data: abonoData, tipo: abonoTipo, motivo: abonoMotivo }),
      });
      setAbonoResultado(`Abonado para ${res.criados} funcionário(s)${res.pulados ? ` (${res.pulados} já tinham cobertura nessa data)` : ""}.`);
      setAbonoData("");
      setAbonoMotivo("");
      await carregar();
    } catch (e) {
      setAbonoErro(e instanceof Error ? e.message : "Não foi possível abonar em lote.");
    } finally {
      setAbonoEnviando(false);
    }
  }

  return (
    <div className="min-h-dvh bg-respiro flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <h1 className="font-heading text-tiber text-xl">Solicitações</h1>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowAbono((v) => !v)}
              className="text-sm bg-tiber text-white px-3 py-1.5 rounded-lg hover:bg-tiber-light transition"
            >
              {showAbono ? "Cancelar" : "+ Abonar em lote"}
            </button>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovadas</option>
              <option value="rejeitado">Rejeitadas</option>
              <option value="">Todas</option>
            </select>
          </div>
        </div>

        {showAbono && (
          <form onSubmit={enviarAbonoLote} className="bg-white rounded-xl shadow p-5 grid sm:grid-cols-3 gap-3">
            <h2 className="sm:col-span-3 font-heading text-tiber text-sm">
              Abonar todos os funcionários ativos numa data
            </h2>
            <p className="sm:col-span-3 text-xs text-gray-500 -mt-2">
              Use para feriados municipais e pontos facultativos (Carnaval, Corpus Christi etc.) — feriados nacionais
              já são reconhecidos automaticamente nos relatórios e não precisam de abono.
            </p>
            {abonoErro && <div className="sm:col-span-3 rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2">{abonoErro}</div>}
            {abonoResultado && <div className="sm:col-span-3 rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm px-3 py-2">{abonoResultado}</div>}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data</label>
              <input type="date" required value={abonoData} onChange={(e) => setAbonoData(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select value={abonoTipo} onChange={(e) => setAbonoTipo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {tipos.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Motivo</label>
              <input required value={abonoMotivo} onChange={(e) => setAbonoMotivo(e.target.value)} placeholder="ex: Feriado municipal" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-3">
              <button disabled={abonoEnviando} type="submit" className="bg-twine text-tiber font-medium px-4 py-2 rounded-lg text-sm hover:bg-twine-dark hover:text-white transition disabled:opacity-60">
                {abonoEnviando ? "Abonando..." : "Abonar para todos"}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
          {requests.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-gray-800">{nomeDe(r.employee_id)} — {r.tipo}</p>
                <p className="text-xs text-gray-500">{r.data_inicio} a {r.data_fim}{r.observacao ? ` — ${r.observacao}` : ""}</p>
                {r.anexo && (
                  <button
                    onClick={() => downloadFile(`/solicitacoes/arquivo/${r.anexo}`, r.anexo!.split("_").slice(1).join("_") || r.anexo!)}
                    className="text-xs text-tiber hover:underline mt-0.5"
                  >
                    📎 Ver anexo
                  </button>
                )}
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

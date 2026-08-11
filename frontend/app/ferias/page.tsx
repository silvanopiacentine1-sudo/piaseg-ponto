"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import { apiJson } from "../lib/api";
import { VacationSchedule } from "../lib/types";

const STATUS_LABELS: Record<string, string> = { pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Rejeitado" };
const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-50 text-yellow-800 border-yellow-300",
  aprovado: "bg-green-50 text-green-800 border-green-300",
  rejeitado: "bg-red-50 text-red-800 border-red-300",
};

const ANO_ATUAL = new Date().getFullYear();

export default function FeriasPage() {
  const [schedules, setSchedules] = useState<VacationSchedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [ano, setAno] = useState(ANO_ATUAL + 1);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [ajustando, setAjustando] = useState<number | null>(null);
  const [ajusteInicio, setAjusteInicio] = useState("");
  const [ajusteFim, setAjusteFim] = useState("");
  const [ajusteMotivo, setAjusteMotivo] = useState("");

  async function carregar() {
    setSchedules(await apiJson<VacationSchedule[]>("/ferias/agendamentos/minhas"));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function enviarAgendamento(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    setSucesso("");
    setEnviando(true);
    try {
      await apiJson("/ferias/agendamentos", {
        method: "POST",
        body: JSON.stringify({ ano, data_inicio: dataInicio, data_fim: dataFim, observacao }),
      });
      setSucesso("Agendamento de férias enviado. Aguarde a aprovação do gestor.");
      setDataInicio("");
      setDataFim("");
      setObservacao("");
      setShowForm(false);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar o agendamento.");
    } finally {
      setEnviando(false);
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
      await apiJson(`/ferias/agendamentos/${id}/ajustar`, {
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
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-tiber text-xl">Agendamento de Férias</h1>
          <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-tiber text-white px-3 py-1.5 rounded-lg hover:bg-tiber-light transition">
            {showForm ? "Cancelar" : "+ Novo agendamento"}
          </button>
        </div>

        {sucesso && <div className="mb-4 rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm px-3 py-2">{sucesso}</div>}

        {showForm && (
          <form onSubmit={enviarAgendamento} className="bg-white rounded-xl shadow p-5 mb-6 grid sm:grid-cols-2 gap-3">
            {erro && <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2">{erro}</div>}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ano de referência</label>
              <input type="number" required value={ano} onChange={(e) => setAno(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data início</label>
              <input type="date" required value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data fim</label>
              <input type="date" required value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Observação</label>
              <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} />
            </div>
            <div className="sm:col-span-2">
              <button disabled={enviando} type="submit" className="bg-twine text-tiber font-medium px-4 py-2 rounded-lg text-sm hover:bg-twine-dark hover:text-white transition disabled:opacity-60">
                {enviando ? "Enviando..." : "Enviar agendamento"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {schedules.map((s) => (
            <div key={s.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <p className="font-heading text-tiber text-sm">Férias {s.ano}</p>
                <span className={`text-xs border rounded-full px-2.5 py-1 ${STATUS_COLORS[s.status]}`}>{STATUS_LABELS[s.status]}</span>
              </div>
              <p className="text-sm text-gray-700">{s.data_inicio} a {s.data_fim}</p>
              {s.observacao && <p className="text-xs text-gray-500 mt-1">{s.observacao}</p>}

              {s.status === "pendente" && s.proposto_por === "admin" && (
                <p className="text-xs text-twine-dark mt-2">O gestor propôs um ajuste nessas datas — revise e confirme ou proponha outra data.</p>
              )}
              {s.status === "rejeitado" && s.observacao_admin && (
                <p className="text-xs text-red-600 mt-2">Motivo da recusa: {s.observacao_admin}</p>
              )}

              {s.historico.length > 1 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer">Ver histórico de ajustes ({s.historico.length})</summary>
                  <ul className="mt-1 space-y-1">
                    {s.historico.map((h, i) => (
                      <li key={i} className="text-xs text-gray-500">
                        {h.data_inicio} a {h.data_fim} — proposto por {h.por === "admin" ? "gestor" : "você"}{h.motivo ? ` (${h.motivo})` : ""}
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
                      <button onClick={() => salvarAjuste(s.id)} className="text-sm bg-twine text-tiber font-medium px-3 py-1.5 rounded-lg hover:bg-twine-dark hover:text-white transition">Salvar novas datas</button>
                      <button onClick={() => setAjustando(null)} className="text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => abrirAjuste(s)} className="text-xs text-tiber hover:underline mt-3">Ajustar datas</button>
                )
              )}
            </div>
          ))}
          {schedules.length === 0 && <p className="text-sm text-gray-400">Nenhum agendamento de férias ainda.</p>}
        </div>
      </main>
    </div>
  );
}

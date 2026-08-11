"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import { apiJson, downloadFile, uploadFile } from "../lib/api";
import { formatDateTime, LeaveRequest, PUNCH_LABELS, TimeEntry } from "../lib/types";

const STATUS_LABELS: Record<string, string> = { pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Rejeitado" };
const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-50 text-yellow-800 border-yellow-300",
  aprovado: "bg-green-50 text-green-800 border-green-300",
  rejeitado: "bg-red-50 text-red-800 border-red-300",
};

export default function MeusRegistrosPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [observacao, setObservacao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function carregar() {
    const [e, r, t] = await Promise.all([
      apiJson<TimeEntry[]>("/ponto/meus-registros"),
      apiJson<LeaveRequest[]>("/solicitacoes/minhas"),
      apiJson<string[]>("/solicitacoes/tipos"),
    ]);
    setEntries(e);
    setRequests(r);
    setTipos(t);
    if (!tipo && t.length) setTipo(t[0]);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enviarSolicitacao(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    setSucesso("");
    setEnviando(true);
    try {
      let anexo: string | undefined;
      if (arquivo) {
        const uploaded = await uploadFile("/solicitacoes/upload", arquivo);
        anexo = uploaded.filename;
      }
      await apiJson("/solicitacoes", {
        method: "POST",
        body: JSON.stringify({ tipo, data_inicio: dataInicio, data_fim: dataFim, observacao, anexo }),
      });
      setSucesso("Solicitação enviada com sucesso.");
      setDataInicio("");
      setDataFim("");
      setObservacao("");
      setArquivo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowForm(false);
      await carregar();
    } catch {
      setErro("Não foi possível enviar a solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-dvh bg-respiro flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
        <section className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-tiber text-lg">Solicitações</h2>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-sm bg-tiber text-white px-3 py-1.5 rounded-lg hover:bg-tiber-light transition"
            >
              {showForm ? "Cancelar" : "+ Nova solicitação"}
            </button>
          </div>

          {sucesso && <div className="mb-3 rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm px-3 py-2">{sucesso}</div>}
          {erro && <div className="mb-3 rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2">{erro}</div>}

          {showForm && (
            <form onSubmit={enviarSolicitacao} className="grid sm:grid-cols-2 gap-3 mb-4 border border-gray-100 rounded-lg p-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {tipos.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
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
                <label className="block text-xs text-gray-500 mb-1">Anexo (opcional — PDF, Word ou Excel)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                {arquivo ? (
                  <div className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-dashed border-twine bg-respiro">
                    <span className="text-sm truncate text-tiber">📎 {arquivo.name}</span>
                    <button
                      type="button"
                      onClick={() => { setArquivo(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-xs font-semibold shrink-0 text-red-600"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-lg text-sm font-medium border-2 border-dashed border-gray-200 text-tiber bg-respiro hover:border-twine transition"
                  >
                    📎 Clique aqui para anexar um arquivo
                  </button>
                )}
              </div>
              <div className="sm:col-span-2">
                <button disabled={enviando} type="submit" className="bg-twine text-tiber font-medium px-4 py-2 rounded-lg text-sm hover:bg-twine-dark hover:text-white transition disabled:opacity-60">
                  {enviando ? "Enviando..." : "Enviar solicitação"}
                </button>
              </div>
            </form>
          )}

          <ul className="divide-y divide-gray-100">
            {requests.length === 0 && <p className="text-sm text-gray-400 py-2">Nenhuma solicitação ainda.</p>}
            {requests.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.tipo}</p>
                  <p className="text-xs text-gray-500">{r.data_inicio} a {r.data_fim}{r.observacao ? ` — ${r.observacao}` : ""}</p>
                  {r.anexo && (
                    <button
                      onClick={() => downloadFile(`/solicitacoes/arquivo/${r.anexo}`, r.anexo!.split("_").slice(1).join("_") || r.anexo!)}
                      className="text-xs text-tiber hover:underline mt-0.5"
                    >
                      📎 Ver anexo
                    </button>
                  )}
                </div>
                <span className={`text-xs border rounded-full px-2.5 py-1 ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow p-5">
          <h2 className="font-heading text-tiber text-lg mb-4">Meus registros de ponto</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-4">Data/Hora</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2">Corrigido</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 tabular-nums">{formatDateTime(e.timestamp)}</td>
                    <td className="py-2 pr-4">{PUNCH_LABELS[e.tipo]}</td>
                    <td className="py-2">{e.corrected ? <span className="text-xs text-twine-dark">Sim</span> : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length === 0 && <p className="text-sm text-gray-400 py-2">Nenhum registro ainda.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

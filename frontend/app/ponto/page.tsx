"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import { apiJson } from "../lib/api";
import { PUNCH_LABELS, TimeEntry } from "../lib/types";

interface StatusHoje {
  registros_hoje: TimeEntry[];
  proximo_tipo: keyof typeof PUNCH_LABELS;
  proximo_tipo_intermediario: keyof typeof PUNCH_LABELS;
}

export default function PontoPage() {
  const [status, setStatus] = useState<StatusHoje | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingIntermediario, setLoadingIntermediario] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [relogio, setRelogio] = useState(new Date());

  async function carregar() {
    try {
      const data = await apiJson<StatusHoje>("/ponto/status-hoje");
      setStatus(data);
    } catch {
      setErro("Não foi possível carregar seus registros de hoje.");
    }
  }

  useEffect(() => {
    carregar();
    const t = setInterval(() => setRelogio(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function bater() {
    setLoading(true);
    setErro("");
    setMensagem("");
    try {
      const res = await apiJson<{ mensagem: string }>("/ponto/bater", { method: "POST" });
      setMensagem(res.mensagem);
      await carregar();
    } catch {
      setErro("Não foi possível registrar o ponto. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function baterIntermediario() {
    setLoadingIntermediario(true);
    setErro("");
    setMensagem("");
    try {
      const res = await apiJson<{ mensagem: string }>("/ponto/bater-intermediario", { method: "POST" });
      setMensagem(res.mensagem);
      await carregar();
    } catch {
      setErro("Não foi possível registrar o ponto. Tente novamente.");
    } finally {
      setLoadingIntermediario(false);
    }
  }

  return (
    <div className="min-h-dvh bg-respiro flex flex-col">
      <Header />
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-gray-500 text-sm">{relogio.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
          <p className="font-heading text-4xl text-tiber tabular-nums">{relogio.toLocaleTimeString("pt-BR")}</p>
        </div>

        {mensagem && (
          <div className="w-full rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm px-3 py-2 text-center">
            {mensagem}
          </div>
        )}
        {erro && (
          <div className="w-full rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 text-center">{erro}</div>
        )}

        <button
          id="btn-bater-ponto"
          onClick={bater}
          disabled={loading}
          className="w-56 h-56 rounded-full bg-tiber text-white font-heading text-xl shadow-xl hover:bg-tiber-light active:scale-95 transition disabled:opacity-60 flex flex-col items-center justify-center gap-2"
        >
          <span>Bater Ponto</span>
          {status && <span className="text-twine text-base font-sans">{PUNCH_LABELS[status.proximo_tipo]}</span>}
        </button>

        <button
          id="btn-bater-intermediario"
          onClick={baterIntermediario}
          disabled={loadingIntermediario}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border-2 border-twine text-tiber bg-white hover:bg-respiro-dark transition disabled:opacity-60"
        >
          🚪 {status ? PUNCH_LABELS[status.proximo_tipo_intermediario] : "Saída/Retorno Intermediário"}
        </button>
        <p className="text-xs text-gray-400 -mt-4 text-center">
          Use para saídas fora do horário de almoço (ex: consulta médica, dentista) — bate a saída e, ao voltar, o retorno.
        </p>

        <div className="w-full bg-white rounded-xl shadow p-4">
          <h2 className="font-heading text-tiber text-sm mb-3">Marcações de hoje</h2>
          {status && status.registros_hoje.length === 0 && (
            <p className="text-sm text-gray-400">Nenhuma marcação ainda.</p>
          )}
          <ul className="space-y-2">
            {status?.registros_hoje.map((e) => (
              <li key={e.id} className="flex justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                <span className="text-gray-700">{PUNCH_LABELS[e.tipo]}</span>
                <span className="tabular-nums text-gray-500">
                  {new Date(e.timestamp).toLocaleTimeString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

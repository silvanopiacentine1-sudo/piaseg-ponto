"use client";

import { useState } from "react";
import Header from "../components/Header";
import { apiJson } from "../lib/api";

export default function AlterarSenhaPage() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    setSucesso("");
    if (senhaNova !== confirmacao) {
      setErro("A confirmação não bate com a nova senha.");
      return;
    }
    setEnviando(true);
    try {
      await apiJson("/auth/alterar-senha", {
        method: "PUT",
        body: JSON.stringify({ senha_atual: senhaAtual, senha_nova: senhaNova }),
      });
      setSucesso("Senha alterada com sucesso.");
      setSenhaAtual("");
      setSenhaNova("");
      setConfirmacao("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível alterar a senha.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-dvh bg-respiro flex flex-col">
      <Header />
      <main className="flex-1 max-w-sm mx-auto w-full px-4 py-8">
        <h1 className="font-heading text-tiber text-xl mb-6">Alterar Senha</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 space-y-4">
          {sucesso && <div className="rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm px-3 py-2">{sucesso}</div>}
          {erro && <div className="rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2">{erro}</div>}

          <div>
            <label className="block text-xs text-gray-500 mb-1">Senha atual</label>
            <input
              type="password"
              required
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nova senha</label>
            <input
              type="password"
              required
              minLength={4}
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              required
              minLength={4}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button
            disabled={enviando}
            type="submit"
            className="w-full bg-twine text-tiber font-medium px-4 py-2 rounded-lg text-sm hover:bg-twine-dark hover:text-white transition disabled:opacity-60"
          >
            {enviando ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { apiJson } from "../../lib/api";
import { getUsername } from "../../lib/auth";
import { AdminUser } from "../../lib/types";

export default function AdministradoresPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const meuUsername = getUsername();

  async function carregar() {
    setAdmins(await apiJson<AdminUser[]>("/admin/administradores"));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await apiJson("/admin/administradores", {
        method: "POST",
        body: JSON.stringify({ username: email, name: nome, senha }),
      });
      setNome("");
      setEmail("");
      setSenha("");
      setShowForm(false);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar o administrador.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(username: string) {
    if (!confirm(`Excluir o acesso de administrador de ${username}? Não pode ser desfeito.`)) return;
    setExcluindo(username);
    try {
      await apiJson(`/admin/administradores/${encodeURIComponent(username)}`, { method: "DELETE" });
      await carregar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível excluir.");
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div className="min-h-dvh bg-respiro flex flex-col">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-tiber text-xl">Administradores</h1>
          <button onClick={() => setShowForm((v) => !v)} className="bg-tiber text-white px-4 py-2 rounded-lg text-sm hover:bg-tiber-light transition">
            {showForm ? "Cancelar" : "+ Novo administrador"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Cada gestor deve ter seu próprio login de administrador — assim as aprovações, correções de ponto e
          decisões ficam registradas em nome de quem realmente fez a ação.
        </p>

        {showForm && (
          <form onSubmit={salvar} className="bg-white rounded-xl shadow p-5 mb-6 grid sm:grid-cols-2 gap-3">
            {erro && <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2">{erro}</div>}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail (login)</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Senha inicial</label>
              <input required value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <button disabled={salvando} type="submit" className="bg-twine text-tiber font-medium px-4 py-2 rounded-lg text-sm hover:bg-twine-dark hover:text-white transition disabled:opacity-60">
                {salvando ? "Salvando..." : "Criar administrador"}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
          {admins.map((a) => (
            <div key={a.username} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{a.name}</p>
                <p className="text-xs text-gray-500">{a.username}{a.username === meuUsername ? " (você)" : ""}</p>
              </div>
              {a.username !== meuUsername && (
                <button
                  disabled={excluindo === a.username}
                  onClick={() => excluir(a.username)}
                  className="text-red-600 hover:underline text-xs disabled:opacity-60"
                >
                  {excluindo === a.username ? "Excluindo..." : "Excluir"}
                </button>
              )}
            </div>
          ))}
          {admins.length === 0 && <p className="text-sm text-gray-400 p-4">Nenhum administrador cadastrado.</p>}
        </div>
      </main>
    </div>
  );
}

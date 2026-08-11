"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiJson } from "./lib/api";
import { setSession } from "./lib/auth";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const sessaoExpirada = params.get("sessao_expirada") === "1";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiJson<{ token: string; user: { name: string; username: string; role: "funcionario" | "admin" } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setSession(data.token, data.user.name, data.user.username, data.user.role);
      router.push(data.user.role === "admin" ? "/admin/funcionarios" : "/ponto");
    } catch {
      setError("Usuário ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-tiber px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <h1 className="font-heading text-tiber text-2xl text-center mb-1">Piaseg Ponto</h1>
        <p className="text-center text-sm text-gray-500 mb-6">Controle de ponto eletrônico</p>

        {sessaoExpirada && (
          <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm px-3 py-2">
            Sua sessão expirou. Faça login novamente.
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Usuário</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-twine"
              placeholder="seuemail@piaseg.com.br"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-twine"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-tiber text-white rounded-lg py-2.5 font-medium hover:bg-tiber-light transition disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

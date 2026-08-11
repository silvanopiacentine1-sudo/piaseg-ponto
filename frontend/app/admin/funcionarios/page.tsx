"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { apiJson } from "../../lib/api";
import { Empresa, EMPRESAS, Employee, Jornada } from "../../lib/types";

const JORNADA_PADRAO: Jornada = { entrada: "08:00", saida_almoco: "12:00", retorno_almoco: "13:00", saida: "18:00" };

interface FormState {
  id?: number;
  nome: string;
  email: string;
  empresa: Empresa | "";
  cargo: string;
  data_admissao: string;
  cpf: string;
  jornada: Jornada;
  jornada_semanal: string;
  senha: string;
  status: "ativo" | "inativo";
}

const EMPTY_FORM: FormState = {
  nome: "", email: "", empresa: "", cargo: "", data_admissao: "", cpf: "",
  jornada: JORNADA_PADRAO, jornada_semanal: "", senha: "", status: "ativo",
};

export default function FuncionariosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<number | null>(null);
  const [filtroEmpresa, setFiltroEmpresa] = useState("");

  async function carregar() {
    setEmployees(await apiJson<Employee[]>("/admin/funcionarios"));
  }

  useEffect(() => {
    carregar();
  }, []);

  function editar(e: Employee) {
    setForm({
      id: e.id,
      nome: e.nome,
      email: e.email,
      empresa: e.empresa ?? "",
      cargo: e.cargo,
      data_admissao: e.data_admissao ?? "",
      cpf: e.cpf ?? "",
      jornada: e.jornada,
      jornada_semanal: e.jornada_semanal ?? "",
      senha: "",
      status: e.status,
    });
    setShowForm(true);
  }

  function novo() {
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      if (form.id) {
        await apiJson(`/admin/funcionarios/${form.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nome: form.nome,
            empresa: form.empresa || undefined,
            cargo: form.cargo,
            data_admissao: form.data_admissao || null,
            cpf: form.cpf || null,
            jornada: form.jornada,
            jornada_semanal: form.jornada_semanal || null,
            status: form.status,
            senha: form.senha || undefined,
          }),
        });
      } else {
        await apiJson("/admin/funcionarios", {
          method: "POST",
          body: JSON.stringify({
            nome: form.nome,
            email: form.email,
            empresa: form.empresa,
            cargo: form.cargo,
            data_admissao: form.data_admissao || null,
            cpf: form.cpf || null,
            jornada: form.jornada,
            jornada_semanal: form.jornada_semanal || null,
            senha: form.senha || undefined,
          }),
        });
      }
      setShowForm(false);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(e: Employee) {
    if (!confirm(`Excluir ${e.nome}? Isso também remove o login e o histórico de ponto/solicitações dele. Não pode ser desfeito.`)) return;
    setExcluindo(e.id);
    try {
      await apiJson(`/admin/funcionarios/${e.id}`, { method: "DELETE" });
      await carregar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível excluir.");
    } finally {
      setExcluindo(null);
    }
  }

  function TabelaGrupo({ empresa, lista }: { empresa: Empresa; lista: Employee[] }) {
    return (
      <div className="bg-white rounded-xl shadow overflow-x-auto mb-6">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <span className={`text-xs rounded-full px-2 py-0.5 border ${empresa === "Corretora" ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-purple-50 text-purple-800 border-purple-200"}`}>
            {empresa}
          </span>
          <h2 className="font-heading text-tiber text-sm">{lista.length} funcionário{lista.length === 1 ? "" : "s"}</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 px-4 w-10">Nº</th>
              <th className="py-2 px-4">Nome</th>
              <th className="py-2 px-4">E-mail</th>
              <th className="py-2 px-4">Cargo</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4" />
            </tr>
          </thead>
          <tbody>
            {lista.map((e, idx) => (
              <tr key={e.id} className="border-b border-gray-50">
                <td className="py-2 px-4 text-gray-400 tabular-nums">{idx + 1}</td>
                <td className="py-2 px-4">{e.nome}</td>
                <td className="py-2 px-4 text-gray-500">{e.email}</td>
                <td className="py-2 px-4">{e.cargo}</td>
                <td className="py-2 px-4">
                  <span className={`text-xs rounded-full px-2 py-0.5 border ${e.status === "ativo" ? "bg-green-50 text-green-800 border-green-300" : "bg-gray-100 text-gray-500 border-gray-300"}`}>
                    {e.status === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="py-2 px-4 text-right whitespace-nowrap">
                  <button onClick={() => editar(e)} className="text-tiber hover:underline text-xs mr-3">Editar</button>
                  <button disabled={excluindo === e.id} onClick={() => excluir(e)} className="text-red-600 hover:underline text-xs disabled:opacity-60">
                    {excluindo === e.id ? "Excluindo..." : "Excluir"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className="text-sm text-gray-400 p-4">Nenhum funcionário cadastrado nessa empresa.</p>}
      </div>
    );
  }

  const gruposVisiveis = filtroEmpresa ? EMPRESAS.filter((emp) => emp === filtroEmpresa) : EMPRESAS;

  return (
    <div className="min-h-dvh bg-respiro flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-heading text-tiber text-xl">Funcionários</h1>
          <div className="flex gap-2 items-center">
            <select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Todas as empresas</option>
              {EMPRESAS.map((emp) => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
            <button onClick={novo} className="bg-tiber text-white px-4 py-2 rounded-lg text-sm hover:bg-tiber-light transition">
              + Novo funcionário
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={salvar} className="bg-white rounded-xl shadow p-5 mb-6 grid sm:grid-cols-2 gap-3">
            <h2 className="sm:col-span-2 font-heading text-tiber text-sm">{form.id ? "Editar funcionário" : "Novo funcionário"}</h2>
            {erro && <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2">{erro}</div>}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail (login)</label>
              <input type="email" required disabled={!!form.id} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Empresa</label>
              <select required value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value as Empresa })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="" disabled>Selecione...</option>
                {EMPRESAS.map((emp) => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cargo</label>
              <input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data de admissão</label>
              <input type="date" value={form.data_admissao} onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">CPF</label>
              <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            {form.id && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "ativo" | "inativo" })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{form.id ? "Nova senha (opcional)" : "Senha inicial"}</label>
              <input type="text" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder={form.id ? "deixe em branco para manter" : "ex: piaseg2026"} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-2">Jornada esperada</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["entrada", "saida_almoco", "retorno_almoco", "saida"] as (keyof Jornada)[]).map((campo) => (
                  <div key={campo}>
                    <label className="block text-[11px] text-gray-400 mb-1">{campo.replace("_", " ")}</label>
                    <input
                      type="time"
                      value={form.jornada[campo]}
                      onChange={(e) => setForm({ ...form, jornada: { ...form.jornada, [campo]: e.target.value } })}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Jornada Semanal</label>
              <input
                value={form.jornada_semanal}
                onChange={(e) => setForm({ ...form, jornada_semanal: e.target.value })}
                placeholder="ex: 44h semanais, segunda a sexta"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2 flex gap-3">
              <button disabled={salvando} type="submit" className="bg-twine text-tiber font-medium px-4 py-2 rounded-lg text-sm hover:bg-twine-dark hover:text-white transition disabled:opacity-60">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {gruposVisiveis.map((emp) => (
          <TabelaGrupo key={emp} empresa={emp} lista={employees.filter((e) => e.empresa === emp)} />
        ))}
      </main>
    </div>
  );
}

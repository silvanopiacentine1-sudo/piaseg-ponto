"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getName, isAdmin, logout } from "../lib/auth";

const EMPLOYEE_LINKS = [
  { href: "/ponto", label: "Bater Ponto" },
  { href: "/meus-registros", label: "Meus Registros" },
  { href: "/ferias", label: "Férias" },
];

const ADMIN_LINKS = [
  { href: "/admin/funcionarios", label: "Funcionários" },
  { href: "/admin/registros", label: "Registros" },
  { href: "/admin/solicitacoes", label: "Solicitações" },
  { href: "/admin/ferias", label: "Férias" },
  { href: "/admin/relatorios", label: "Relatórios" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("");
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    setName(getName());
    setAdmin(isAdmin());
  }, []);

  const links = admin ? ADMIN_LINKS : EMPLOYEE_LINKS;

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="bg-tiber text-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <span className="font-heading text-lg text-twine">Piaseg Ponto</span>
        <nav className="flex gap-1 flex-wrap">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                pathname === l.href ? "bg-twine text-tiber font-medium" : "text-white/80 hover:bg-tiber-light"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/70">{name}</span>
          <button onClick={handleLogout} className="text-white/80 hover:text-white underline underline-offset-2">
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

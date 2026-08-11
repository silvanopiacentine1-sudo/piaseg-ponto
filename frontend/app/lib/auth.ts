export type Role = "funcionario" | "admin";

const isBrowser = typeof window !== "undefined";

export function getToken(): string | null {
  return isBrowser ? localStorage.getItem("ponto_token") : null;
}

export function getName(): string {
  return (isBrowser && localStorage.getItem("ponto_name")) || "";
}

export function getUsername(): string {
  return (isBrowser && localStorage.getItem("ponto_username")) || "";
}

export function getRole(): Role {
  return (isBrowser && (localStorage.getItem("ponto_role") as Role)) || "funcionario";
}

export function isAdmin(): boolean {
  return getRole() === "admin";
}

export function setSession(token: string, name: string, username: string, role: Role): void {
  if (!isBrowser) return;
  localStorage.setItem("ponto_token", token);
  localStorage.setItem("ponto_name", name);
  localStorage.setItem("ponto_username", username);
  localStorage.setItem("ponto_role", role);
}

export function logout(): void {
  if (!isBrowser) return;
  localStorage.removeItem("ponto_token");
  localStorage.removeItem("ponto_name");
  localStorage.removeItem("ponto_role");
  localStorage.removeItem("ponto_username");
}

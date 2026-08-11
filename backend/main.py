import json
import os
import shutil
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

import auth

# --- trava anti-perda-de-dados: se estiver no Render, DATA_DIR é obrigatório ---
if os.getenv("RENDER") and not os.getenv("DATA_DIR"):
    raise RuntimeError("DATA_DIR não configurado no Render — abortando para não gravar em disco efêmero")

APP_DIR = Path(__file__).parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(APP_DIR)))
SP_TZ = ZoneInfo("America/Sao_Paulo")

EMPLOYEES_FILE = DATA_DIR / "employees.json"
TIME_ENTRIES_FILE = DATA_DIR / "time_entries.json"
LEAVE_TYPES_FILE = DATA_DIR / "leave_types.json"
LEAVE_REQUESTS_FILE = DATA_DIR / "leave_requests.json"

_BUNDLED = {
    EMPLOYEES_FILE: APP_DIR / "employees.json",
    TIME_ENTRIES_FILE: APP_DIR / "time_entries.json",
    LEAVE_TYPES_FILE: APP_DIR / "leave_types.json",
    LEAVE_REQUESTS_FILE: APP_DIR / "leave_requests.json",
}

DEFAULT_LEAVE_TYPES = ["Férias", "Folga", "Atestado Médico", "Falta Justificada", "Falta Injustificada", "Licença"]
PUNCH_SEQUENCE = ["entrada", "saida_almoco", "retorno_almoco", "saida"]


def _load(path: Path, default):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    bundled = _BUNDLED.get(path)
    if bundled and bundled.exists():
        return json.loads(bundled.read_text(encoding="utf-8"))
    return default


def _save(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str), encoding="utf-8")


def load_employees() -> list[dict]:
    return _load(EMPLOYEES_FILE, [])


def save_employees(v: list[dict]) -> None:
    _save(EMPLOYEES_FILE, v)


def load_entries() -> list[dict]:
    return _load(TIME_ENTRIES_FILE, [])


def save_entries(v: list[dict]) -> None:
    _save(TIME_ENTRIES_FILE, v)


def load_leave_types() -> list[str]:
    return _load(LEAVE_TYPES_FILE, list(DEFAULT_LEAVE_TYPES))


def load_requests() -> list[dict]:
    return _load(LEAVE_REQUESTS_FILE, [])


def save_requests(v: list[dict]) -> None:
    _save(LEAVE_REQUESTS_FILE, v)


def _next_id(items: list[dict]) -> int:
    return (max((i["id"] for i in items), default=0)) + 1


def _parse_local(ts_str: str) -> datetime:
    """Interpreta um timestamp vindo do frontend (datetime-local, sem fuso) como horário de SP."""
    ts = datetime.fromisoformat(ts_str)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=SP_TZ)
    return ts


# --- backup automático a cada subida (mesmo padrão dos outros projetos Piaseg) ---
def _run_startup_backup() -> None:
    if not os.getenv("DATA_DIR"):
        return
    backups_dir = DATA_DIR / "backups"
    snapshot_dir = backups_dir / datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    for f in [EMPLOYEES_FILE, TIME_ENTRIES_FILE, LEAVE_TYPES_FILE, LEAVE_REQUESTS_FILE, DATA_DIR / "users.json"]:
        if f.exists():
            shutil.copy2(f, snapshot_dir / f.name)
    snapshots = sorted(backups_dir.glob("*"), key=lambda p: p.name)
    for old in snapshots[:-30]:
        shutil.rmtree(old, ignore_errors=True)


_run_startup_backup()
if not LEAVE_TYPES_FILE.exists() and os.getenv("DATA_DIR"):
    _save(LEAVE_TYPES_FILE, list(DEFAULT_LEAVE_TYPES))
if not auth.USERS_FILE.exists() and os.getenv("DATA_DIR"):
    auth.save_users([{
        "username": "admin",
        "name": "Administrador",
        "password_hash": auth.hash_password("piaseg2026"),
        "role": "admin",
        "employee_id": None,
    }])

app = FastAPI(title="Piaseg Ponto")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- auth deps ----------------
def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Não autenticado")
    payload = auth.decode_token(authorization.removeprefix("Bearer "))
    if not payload:
        raise HTTPException(401, "Token inválido ou expirado")
    return payload


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(403, "Somente administradores")
    return user


def require_employee_record(user: dict) -> dict:
    if not user.get("employee_id"):
        raise HTTPException(400, "Usuário não vinculado a um funcionário")
    emp = next((e for e in load_employees() if e["id"] == user["employee_id"]), None)
    if not emp:
        raise HTTPException(404, "Funcionário não encontrado")
    return emp


# ---------------- models ----------------
class LoginIn(BaseModel):
    username: str
    password: str


class JornadaIn(BaseModel):
    entrada: str = "08:00"
    saida_almoco: str = "12:00"
    retorno_almoco: str = "13:00"
    saida: str = "18:00"


class EmployeeIn(BaseModel):
    nome: str
    email: str
    cargo: str = ""
    data_admissao: Optional[str] = None
    cpf: Optional[str] = None
    jornada: JornadaIn = JornadaIn()
    senha: Optional[str] = None


class EmployeeUpdate(BaseModel):
    nome: Optional[str] = None
    cargo: Optional[str] = None
    data_admissao: Optional[str] = None
    cpf: Optional[str] = None
    jornada: Optional[JornadaIn] = None
    status: Optional[str] = None
    senha: Optional[str] = None


class CorrecaoIn(BaseModel):
    novo_timestamp: str
    motivo: str


class RegistroManualIn(BaseModel):
    employee_id: int
    tipo: str
    timestamp: str
    motivo: str


class SolicitacaoIn(BaseModel):
    tipo: str
    data_inicio: str
    data_fim: str
    observacao: str = ""


class DecisaoIn(BaseModel):
    observacao_admin: str = ""


# ---------------- auth routes ----------------
@app.post("/auth/login")
def login(data: LoginIn):
    user = auth.authenticate(data.username, data.password)
    if not user:
        raise HTTPException(401, "Usuário ou senha inválidos")
    token = auth.create_token(user["username"], user["name"], user.get("role", "funcionario"), user.get("employee_id"))
    return {"token": token, "user": auth._public_user(user)}


@app.get("/auth/me")
def me(user: dict = Depends(get_current_user)):
    return user


# ---------------- ponto (funcionário) ----------------
def _today_entries(employee_id: int) -> list[dict]:
    hoje = datetime.now(SP_TZ).date().isoformat()
    entries = [e for e in load_entries() if e["employee_id"] == employee_id and e["data_local"] == hoje]
    return sorted(entries, key=lambda e: e["timestamp"])


@app.get("/ponto/status-hoje")
def status_hoje(user: dict = Depends(get_current_user)):
    emp = require_employee_record(user)
    entries = _today_entries(emp["id"])
    proximo = PUNCH_SEQUENCE[len(entries) % 4]
    return {"registros_hoje": entries, "proximo_tipo": proximo}


@app.post("/ponto/bater")
def bater_ponto(user: dict = Depends(get_current_user)):
    emp = require_employee_record(user)
    entries_hoje = _today_entries(emp["id"])
    tipo = PUNCH_SEQUENCE[len(entries_hoje) % 4]
    now = datetime.now(SP_TZ)
    entry = {
        "id": _next_id(load_entries()),
        "employee_id": emp["id"],
        "tipo": tipo,
        "timestamp": now.isoformat(),
        "data_local": now.date().isoformat(),
        "origem": "funcionario",
        "corrected": False,
        "original_timestamp": None,
        "correction_reason": None,
        "corrected_by": None,
        "corrected_at": None,
    }
    entries = load_entries()
    entries.append(entry)
    save_entries(entries)
    return {"comprovante": entry, "mensagem": f"Ponto registrado: {tipo.replace('_', ' ')} às {now.strftime('%H:%M:%S')}"}


@app.get("/ponto/meus-registros")
def meus_registros(inicio: Optional[str] = None, fim: Optional[str] = None, user: dict = Depends(get_current_user)):
    emp = require_employee_record(user)
    entries = [e for e in load_entries() if e["employee_id"] == emp["id"]]
    if inicio:
        entries = [e for e in entries if e["data_local"] >= inicio]
    if fim:
        entries = [e for e in entries if e["data_local"] <= fim]
    return sorted(entries, key=lambda e: e["timestamp"], reverse=True)


# ---------------- solicitações (funcionário) ----------------
@app.get("/solicitacoes/tipos")
def tipos_solicitacao():
    return load_leave_types()


@app.post("/solicitacoes")
def criar_solicitacao(data: SolicitacaoIn, user: dict = Depends(get_current_user)):
    emp = require_employee_record(user)
    if data.tipo not in load_leave_types():
        raise HTTPException(400, "Tipo de solicitação inválido")
    reqs = load_requests()
    novo = {
        "id": _next_id(reqs),
        "employee_id": emp["id"],
        "tipo": data.tipo,
        "data_inicio": data.data_inicio,
        "data_fim": data.data_fim,
        "observacao": data.observacao,
        "status": "pendente",
        "criado_em": datetime.now(SP_TZ).isoformat(),
        "decidido_por": None,
        "decidido_em": None,
        "observacao_admin": "",
    }
    reqs.append(novo)
    save_requests(reqs)
    return novo


@app.get("/solicitacoes/minhas")
def minhas_solicitacoes(user: dict = Depends(get_current_user)):
    emp = require_employee_record(user)
    return sorted(
        [r for r in load_requests() if r["employee_id"] == emp["id"]],
        key=lambda r: r["criado_em"],
        reverse=True,
    )


# ---------------- admin: funcionários ----------------
@app.get("/admin/funcionarios")
def listar_funcionarios(_: dict = Depends(require_admin)):
    return sorted(load_employees(), key=lambda e: e["nome"])


@app.post("/admin/funcionarios")
def criar_funcionario(data: EmployeeIn, _: dict = Depends(require_admin)):
    employees = load_employees()
    novo = {
        "id": _next_id(employees),
        "nome": data.nome,
        "email": data.email,
        "cargo": data.cargo,
        "data_admissao": data.data_admissao,
        "cpf": data.cpf,
        "jornada": data.jornada.model_dump(),
        "status": "ativo",
    }
    employees.append(novo)
    save_employees(employees)
    try:
        auth.create_user(data.email, data.nome, data.senha or "piaseg2026", "funcionario", novo["id"])
    except ValueError as e:
        save_employees([e for e in employees if e["id"] != novo["id"]])
        raise HTTPException(400, str(e))
    return novo


@app.put("/admin/funcionarios/{employee_id}")
def editar_funcionario(employee_id: int, data: EmployeeUpdate, _: dict = Depends(require_admin)):
    employees = load_employees()
    emp = next((e for e in employees if e["id"] == employee_id), None)
    if not emp:
        raise HTTPException(404, "Funcionário não encontrado")
    for field in ["nome", "cargo", "data_admissao", "cpf", "status"]:
        val = getattr(data, field)
        if val is not None:
            emp[field] = val
    if data.jornada is not None:
        emp["jornada"] = data.jornada.model_dump()
    save_employees(employees)
    if data.nome is not None or data.senha:
        auth.update_user(emp["email"], name=data.nome, password=data.senha)
    return emp


# ---------------- admin: registros de ponto ----------------
@app.get("/admin/registros")
def listar_registros(employee_id: Optional[int] = None, inicio: Optional[str] = None, fim: Optional[str] = None, _: dict = Depends(require_admin)):
    entries = load_entries()
    if employee_id:
        entries = [e for e in entries if e["employee_id"] == employee_id]
    if inicio:
        entries = [e for e in entries if e["data_local"] >= inicio]
    if fim:
        entries = [e for e in entries if e["data_local"] <= fim]
    return sorted(entries, key=lambda e: e["timestamp"], reverse=True)


@app.post("/admin/registros")
def registro_manual(data: RegistroManualIn, admin: dict = Depends(require_admin)):
    if data.tipo not in PUNCH_SEQUENCE:
        raise HTTPException(400, f"tipo deve ser um de {PUNCH_SEQUENCE}")
    if not data.motivo.strip():
        raise HTTPException(400, "motivo é obrigatório para registro manual")
    ts = _parse_local(data.timestamp)
    entries = load_entries()
    entry = {
        "id": _next_id(entries),
        "employee_id": data.employee_id,
        "tipo": data.tipo,
        "timestamp": ts.isoformat(),
        "data_local": ts.date().isoformat(),
        "origem": "admin",
        "corrected": False,
        "original_timestamp": None,
        "correction_reason": data.motivo,
        "corrected_by": admin["sub"],
        "corrected_at": datetime.now(SP_TZ).isoformat(),
    }
    entries.append(entry)
    save_entries(entries)
    return entry


@app.post("/admin/registros/{entry_id}/corrigir")
def corrigir_registro(entry_id: int, data: CorrecaoIn, admin: dict = Depends(require_admin)):
    if not data.motivo.strip():
        raise HTTPException(400, "motivo é obrigatório")
    entries = load_entries()
    entry = next((e for e in entries if e["id"] == entry_id), None)
    if not entry:
        raise HTTPException(404, "Registro não encontrado")
    if not entry["corrected"]:
        entry["original_timestamp"] = entry["timestamp"]
    ts = _parse_local(data.novo_timestamp)
    entry["timestamp"] = ts.isoformat()
    entry["data_local"] = ts.date().isoformat()
    entry["corrected"] = True
    entry["correction_reason"] = data.motivo
    entry["corrected_by"] = admin["sub"]
    entry["corrected_at"] = datetime.now(SP_TZ).isoformat()
    save_entries(entries)
    return entry


# ---------------- admin: solicitações ----------------
@app.get("/admin/solicitacoes")
def listar_solicitacoes(status: Optional[str] = None, _: dict = Depends(require_admin)):
    reqs = load_requests()
    if status:
        reqs = [r for r in reqs if r["status"] == status]
    return sorted(reqs, key=lambda r: r["criado_em"], reverse=True)


def _decidir_solicitacao(req_id: int, novo_status: str, data: DecisaoIn, admin: dict) -> dict:
    reqs = load_requests()
    req = next((r for r in reqs if r["id"] == req_id), None)
    if not req:
        raise HTTPException(404, "Solicitação não encontrada")
    if req["status"] != "pendente":
        raise HTTPException(409, "Solicitação já foi decidida")
    req["status"] = novo_status
    req["decidido_por"] = admin["sub"]
    req["decidido_em"] = datetime.now(SP_TZ).isoformat()
    req["observacao_admin"] = data.observacao_admin
    save_requests(reqs)
    return req


@app.post("/admin/solicitacoes/{req_id}/aprovar")
def aprovar_solicitacao(req_id: int, data: DecisaoIn, admin: dict = Depends(require_admin)):
    return _decidir_solicitacao(req_id, "aprovado", data, admin)


@app.post("/admin/solicitacoes/{req_id}/rejeitar")
def rejeitar_solicitacao(req_id: int, data: DecisaoIn, admin: dict = Depends(require_admin)):
    return _decidir_solicitacao(req_id, "rejeitado", data, admin)


# ---------------- admin: relatórios ----------------
def _minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _work_minutes_for_day(entries: list[dict]) -> int:
    ordered = sorted(entries, key=lambda e: e["timestamp"])
    total = 0
    for i in range(0, len(ordered) - 1, 2):
        start = datetime.fromisoformat(ordered[i]["timestamp"])
        end = datetime.fromisoformat(ordered[i + 1]["timestamp"])
        total += int((end - start).total_seconds() // 60)
    return total


@app.get("/admin/relatorios")
def relatorios(employee_id: Optional[int] = None, inicio: Optional[str] = None, fim: Optional[str] = None, _: dict = Depends(require_admin)):
    employees = load_employees()
    if employee_id:
        employees = [e for e in employees if e["id"] == employee_id]
    all_entries = load_entries()
    all_requests = [r for r in load_requests() if r["status"] == "aprovado"]

    resultado = []
    for emp in employees:
        emp_entries = [e for e in all_entries if e["employee_id"] == emp["id"]]
        if inicio:
            emp_entries = [e for e in emp_entries if e["data_local"] >= inicio]
        if fim:
            emp_entries = [e for e in emp_entries if e["data_local"] <= fim]
        by_day: dict[str, list[dict]] = {}
        for e in emp_entries:
            by_day.setdefault(e["data_local"], []).append(e)

        jornada = emp["jornada"]
        esperado_dia = (_minutes(jornada["saida_almoco"]) - _minutes(jornada["entrada"])) + (
            _minutes(jornada["saida"]) - _minutes(jornada["retorno_almoco"])
        )
        dias = []
        saldo_total = 0
        for dia, es in sorted(by_day.items()):
            trabalhado = _work_minutes_for_day(es)
            saldo = trabalhado - esperado_dia
            saldo_total += saldo
            dias.append({
                "data": dia,
                "minutos_trabalhados": trabalhado,
                "minutos_esperados": esperado_dia,
                "saldo_minutos": saldo,
                "incompleto": len(es) % 2 == 1,
            })

        emp_requests = [r for r in all_requests if r["employee_id"] == emp["id"]]
        if inicio:
            emp_requests = [r for r in emp_requests if r["data_fim"] >= inicio]
        if fim:
            emp_requests = [r for r in emp_requests if r["data_inicio"] <= fim]
        por_tipo: dict[str, int] = {}
        for r in emp_requests:
            por_tipo[r["tipo"]] = por_tipo.get(r["tipo"], 0) + 1

        resultado.append({
            "employee_id": emp["id"],
            "nome": emp["nome"],
            "dias_trabalhados": len(dias),
            "minutos_trabalhados_total": sum(d["minutos_trabalhados"] for d in dias),
            "saldo_minutos_total": saldo_total,
            "ausencias_por_tipo": por_tipo,
            "dias": dias,
        })
    return resultado


# ---------------- exportação ----------------
@app.get("/admin/export/excel")
def export_excel(inicio: Optional[str] = None, fim: Optional[str] = None, _: dict = Depends(require_admin)):
    from openpyxl import Workbook

    employees = {e["id"]: e for e in load_employees()}
    entries = load_entries()
    if inicio:
        entries = [e for e in entries if e["data_local"] >= inicio]
    if fim:
        entries = [e for e in entries if e["data_local"] <= fim]
    entries = sorted(entries, key=lambda e: (e["employee_id"], e["timestamp"]))

    wb = Workbook()
    ws = wb.active
    ws.title = "Registros de Ponto"
    ws.append(["Funcionário", "Data", "Tipo", "Horário", "Corrigido", "Origem", "Motivo Correção"])
    for e in entries:
        emp = employees.get(e["employee_id"], {})
        ts = datetime.fromisoformat(e["timestamp"])
        ws.append([
            emp.get("nome", f"#{e['employee_id']}"),
            ts.strftime("%d/%m/%Y"),
            e["tipo"].replace("_", " "),
            ts.strftime("%H:%M:%S"),
            "Sim" if e["corrected"] else "Não",
            e["origem"],
            e.get("correction_reason") or "",
        ])
    for col in ws.columns:
        width = max(len(str(c.value)) for c in col if c.value) + 2
        ws.column_dimensions[col[0].column_letter].width = width

    from io import BytesIO
    buf = BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=registros_ponto.xlsx"},
    )


@app.get("/admin/export/afd")
def export_afd(inicio: Optional[str] = None, fim: Optional[str] = None, _: dict = Depends(require_admin)):
    """Exportação aproximada no espírito do Anexo I da Portaria MTP 671/2021 (AFD).
    NÃO é um arquivo homologado/certificado — é uma referência para o contador/RH."""
    employees = {e["id"]: e for e in load_employees()}
    entries = load_entries()
    if inicio:
        entries = [e for e in entries if e["data_local"] >= inicio]
    if fim:
        entries = [e for e in entries if e["data_local"] <= fim]
    entries = sorted(entries, key=lambda e: e["timestamp"])

    lines = []
    for i, e in enumerate(entries, start=1):
        emp = employees.get(e["employee_id"], {})
        ident = (emp.get("cpf") or str(e["employee_id"])).replace(".", "").replace("-", "").zfill(11)
        ts = datetime.fromisoformat(e["timestamp"])
        nsr = str(i).zfill(9)
        lines.append(f"{nsr}3{ident}{ts.strftime('%Y%m%d%H%M%S')}")
    content = "\n".join(lines) + "\n"
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=afd_aproximado.txt"},
    )


# ---------------- backups (admin) ----------------
@app.get("/admin/backups")
def listar_backups(_: dict = Depends(require_admin)):
    backups_dir = DATA_DIR / "backups"
    if not backups_dir.exists():
        return []
    return sorted((p.name for p in backups_dir.glob("*")), reverse=True)


@app.post("/admin/backups/{nome}/restore")
def restaurar_backup(nome: str, admin: dict = Depends(require_admin)):
    backups_dir = DATA_DIR / "backups"
    snapshot = backups_dir / nome
    if not snapshot.exists():
        raise HTTPException(404, "Backup não encontrado")
    _run_startup_backup()
    for f in [EMPLOYEES_FILE, TIME_ENTRIES_FILE, LEAVE_TYPES_FILE, LEAVE_REQUESTS_FILE, auth.USERS_FILE]:
        src = snapshot / f.name
        if src.exists():
            shutil.copy2(src, f)
    return {"restaurado": nome}

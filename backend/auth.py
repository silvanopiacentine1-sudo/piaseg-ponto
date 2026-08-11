import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = os.getenv("JWT_SECRET", "piaseg-ponto-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 60  # 60 dias

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_APP_DIR = Path(__file__).parent
_data_dir = Path(os.getenv("DATA_DIR", str(_APP_DIR)))
USERS_FILE = _data_dir / "users.json"
_BUNDLED_USERS_FILE = _APP_DIR / "users.json"

VALID_ROLES = {"funcionario", "admin"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def load_users() -> list[dict]:
    if USERS_FILE.exists():
        return json.loads(USERS_FILE.read_text(encoding="utf-8"))
    if _BUNDLED_USERS_FILE.exists():
        return json.loads(_BUNDLED_USERS_FILE.read_text(encoding="utf-8"))
    return []


def save_users(users: list[dict]) -> None:
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    USERS_FILE.write_text(json.dumps(users, indent=2, ensure_ascii=False), encoding="utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def authenticate(username: str, password: str) -> Optional[dict]:
    users = load_users()
    for u in users:
        if u["username"] == username and verify_password(password, u["password_hash"]):
            return u
    return None


def create_token(username: str, name: str, role: str, employee_id: Optional[int] = None) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": username, "name": name, "role": role, "employee_id": employee_id, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def _public_user(u: dict) -> dict:
    return {
        "username": u["username"],
        "name": u["name"],
        "role": u.get("role", "funcionario"),
        "employee_id": u.get("employee_id"),
    }


def create_user(username: str, name: str, password: str, role: str, employee_id: Optional[int] = None) -> dict:
    if role not in VALID_ROLES:
        raise ValueError(f"role deve ser um de {sorted(VALID_ROLES)}")
    if not EMAIL_RE.match(username):
        raise ValueError("username deve ser um e-mail válido (ex: nome@piaseg.com.br)")
    if not name.strip():
        raise ValueError("name é obrigatório")
    users = load_users()
    if any(u["username"] == username for u in users):
        raise ValueError(f"Usuário '{username}' já existe")
    new_user = {
        "username": username,
        "name": name,
        "password_hash": hash_password(password),
        "role": role,
        "employee_id": employee_id,
    }
    users.append(new_user)
    save_users(users)
    return _public_user(new_user)


def update_user(
    username: str,
    name: Optional[str] = None,
    password: Optional[str] = None,
    role: Optional[str] = None,
) -> Optional[dict]:
    if role is not None and role not in VALID_ROLES:
        raise ValueError(f"role deve ser um de {sorted(VALID_ROLES)}")
    users = load_users()
    for u in users:
        if u["username"] == username:
            if name is not None:
                u["name"] = name
            if password:
                u["password_hash"] = hash_password(password)
            if role is not None:
                u["role"] = role
            save_users(users)
            return _public_user(u)
    return None


def delete_user(username: str) -> bool:
    users = load_users()
    filtered = [u for u in users if u["username"] != username]
    if len(filtered) == len(users):
        return False
    save_users(filtered)
    return True


def find_user_by_employee_id(employee_id: int) -> Optional[dict]:
    users = load_users()
    for u in users:
        if u.get("employee_id") == employee_id:
            return u
    return None

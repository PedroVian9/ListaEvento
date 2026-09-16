"""Create local credentials once, without overwriting an existing configuration."""
import secrets
from pathlib import Path

path = Path(__file__).with_name(".env")
if path.exists():
    print("backend/.env ja existe e foi preservado.")
else:
    path.write_text(
        f"ADMIN_USERNAME=pedro\nADMIN_PASSWORD={secrets.token_urlsafe(18)}\nJWT_SECRET={secrets.token_urlsafe(48)}\n"
        "DATABASE_URL=sqlite:///./database.db\nFRONTEND_ORIGIN=http://localhost:5173\nCOOKIE_SECURE=false\n",
        encoding="utf-8",
    )
    print("Credenciais locais geradas em backend/.env (arquivo ignorado pelo Git).")

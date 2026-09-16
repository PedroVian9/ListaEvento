"""Online SQLite backup: python backup.py backups/evento-2026-10-18.db"""
import sqlite3
import sys
from pathlib import Path

from app.config import settings

if len(sys.argv) != 2:
    raise SystemExit("Uso: python backup.py caminho/do/backup.db")
source = Path(settings.database_url.removeprefix("sqlite:///")).resolve()
destination = Path(sys.argv[1]).resolve()
if not source.is_file() or source == destination or destination.exists():
    raise SystemExit("Verifique a origem. O destino deve ser um arquivo novo e diferente.")
destination.parent.mkdir(parents=True, exist_ok=True)
with sqlite3.connect(f"{source.as_uri()}?mode=ro", uri=True) as origin:
    with sqlite3.connect(destination) as target:
        origin.backup(target)
print(f"Backup criado em {destination}")

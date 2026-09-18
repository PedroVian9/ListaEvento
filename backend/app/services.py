import base64
import hashlib
import hmac
import json
import secrets
import re
import unicodedata
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Cookie, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import Admin, Configuration, Gift, Guest, InviteLink, Purchase
from .schemas import EventInput

COOKIE = "evento_admin"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return base64.b64encode(salt + digest).decode()


def verify_password(password: str, stored: str) -> bool:
    raw = base64.b64decode(stored)
    digest = hashlib.scrypt(password.encode(), salt=raw[:16], n=16384, r=8, p=1)
    return hmac.compare_digest(digest, raw[16:])


def password_version(admin: Admin) -> str:
    return hashlib.sha256(admin.password_hash.encode()).hexdigest()[:16]


def issue_token(admin: Admin):
    return jwt.encode({"sub": str(admin.id), "ver": password_version(admin), "exp": datetime.now(timezone.utc) + timedelta(hours=12)}, settings.jwt_secret, algorithm="HS256")


def require_admin(evento_admin: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(evento_admin or "", settings.jwt_secret, algorithms=["HS256"], options={"require": ["sub", "exp", "ver"]})
        admin = db.get(Admin, int(payload["sub"]))
        if not admin or payload["ver"] != password_version(admin):
            raise ValueError()
        return admin
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(401, "Sua sessão expirou. Entre novamente.")


def get_event(db: Session) -> dict:
    row = db.scalar(select(Configuration).where(Configuration.chave == "evento"))
    return EventInput.model_validate_json(row.valor).model_dump(mode="json") if row else EventInput().model_dump(mode="json")


def save_event(db: Session, data: EventInput):
    row = db.scalar(select(Configuration).where(Configuration.chave == "evento"))
    if not row:
        row = Configuration(chave="evento", valor="")
        db.add(row)
    row.valor = json.dumps(data.model_dump(mode="json"), ensure_ascii=False)
    db.commit()
    return data.model_dump(mode="json")


def find_guest(db: Session, token: str) -> Guest:
    guest = db.scalar(select(Guest).where(Guest.token == token))
    if not guest:
        guest = db.scalar(select(Guest).join(InviteLink).where(InviteLink.slug == token, InviteLink.ativo.is_(True)))
    if not guest:
        raise HTTPException(404, "Este convite não foi encontrado. Peça um novo link ao casal.")
    return guest


def public_guest(guest: Guest):
    members = [{"id": m.id, "nome": m.nome, "status_presenca": m.status_presenca} for m in guest.membros]
    if not members:
        members = [{"id": 0, "nome": guest.nome, "status_presenca": guest.status_presenca}]
    return {"nome": guest.nome, "status_presenca": guest.status_presenca, "quantidade_acompanhantes": guest.quantidade_acompanhantes,
            "membros": members, "convite_familiar": bool(guest.membros),
            "quantidade_confirmados": sum(m["status_presenca"] == "CONFIRMADO" for m in members) + guest.quantidade_acompanhantes}


def sync_family_status(guest: Guest):
    statuses = {m.status_presenca for m in guest.membros}
    guest.status_presenca = "CONFIRMADO" if "CONFIRMADO" in statuses else "PENDENTE" if "PENDENTE" in statuses else "NAO_VAI"
    guest.quantidade_acompanhantes = 0


def admin_guest(guest: Guest):
    slug = next((link.slug for link in guest.links if link.ativo), None)
    return {**public_guest(guest), "id": guest.id, "token": guest.token, "slug": slug, "observacao": guest.observacao,
            "convidado_por": guest.convidado_por, "criado_em": guest.criado_em, "atualizado_em": guest.atualizado_em}


def assign_invitation_link(db: Session, guest: Guest):
    name = unicodedata.normalize("NFKD", guest.nome).encode("ascii", "ignore").decode().lower()
    base = re.sub(r"[^a-z0-9]+", "-", name).strip("-") or "convite"
    slug, suffix = base, 2
    # Retain revoked slugs so a previously shared URL is never reassigned.
    while db.scalar(select(InviteLink.id).where(InviteLink.slug == slug)) is not None:
        slug = f"{base}-{suffix}"
        suffix += 1
    for link in guest.links:
        link.ativo = False
    guest.links.append(InviteLink(slug=slug, ativo=True))


def bought(db: Session, gift_id: int) -> int:
    return db.scalar(select(func.coalesce(func.sum(Purchase.quantidade), 0)).where(Purchase.presente_id == gift_id))


def gift_data(gift: Gift, quantity: int):
    return {"id": gift.id, "nome": gift.nome, "descricao": gift.descricao, "imagem_url": gift.imagem_url, "produto_url": gift.produto_url,
            "tipo": gift.tipo, "chave_pix": gift.chave_pix,
            "valor": format(gift.valor, ".2f") if gift.valor is not None else None,
            "quantidade_desejada": gift.quantidade_desejada, "quantidade_comprada": quantity, "quantidade_restante": max(0, gift.quantidade_desejada - quantity),
            "completo": quantity >= gift.quantidade_desejada, "ativo": gift.ativo, "ordem": gift.ordem}


def list_gifts(db: Session, public=False):
    totals = select(Purchase.presente_id, func.sum(Purchase.quantidade).label("quantity")).group_by(Purchase.presente_id).subquery()
    query = select(Gift, func.coalesce(totals.c.quantity, 0)).outerjoin(totals, Gift.id == totals.c.presente_id).order_by(Gift.ordem, Gift.id)
    if public:
        query = query.where(Gift.ativo.is_(True))
    return [gift_data(gift, quantity) for gift, quantity in db.execute(query)]

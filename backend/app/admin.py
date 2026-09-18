import secrets
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from .database import get_db
from .models import Gift, Guest, GuestMember
from .schemas import EventInput, GiftInput, GiftOrderInput, GuestInput
from .services import admin_guest, assign_invitation_link, bought, get_event, gift_data, list_gifts, require_admin, save_event, sync_family_status

router = APIRouter(prefix="/api/admin", tags=["Administração"], dependencies=[Depends(require_admin)])


def get_or_404(db, model, item_id):
    item = db.get(model, item_id)
    if not item:
        raise HTTPException(404, "Cadastro não encontrado.")
    return item


def write_lock(db):
    # Authentication only reads. Release its transaction before the write lock.
    db.rollback()
    db.execute(text("BEGIN IMMEDIATE"))


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    counts = dict(db.execute(select(Guest.status_presenca, func.count()).group_by(Guest.status_presenca)).all())
    confirmed = counts.get("CONFIRMADO", 0)
    companions = db.scalar(select(func.coalesce(func.sum(Guest.quantidade_acompanhantes), 0)).where(Guest.status_presenca == "CONFIRMADO")) if get_event(db)["acompanhantes_habilitados"] else 0
    invitations = list(db.scalars(select(Guest)))
    people = sum(sum(m.status_presenca == "CONFIRMADO" for m in g.membros) if g.membros else int(g.status_presenca == "CONFIRMADO") for g in invitations) + companions
    invited_people = sum(len(g.membros) if g.membros else 1 for g in invitations)
    invitation_sources = {source: sum(g.convidado_por == source for g in invitations) for source in ("PEDRO", "MARIA", "AMBOS")}
    people_sources = {source: sum((len(g.membros) if g.membros else 1) for g in invitations if g.convidado_por == source) for source in ("PEDRO", "MARIA", "AMBOS")}
    products = [g for g in list_gifts(db) if g["tipo"] == "PRODUTO"]
    gifts = [g for g in products if g["ativo"]]
    estimated = sum((Decimal(g["valor"]) * g["quantidade_comprada"] for g in products if g["valor"] is not None), Decimal("0"))
    return {"total_convidados": sum(counts.values()), "confirmados": confirmed, "nao_vao": counts.get("NAO_VAI", 0), "pendentes": counts.get("PENDENTE", 0),
            "pessoas_confirmadas": people, "pessoas_convidadas": invited_people, "total_presentes": len(gifts), "presentes_completos": sum(g["completo"] for g in gifts),
            "convites_por_origem": invitation_sources, "pessoas_por_origem": people_sources,
            "unidades_desejadas": sum(g["quantidade_desejada"] for g in gifts), "unidades_compradas": sum(g["quantidade_comprada"] for g in gifts),
            "valor_estimado_arrecadado": format(estimated, ".2f"),
            "unidades_compradas_sem_valor": sum(g["quantidade_comprada"] for g in products if g["valor"] is None)}


@router.get("/convidados")
def guests(db: Session = Depends(get_db)):
    return [admin_guest(g) for g in db.scalars(select(Guest).order_by(Guest.id))]


@router.post("/convidados", status_code=201)
def create_guest(data: GuestInput, db: Session = Depends(get_db)):
    write_lock(db)
    guest = Guest(**data.model_dump(exclude={"membros"}))
    update_members(guest, data)
    normalize_guest(guest, db)
    db.add(guest)
    assign_invitation_link(db, guest)
    db.commit()
    return admin_guest(guest)


def normalize_guest(guest, db):
    if guest.membros:
        sync_family_status(guest)
        return
    if guest.status_presenca != "CONFIRMADO" or not get_event(db)["acompanhantes_habilitados"]:
        guest.quantidade_acompanhantes = 0


def update_members(guest: Guest, data: GuestInput):
    if data.membros is None:
        return
    existing = {m.id: m for m in guest.membros}
    ids = [m.id for m in data.membros if m.id is not None]
    if len(ids) != len(set(ids)) or not set(ids) <= existing.keys():
        raise HTTPException(422, "Os nomes informados não pertencem a este convite ou estão repetidos.")
    members = []
    for item in data.membros:
        member = existing[item.id] if item.id is not None else GuestMember()
        member.nome = item.nome
        if item.id is None or "status_presenca" in item.model_fields_set:
            member.status_presenca = item.status_presenca
        members.append(member)
    guest.membros = members


@router.get("/convidados/{guest_id}")
def guest_detail(guest_id: int, db: Session = Depends(get_db)):
    return admin_guest(get_or_404(db, Guest, guest_id))


@router.put("/convidados/{guest_id}")
def edit_guest(guest_id: int, data: GuestInput, db: Session = Depends(get_db)):
    write_lock(db)
    guest = get_or_404(db, Guest, guest_id)
    name_changed = guest.nome != data.nome
    for key, value in data.model_dump(exclude={"membros"}).items():
        setattr(guest, key, value)
    update_members(guest, data)
    normalize_guest(guest, db)
    if name_changed:
        assign_invitation_link(db, guest)
    db.commit()
    return admin_guest(guest)


@router.delete("/convidados/{guest_id}", status_code=204)
def delete_guest(guest_id: int, db: Session = Depends(get_db)):
    write_lock(db)
    db.delete(get_or_404(db, Guest, guest_id))
    db.commit()
    return Response(status_code=204)


@router.post("/convidados/{guest_id}/regenerar-token")
def regenerate(guest_id: int, db: Session = Depends(get_db)):
    write_lock(db)
    guest = get_or_404(db, Guest, guest_id)
    guest.token = secrets.token_urlsafe(32)
    assign_invitation_link(db, guest)
    db.commit()
    return admin_guest(guest)


@router.get("/presentes")
def gifts(db: Session = Depends(get_db)):
    return list_gifts(db)


@router.post("/presentes", status_code=201)
def create_gift(data: GiftInput, db: Session = Depends(get_db)):
    write_lock(db)
    gift = Gift(**data.model_dump())
    gift.ordem = db.scalar(select(func.coalesce(func.max(Gift.ordem), -1))) + 1
    db.add(gift)
    db.commit()
    return gift_data(gift, 0)


@router.put("/presentes/ordem")
def reorder_gifts(data: GiftOrderInput, db: Session = Depends(get_db)):
    write_lock(db)
    gifts = {gift.id: gift for gift in db.scalars(select(Gift))}
    if len(data.ids) != len(set(data.ids)) or set(data.ids) != set(gifts):
        raise HTTPException(409, "A lista de presentes mudou. Atualize a página e tente novamente.")
    for position, gift_id in enumerate(data.ids):
        gifts[gift_id].ordem = position
    db.commit()
    return list_gifts(db)


@router.put("/presentes/{gift_id}")
def edit_gift(gift_id: int, data: GiftInput, db: Session = Depends(get_db)):
    write_lock(db)
    gift = get_or_404(db, Gift, gift_id)
    quantity = bought(db, gift_id)
    if data.tipo != gift.tipo and quantity:
        raise HTTPException(409, "Este item já tem compras registradas e não pode mudar de tipo.")
    if data.quantidade_desejada < quantity:
        raise HTTPException(409, f"Este presente já tem {quantity} unidade(s) comprada(s). A quantidade desejada não pode ser menor.")
    for key, value in data.model_dump().items():
        setattr(gift, key, value)
    db.commit()
    return gift_data(gift, quantity)


@router.delete("/presentes/{gift_id}", status_code=204)
def deactivate_gift(gift_id: int, db: Session = Depends(get_db)):
    write_lock(db)
    gift = get_or_404(db, Gift, gift_id)
    gift.ativo = False
    db.commit()
    return Response(status_code=204)


@router.get("/configuracoes")
def configuration(db: Session = Depends(get_db)):
    return get_event(db)


@router.put("/configuracoes")
def update_configuration(data: EventInput, db: Session = Depends(get_db)):
    write_lock(db)
    if not data.acompanhantes_habilitados:
        for guest in db.scalars(select(Guest).where(Guest.quantidade_acompanhantes > 0)):
            guest.quantidade_acompanhantes = 0
    return save_event(db, data)

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import get_db
from .models import Gift, Purchase
from .schemas import Attendance, PurchaseInput
from .services import bought, find_guest, get_event, list_gifts, public_guest, sync_family_status

router = APIRouter(prefix="/api", tags=["Convites"])


@router.get("/evento")
def event_info(db: Session = Depends(get_db)):
    return get_event(db)


@router.get("/convites/{token}")
def invitation(token: str, db: Session = Depends(get_db)):
    return {**public_guest(find_guest(db, token)), "evento": get_event(db)}


@router.put("/convites/{token}/presenca")
def attendance(token: str, data: Attendance, db: Session = Depends(get_db)):
    db.execute(text("BEGIN IMMEDIATE"))
    guest = find_guest(db, token)
    event = get_event(db)
    deadline = event["data_limite_confirmacao"]
    if deadline and date.fromisoformat(deadline) < date.today():
        raise HTTPException(403, "O prazo para confirmar presença encerrou em " + date.fromisoformat(deadline).strftime("%d/%m/%Y") + ".")
    expected_ids = {m.id for m in guest.membros} if guest.membros else {0}
    if data.membros_ids is not None and (set(data.membros_ids) != expected_ids or len(data.membros_ids) != len(expected_ids)):
        raise HTTPException(409, "Os nomes deste convite foram atualizados. Reabra a confirmação para conferir a lista.")
    if guest.membros and (data.membros_confirmados is None or data.membros_ids is None):
        raise HTTPException(422, "Selecione os nomes das pessoas deste convite.")
    if data.membros_confirmados is not None:
        selected = set(data.membros_confirmados)
        if len(selected) != len(data.membros_confirmados) or not selected <= expected_ids:
            raise HTTPException(422, "Selecione apenas pessoas que pertencem a este convite, sem repetir nomes.")
        if (data.status == "CONFIRMADO" and not selected) or (data.status != "CONFIRMADO" and selected):
            raise HTTPException(422, "Confira os nomes selecionados e a resposta de presença.")
        if guest.membros:
            if data.quantidade_acompanhantes:
                raise HTTPException(422, "Neste convite, confirme cada pessoa pelo nome.")
            for member in guest.membros:
                member.status_presenca = "PENDENTE" if data.status == "PENDENTE" else "CONFIRMADO" if member.id in selected else "NAO_VAI"
            sync_family_status(guest)
            db.commit()
            return public_guest(guest)
    companions_enabled = event["acompanhantes_habilitados"]
    if data.status == "CONFIRMADO" and data.quantidade_acompanhantes and not companions_enabled:
        raise HTTPException(422, "Acompanhantes não estão habilitados para este evento.")
    guest.status_presenca = data.status
    guest.quantidade_acompanhantes = data.quantidade_acompanhantes if data.status == "CONFIRMADO" and companions_enabled else 0
    db.commit()
    return public_guest(guest)


@router.get("/convites/{token}/presentes")
def gifts(token: str, db: Session = Depends(get_db)):
    find_guest(db, token)
    return list_gifts(db, public=True)


@router.post("/convites/{token}/presentes/{gift_id}/comprar", status_code=201)
def purchase(token: str, gift_id: int, data: PurchaseInput, db: Session = Depends(get_db)):
    # Acquire SQLite's write lock BEFORE reading the remaining quantity.
    # The lock covers concurrent purchases, gift edits and deactivation.
    db.execute(text("BEGIN IMMEDIATE"))
    guest = find_guest(db, token)
    gift = db.get(Gift, gift_id)
    if not gift or not gift.ativo:
        raise HTTPException(404, "Este presente não está disponível.")
    remaining = gift.quantidade_desejada - bought(db, gift.id)
    if data.quantidade > remaining:
        raise HTTPException(409, f"A lista foi atualizada. Restam {remaining} unidade(s) deste presente.")
    db.add(Purchase(presente_id=gift.id, convidado_id=guest.id, quantidade=data.quantidade))
    db.commit()
    return {"success": True}

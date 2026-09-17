import secrets
from decimal import Decimal
from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now():
    return datetime.now(timezone.utc)


class TimestampMixin:
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class Admin(Base):
    __tablename__ = "usuarios_admin"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Guest(TimestampMixin, Base):
    __tablename__ = "convidados"
    __table_args__ = (
        CheckConstraint("quantidade_acompanhantes >= 0"),
        CheckConstraint("status_presenca IN ('PENDENTE', 'CONFIRMADO', 'NAO_VAI')"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(150))
    token: Mapped[str] = mapped_column(String(100), unique=True, index=True, default=lambda: secrets.token_urlsafe(32))
    status_presenca: Mapped[str] = mapped_column(String(20), default="PENDENTE")
    quantidade_acompanhantes: Mapped[int] = mapped_column(Integer, default=0)
    observacao: Mapped[str] = mapped_column(Text, default="")
    membros: Mapped[list["GuestMember"]] = relationship(cascade="all, delete-orphan", order_by="GuestMember.id", lazy="selectin")
    links: Mapped[list["InviteLink"]] = relationship(lazy="selectin")


class InviteLink(Base):
    __tablename__ = "convite_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    convidado_id: Mapped[int | None] = mapped_column(ForeignKey("convidados.id", ondelete="SET NULL"), index=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)


class GuestMember(Base):
    __tablename__ = "convidado_membros"
    __table_args__ = (
        CheckConstraint("status_presenca IN ('PENDENTE', 'CONFIRMADO', 'NAO_VAI')"),
        {"sqlite_autoincrement": True},
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    convidado_id: Mapped[int] = mapped_column(ForeignKey("convidados.id", ondelete="CASCADE"), index=True)
    nome: Mapped[str] = mapped_column(String(150))
    status_presenca: Mapped[str] = mapped_column(String(20), default="PENDENTE")


class Gift(TimestampMixin, Base):
    __tablename__ = "presentes"
    __table_args__ = (CheckConstraint("quantidade_desejada > 0"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(150))
    descricao: Mapped[str] = mapped_column(Text, default="")
    imagem_url: Mapped[str] = mapped_column(Text)
    produto_url: Mapped[str] = mapped_column(Text, default="")
    valor: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    quantidade_desejada: Mapped[int] = mapped_column(Integer, default=1)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class Purchase(Base):
    __tablename__ = "presente_compras"
    __table_args__ = (CheckConstraint("quantidade > 0"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    presente_id: Mapped[int] = mapped_column(ForeignKey("presentes.id"), index=True)
    convidado_id: Mapped[int | None] = mapped_column(ForeignKey("convidados.id", ondelete="SET NULL"), index=True)
    quantidade: Mapped[int] = mapped_column(Integer)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Configuration(Base):
    __tablename__ = "configuracoes"
    id: Mapped[int] = mapped_column(primary_key=True)
    chave: Mapped[str] = mapped_column(String(80), unique=True)
    valor: Mapped[str] = mapped_column(Text)

from datetime import date, time
from decimal import Decimal
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator

Status = Literal["PENDENTE", "CONFIRMADO", "NAO_VAI"]


class Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


def safe_url(value: str, required=False):
    if not value and not required:
        return value
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Informe uma URL http ou https válida, sem credenciais.")
    return value


class Login(Input):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=1024)
    model_config = ConfigDict(str_strip_whitespace=False, extra="forbid")


class MemberInput(Input):
    id: int | None = Field(default=None, gt=0, strict=True)
    nome: str = Field(min_length=1, max_length=150)
    status_presenca: Status = "PENDENTE"


class GuestInput(Input):
    nome: str = Field(min_length=1, max_length=150)
    observacao: str = Field(default="", max_length=2000)
    status_presenca: Status = "PENDENTE"
    quantidade_acompanhantes: int = Field(default=0, ge=0, le=30, strict=True)
    membros: list[MemberInput] | None = Field(default=None, max_length=50)


class Attendance(Input):
    status: Status
    quantidade_acompanhantes: int = Field(default=0, ge=0, le=30, strict=True)
    membros_confirmados: list[StrictInt] | None = Field(default=None, max_length=50)
    membros_ids: list[StrictInt] | None = Field(default=None, max_length=50)


class PurchaseInput(Input):
    quantidade: int = Field(ge=1, le=10000, strict=True)


class GiftInput(Input):
    nome: str = Field(min_length=1, max_length=150)
    descricao: str = Field(default="", max_length=2000)
    imagem_url: str = Field(min_length=1, max_length=2048)
    produto_url: str = Field(default="", max_length=2048)
    valor: Decimal | None = Field(default=None, ge=0, le=Decimal("999999.99"), max_digits=8, decimal_places=2)
    quantidade_desejada: int = Field(default=1, ge=1, le=10000, strict=True)
    ordem: int = Field(default=0, ge=0, strict=True)
    ativo: bool = True

    @field_validator("imagem_url")
    @classmethod
    def image_url(cls, value):
        return safe_url(value, required=True)

    @field_validator("produto_url")
    @classmethod
    def product_url(cls, value):
        return safe_url(value)


class GiftOrderInput(Input):
    ids: list[StrictInt]


class EventInput(Input):
    nome_evento: str = Field(default="Chá de Panela", min_length=1, max_length=150)
    nome_casal: str = Field(default="Maria & Pedro", min_length=1, max_length=150)
    data: date | None = None
    data_limite_confirmacao: date | None = None
    hora: time | None = None
    endereco: str = Field(default="", max_length=500)
    maps_url: str = Field(default="", max_length=2048)
    texto_apresentacao: str = Field(default="Uma nova casa, muitas histórias e as pessoas que mais amamos. Queremos dividir esse começo com você!", max_length=3000)
    texto_presentes: str = Field(default="Preparamos algumas sugestões de presentes para nossa nova casa. Os links são apenas referências — fique à vontade para comprar o mesmo produto ou algo similar. 💙", max_length=3000)
    acompanhantes_habilitados: bool = False

    @field_validator("maps_url")
    @classmethod
    def maps_link(cls, value):
        return safe_url(value)

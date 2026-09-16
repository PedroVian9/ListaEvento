import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi.testclient import TestClient

_temporary = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = "sqlite:///" + _temporary.name.replace("\\", "/") + "/tests.db"
os.environ["ADMIN_USERNAME"] = "test-admin"
os.environ["ADMIN_PASSWORD"] = "test-only-password-1234"
os.environ["JWT_SECRET"] = "test-only-signing-key-with-at-least-32-characters"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:5173"
os.environ["COOKIE_SECURE"] = "false"

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    with TestClient(app) as client:
        yield client


@pytest.fixture
def admin(client):
    response = client.post("/api/admin/auth/login", json={"username": "test-admin", "password": "test-only-password-1234"})
    assert response.status_code == 200
    return client


def guest(client, name="João"):
    response = client.post("/api/admin/convidados", json={"nome": name, "observacao": "Informação privada"})
    assert response.status_code == 201, response.text
    return response.json()


def gift(client, quantity=3):
    body = {"nome": "Jogo de toalhas", "imagem_url": "https://example.com/toalha.jpg", "quantidade_desejada": quantity}
    response = client.post("/api/admin/presentes", json=body)
    assert response.status_code == 201, response.text
    return response.json(), body


def test_admin_auth_and_csrf(client):
    for path in ("dashboard", "convidados", "presentes", "configuracoes", "auth/me"):
        assert client.get(f"/api/admin/{path}").status_code == 401
    assert client.post("/api/admin/convidados", json={"nome": "Intruso"}).status_code == 401
    assert client.post("/api/admin/auth/login", json={"username": "test-admin", "password": "errada"}).status_code == 401
    login = client.post("/api/admin/auth/login", json={"username": "test-admin", "password": "test-only-password-1234"})
    cookie = login.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=strict" in cookie and "Path=/api/admin" in cookie
    assert client.post("/api/admin/convidados", json={"nome": "Outro"}, headers={"Origin": "https://evil.example"}).status_code == 403
    assert client.post("/api/admin/auth/logout").status_code == 200
    assert client.get("/api/admin/dashboard").status_code == 401


def test_invitation_privacy_attendance_and_companions(admin):
    person = guest(admin)
    token = person["token"]
    assert len(token) >= 40
    public = admin.get(f"/api/convites/{token}").json()
    assert public["nome"] == "João"
    assert not {"observacao", "id", "token"} & public.keys()
    assert admin.get("/api/convites/1").status_code == 404
    path = f"/api/convites/{token}/presenca"
    assert admin.put(path, json={"status": "CONFIRMADO", "quantidade_acompanhantes": 2}).status_code == 422
    settings = admin.get("/api/admin/configuracoes").json()
    settings["acompanhantes_habilitados"] = True
    assert admin.put("/api/admin/configuracoes", json=settings).status_code == 200
    assert admin.put(path, json={"status": "CONFIRMADO", "quantidade_acompanhantes": 2}).status_code == 200
    assert admin.get("/api/admin/dashboard").json()["pessoas_confirmadas"] == 3
    declined = admin.put(path, json={"status": "NAO_VAI", "quantidade_acompanhantes": 2}).json()
    assert declined["quantidade_acompanhantes"] == 0
    assert admin.get("/api/admin/dashboard").json()["pessoas_confirmadas"] == 0
    admin.put(path, json={"status": "CONFIRMADO", "quantidade_acompanhantes": 2})
    settings["acompanhantes_habilitados"] = False
    admin.put("/api/admin/configuracoes", json=settings)
    assert admin.get(f"/api/convites/{token}").json()["quantidade_acompanhantes"] == 0


def test_purchase_limits_privacy_and_history(admin):
    person = guest(admin)
    present, body = gift(admin)
    path = f'/api/convites/{person["token"]}/presentes/{present["id"]}/comprar'
    for invalid in (0, -1, 1.5, "1", True):
        assert admin.post(path, json={"quantidade": invalid}).status_code == 422
    assert admin.post(path, json={"quantidade": 1}).status_code == 201
    assert admin.post(path, json={"quantidade": 3}).status_code == 409
    gifts = admin.get(f'/api/convites/{person["token"]}/presentes').json()
    assert gifts[0]["quantidade_comprada"] == 1
    assert not {"convidado_id", "compras", "compradores"} & gifts[0].keys()
    assert admin.post(path, json={"quantidade": 2}).status_code == 201
    assert admin.post(path, json={"quantidade": 1}).status_code == 409
    assert admin.put(f'/api/admin/presentes/{present["id"]}', json={**body, "quantidade_desejada": 2}).status_code == 409
    assert admin.delete(f'/api/admin/convidados/{person["id"]}').status_code == 204
    assert admin.get("/api/admin/presentes").json()[0]["quantidade_comprada"] == 3
    assert admin.get(f'/api/convites/{person["token"]}').status_code == 404


def test_two_guests_competing_for_last_unit(admin):
    first, second = guest(admin, "Primeiro"), guest(admin, "Segundo")
    present, _ = gift(admin, quantity=1)
    barrier = Barrier(2)

    def buy(person):
        barrier.wait()
        return admin.post(f'/api/convites/{person["token"]}/presentes/{present["id"]}/comprar', json={"quantidade": 1}).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(buy, [first, second]))
    assert sorted(results) == [201, 409]
    assert admin.get("/api/admin/presentes").json()[0]["quantidade_comprada"] == 1


def test_regeneration_and_soft_delete(admin):
    person = guest(admin)
    present, body = gift(admin)
    renewed = admin.post(f'/api/admin/convidados/{person["id"]}/regenerar-token').json()
    assert renewed["token"] != person["token"]
    assert admin.get(f'/api/convites/{person["token"]}').status_code == 404
    assert admin.get(f'/api/convites/{renewed["token"]}').status_code == 200
    assert admin.delete(f'/api/admin/presentes/{present["id"]}').status_code == 204
    assert admin.get(f'/api/convites/{renewed["token"]}/presentes').json() == []
    assert admin.post(f'/api/convites/{renewed["token"]}/presentes/{present["id"]}/comprar', json={"quantidade": 1}).status_code == 404
    assert admin.put(f'/api/admin/presentes/{present["id"]}', json={**body, "ativo": True}).status_code == 200
    assert len(admin.get(f'/api/convites/{renewed["token"]}/presentes').json()) == 1


@pytest.mark.parametrize("url", ["javascript:alert(1)", "data:text/html,test", "ftp://example.com/x", "https://user:password@example.com/x", "/local.png"])
def test_reject_unsafe_urls(admin, url):
    assert admin.post("/api/admin/presentes", json={"nome": "X", "imagem_url": url}).status_code == 422
    assert admin.put("/api/admin/configuracoes", json={"maps_url": url}).status_code == 422


def test_event_settings_and_sharing(admin):
    settings = admin.get("/api/admin/configuracoes").json()
    settings.update({"nome_casal": "Maria & Pedro", "data": "2026-10-18", "hora": "16:00", "endereco": "Local de teste"})
    assert admin.put("/api/admin/configuracoes", json=settings).status_code == 200
    assert admin.get("/api/evento").json()["data"] == "2026-10-18"
    image = admin.get("/api/og-image.png")
    assert image.status_code == 200 and image.headers["content-type"] == "image/png"
    assert image.content.startswith(b"\x89PNG")
    assert admin.get("/api/no-such-route").status_code == 404


def test_attendance_deadline_blocks_new_and_changed_answers(admin):
    person = guest(admin)
    path = f'/api/convites/{person["token"]}/presenca'
    settings = admin.get("/api/admin/configuracoes").json()
    settings["data_limite_confirmacao"] = "2000-01-01"
    assert admin.put("/api/admin/configuracoes", json=settings).status_code == 200
    response = admin.put(path, json={"status": "CONFIRMADO"})
    assert response.status_code == 403
    assert "encerrou em 01/01/2000" in response.json()["detail"]


def family(client, name="Madrinha e família"):
    names = ["Cláudia", "Carlos", "Ana", "João", "Lúcia", "Luís", "Beatriz"]
    response = client.post("/api/admin/convidados", json={"nome": name, "membros": [{"nome": n} for n in names]})
    assert response.status_code == 201, response.text
    return response.json()


def family_answer(person, selected):
    return {"status": "CONFIRMADO" if selected else "NAO_VAI", "membros_confirmados": selected, "membros_ids": [m["id"] for m in person["membros"]]}


def test_family_selection_counts_and_changes(admin):
    person = family(admin)
    assert person["slug"] == "madrinha-e-familia"
    path = f'/api/convites/{person["slug"]}/presenca'
    ids = [m["id"] for m in person["membros"]]
    # The recipient herself need not attend: count exactly the four selected people.
    result = admin.put(path, json=family_answer(person, ids[1:5]))
    assert result.status_code == 200, result.text
    assert result.json()["quantidade_confirmados"] == 4
    assert result.json()["membros"][0]["status_presenca"] == "NAO_VAI"
    dashboard = admin.get("/api/admin/dashboard").json()
    assert dashboard["pessoas_confirmadas"] == 4 and dashboard["total_convidados"] == 1 and dashboard["pessoas_convidadas"] == 7
    settings = admin.get("/api/admin/configuracoes").json()
    assert not settings["acompanhantes_habilitados"]
    admin.put("/api/admin/configuracoes", json=settings)
    assert admin.get("/api/admin/dashboard").json()["pessoas_confirmadas"] == 4
    assert admin.put(path, json=family_answer(person, [ids[0]])).json()["quantidade_confirmados"] == 1
    assert admin.get("/api/admin/dashboard").json()["pessoas_confirmadas"] == 1
    assert admin.put(path, json=family_answer(person, [])).json()["status_presenca"] == "NAO_VAI"
    assert admin.get("/api/admin/dashboard").json()["pessoas_confirmadas"] == 0


def test_family_validation_privacy_and_stale_roster(admin):
    person, other = family(admin), family(admin, "Outra família")
    ids = [m["id"] for m in person["membros"]]
    path = f'/api/convites/{person["slug"]}/presenca'
    for selected in ([other["membros"][0]["id"]], [ids[0], ids[0]], [-1]):
        assert admin.put(path, json=family_answer(person, selected)).status_code == 422
    assert admin.put(path, json={**family_answer(person, []), "status": "CONFIRMADO"}).status_code == 422
    assert admin.put(path, json={"status": "CONFIRMADO"}).status_code == 422
    assert admin.put(path, json={**family_answer(person, ids[:1]), "quantidade_acompanhantes": 3}).status_code == 422
    public = admin.get(f'/api/convites/{person["slug"]}').json()
    assert {m["id"] for m in public["membros"]}.isdisjoint({m["id"] for m in other["membros"]})
    assert not {"token", "slug", "observacao"} & public.keys()
    admin.put(path, json=family_answer(person, ids[:1]))
    renamed = [{"id": m["id"], "nome": m["nome"]} for m in person["membros"]]
    renamed[0]["nome"] = "Cláudia Maria"
    changed = admin.put(f'/api/admin/convidados/{person["id"]}', json={"nome": person["nome"], "membros": [*renamed, {"nome": "Nova pessoa"}]}).json()
    assert changed["membros"][0]["status_presenca"] == "CONFIRMADO"
    assert changed["membros"][-1]["status_presenca"] == "PENDENTE"
    assert admin.put(path, json=family_answer(person, ids[:1])).status_code == 409
    assert admin.put(path, json=family_answer(changed, ids[:1])).status_code == 200
    invalid_edit = admin.put(f'/api/admin/convidados/{person["id"]}', json={"nome": person["nome"], "membros": other["membros"]})
    assert invalid_edit.status_code == 422


def test_named_links_uniqueness_renaming_and_revocation(admin):
    first, second = family(admin), family(admin)
    assert first["slug"] == "madrinha-e-familia" and second["slug"] == "madrinha-e-familia-2"
    assert admin.get(f'/api/convites/{first["slug"]}').json()["nome"] == "Madrinha e família"
    assert admin.get(f'/api/convites/{first["token"]}').status_code == 200
    renamed = admin.put(f'/api/admin/convidados/{first["id"]}', json={"nome": "Madrinha Cláudia"}).json()
    assert renamed["slug"] == "madrinha-claudia" and len(renamed["membros"]) == 7
    assert admin.get(f'/api/convites/{first["slug"]}').status_code == 404
    renewed = admin.post(f'/api/admin/convidados/{first["id"]}/regenerar-token').json()
    assert renewed["slug"] != renamed["slug"]
    assert admin.get(f'/api/convites/{renamed["slug"]}').status_code == 404
    assert admin.get(f'/api/convites/{first["token"]}').status_code == 404
    assert admin.delete(f'/api/admin/convidados/{first["id"]}').status_code == 204
    assert admin.get(f'/api/convites/{renewed["slug"]}').status_code == 404
    recreated = family(admin, "Madrinha Cláudia")
    assert recreated["slug"] not in {renewed["slug"], renamed["slug"]}

import html
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageDraw
from sqlalchemy import select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from .admin import router as admin_router
from .config import settings
from .database import Base, SessionLocal, engine, get_db, migrate_gift_value
from .models import Admin, Guest
from .public import router as public_router
from .schemas import Login
from .services import COOKIE, assign_invitation_link, get_event, hash_password, issue_token, require_admin, verify_password


@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    migrate_gift_value()
    with SessionLocal() as db:
        db.execute(text("BEGIN IMMEDIATE"))
        admin = db.scalar(select(Admin).where(Admin.username == settings.admin_username))
        if admin is None:
            db.add(Admin(username=settings.admin_username, password_hash=hash_password(settings.admin_password)))
        elif not verify_password(settings.admin_password, admin.password_hash):
            admin.password_hash = hash_password(settings.admin_password)
        for guest in db.scalars(select(Guest)):
            if not any(link.ativo for link in guest.links):
                assign_invitation_link(db, guest)
        db.commit()
    try:
        yield
    finally:
        engine.dispose()


app = FastAPI(title="Nosso Chá — Convites e Presentes", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin.rstrip("/")], allow_credentials=True,
                   allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Content-Type"])


@app.middleware("http")
async def security_headers(request: Request, call_next):
    if request.method in {"POST", "PUT", "DELETE", "PATCH"} and request.url.path.startswith("/api/"):
        origin = request.headers.get("origin")
        if origin and origin.rstrip("/") != settings.frontend_origin.rstrip("/"):
            return JSONResponse({"detail": "Origem não permitida."}, status_code=403)
        if request.headers.get("sec-fetch-site") == "cross-site":
            return JSONResponse({"detail": "Origem não permitida."}, status_code=403)
    response = await call_next(request)
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    if request.url.path.startswith(("/api/", "/convite/", "/admin")):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(OperationalError)
async def database_busy(request, exc):
    return JSONResponse({"detail": "Não foi possível salvar agora. Tente novamente em instantes."}, status_code=503)


@app.post("/api/admin/auth/login")
def login(data: Login, response: Response, db: Session = Depends(get_db)):
    admin = db.scalar(select(Admin).where(Admin.username == data.username))
    # A dummy hash keeps unknown usernames on the same expensive verification path.
    stored = admin.password_hash if admin else hash_password("invalid-login")
    if not verify_password(data.password, stored) or not admin:
        raise HTTPException(401, "Usuário ou senha incorretos.")
    response.set_cookie(COOKIE, issue_token(admin), httponly=True, secure=settings.cookie_secure, samesite="strict", max_age=43200, path="/api/admin")
    return {"username": admin.username}


@app.post("/api/admin/auth/logout")
def logout(response: Response, admin=Depends(require_admin)):
    response.delete_cookie(COOKIE, path="/api/admin", secure=settings.cookie_secure, httponly=True, samesite="strict")
    return {"success": True}


@app.get("/api/admin/auth/me")
def current_admin(admin=Depends(require_admin)):
    return {"username": admin.username}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/og-image.png")
def og_image():
    # Generated decoration, not stored product imagery. Works for social crawlers.
    picture = Image.new("RGB", (1200, 630), "#FFFFFF")
    draw = ImageDraw.Draw(picture)
    for x in range(0, 1200, 75):
        for y in (0, 555):
            draw.rectangle((x, y, x + 75, y + 75), outline="#174EA6", width=2)
            draw.ellipse((x + 12, y + 12, x + 63, y + 63), outline="#174EA6", width=3)
            draw.line((x, y, x + 75, y + 75), fill="#174EA6", width=2)
            draw.line((x + 75, y, x, y + 75), fill="#174EA6", width=2)
    with SessionLocal() as db:
        event = get_event(db)
    draw.text((600, 255), event["nome_casal"], anchor="mm", fill="#0D2F6F", font_size=62)
    draw.text((600, 350), event["nome_evento"], anchor="mm", fill="#174EA6", font_size=36)
    stream = BytesIO()
    picture.save(stream, format="PNG")
    return Response(stream.getvalue(), media_type="image/png", headers={"Cache-Control": "public, max-age=300"})


app.include_router(public_router)
app.include_router(admin_router)

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if (DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    if path.startswith("api/") or path.startswith("assets/"):
        raise HTTPException(404, "Endereço não encontrado.")

    if not (DIST / "index.html").is_file():
        raise HTTPException(
            404,
            "Front-end não compilado. Use o Vite durante o desenvolvimento."
        )

    file_path = (DIST / path).resolve()
    dist_path = DIST.resolve()

    if file_path.is_file() and dist_path in file_path.parents:
        return FileResponse(file_path)

    with SessionLocal() as db:
        event = get_event(db)

    title = html.escape(
        f'{event["nome_evento"]} | {event["nome_casal"]}',
        quote=True
    )

    content = (DIST / "index.html").read_text(encoding="utf-8")
    content = content.replace(
        "Nosso Chá | Um novo começo",
        title
    )
    content = content.replace(
        "__OG_IMAGE__",
        html.escape(
            settings.frontend_origin.rstrip("/") + "/api/og-image.png",
            quote=True
        )
    )

    return HTMLResponse(
        content,
        headers={"Cache-Control": "no-store"}
    )

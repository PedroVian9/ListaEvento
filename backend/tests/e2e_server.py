"""Ephemeral API for browser tests. Never loads the event's real database."""
import os
import tempfile

import uvicorn

if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="nosso-cha-e2e-") as directory:
        os.environ.update({
            "DATABASE_URL": "sqlite:///" + directory.replace("\\", "/") + "/e2e.db",
            "ADMIN_USERNAME": "browser-test",
            "ADMIN_PASSWORD": "browser-test-only-password",
            "JWT_SECRET": "browser-test-only-signing-key-at-least-32-chars",
            "FRONTEND_ORIGIN": "http://127.0.0.1:5174",
            "COOKIE_SECURE": "false",
        })
        uvicorn.run("app.main:app", host="127.0.0.1", port=8001, access_log=False)

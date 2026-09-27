import os
import sys

REPO_ROOT = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )
)

BACKEND_DIR = os.path.join(REPO_ROOT, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app as fastapi_app


@fastapi_app.middleware("http")
async def strip_vercel_api_prefix(request, call_next):
    path = request.scope.get("path", "")

    if path == "/api":
        request.scope["path"] = "/"
    elif path.startswith("/api/"):
        request.scope["path"] = path[4:]

    return await call_next(request)


app = fastapi_app

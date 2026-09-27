import os
import sys

# Make the existing backend package importable from the root Vercel function.
BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app as fastapi_app


@fastapi_app.middleware("http")
async def strip_vercel_api_prefix(request, call_next):
    """Expose FastAPI's existing /cases routes at the public /api/* path."""
    path = request.scope.get("path", "")
    if path == "/api":
        request.scope["path"] = "/"
    elif path.startswith("/api/"):
        request.scope["path"] = path[4:]
    return await call_next(request)


app = fastapi_app

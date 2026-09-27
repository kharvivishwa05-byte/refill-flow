# RefillFlow: one Vercel project

The repository is deployed as one Vercel project from the repository root.

## Vercel project settings

- **Root Directory:** leave empty / repository root
- **Framework Preset:** Other (the committed `vercel.json` selects the builds)
- **Build command:** configured by `@vercel/next` from `frontend/package.json`
- **Install command:** `npm install` in `frontend` is handled by the Next build; Python dependencies come from the root `requirements.txt`

Do not create a separate frontend or backend Vercel project.

## Runtime routing

`vercel.json` builds both applications in the same project:

- `frontend/package.json` is built with `@vercel/next`
- `api/index.py` is built with `@vercel/python`
- `/api/*` is routed to the FastAPI serverless function
- all other paths are routed to the Next.js application

The root `api/index.py` imports the existing backend from `backend/` and strips the public `/api` prefix before FastAPI handles the request. Existing backend routes therefore remain unchanged:

```text
/api/cases                         -> FastAPI /cases
/api/approve/RF-001                -> FastAPI /approve/RF-001
/api/prescription/extractions      -> FastAPI /prescription/extractions
```

The browser only uses same-origin URLs such as `/api/cases`.

## Environment variables

Set these in the single Vercel project as needed:

```text
GROQ_API_KEY=...
GROQ_MODEL=...
DATABASE_URL=...
```

`FRONTEND_ORIGIN` and `NEXT_PUBLIC_API_BASE_URL` are not required for production same-origin requests. The backend CORS middleware may remain for local standalone backend development.

## Local development

Run the backend separately for local development:

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The committed Next.js proxy route uses `BACKEND_URL=http://localhost:8000` locally. In Vercel, the root routing rule sends `/api/*` directly to the same project's Python function, so no backend URL is required.

## Persistence warning

The current backend uses SQLite and local filesystem uploads. Vercel functions have ephemeral storage. Use a hosted database and object storage for production persistence.

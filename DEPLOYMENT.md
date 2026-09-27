# Single-project Vercel deployment

This repo is now structured around a single Vercel project and same-origin API calls.

## Deployment model

- Frontend domain: `https://<single-vercel-domain>/`
- API endpoints: `https://<single-vercel-domain>/api/*`
- Frontend code must call the backend through relative URLs like `/api/cases`.
- Do not hardcode external backend domains like `https://backend-gray-one-39.vercel.app`.

## Required Vercel configuration

Set the Vercel project root to the `frontend` directory and keep the app as a normal Next.js app.

The frontend app proxies `/api/*` requests to your FastAPI backend using the `BACKEND_URL` environment variable when running locally or while you keep a separate Python service temporarily.

Example:

```bash
BACKEND_URL=http://localhost:8000
```

On a pure single-project deployment, the browser continues to call:

```ts
fetch("/api/cases")
```

and the app routes the request to the backend via the Next.js API route handler.

## What changed

- Frontend service calls now target same-origin `/api/...` paths.
- `frontend/src/app/api/[...slug]/route.ts` proxies requests to the FastAPI backend.
- `frontend/.env.example` uses `BACKEND_URL` instead of a public backend domain.

## Local development

Start the FastAPI backend:

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend can call the backend through:

```text
http://localhost:3000/api/cases
```

# Vercel Deployment

The application deploys as two Vercel projects:

1. **Frontend**: create a Vercel project from this repository and set its Root Directory to `frontend`.
2. **Backend**: create a second Vercel project from the same repository and set its Root Directory to `backend`.

## Frontend environment variable

In the frontend Vercel project, set:

```text
NEXT_PUBLIC_API_BASE_URL=https://<backend-project>.vercel.app
```

## Backend environment variables

In the backend Vercel project, set:

```text
FRONTEND_ORIGIN=https://<frontend-project>.vercel.app
```

Add `GROQ_API_KEY` and `GROQ_MODEL` if hosted AI analysis is required.

## Important persistence note

The current backend uses local SQLite and stores uploaded prescription files on disk. Vercel functions have ephemeral storage, so those records and files are suitable for a demo but are not durable production storage. For production, move the database to Postgres and uploaded files to object storage such as Vercel Blob or S3-compatible storage.
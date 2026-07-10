# HRMind MailOps Backend

FastAPI and PostgreSQL foundation for HRMind MailOps AI. The existing Next.js
frontend remains independent and continues to use its local demo adapter.

This backend currently provides data models, demo-safe CRUD endpoints, Alembic
configuration, and seed data. It does **not** connect Gmail, send email, call AI
services, upload files, index RAG sources, or make hiring decisions.

## Local setup (Windows PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env
```

## Local PostgreSQL setup

Create a local PostgreSQL database named `hrmind_mailops`. A simple local-only
development setup can use the default `postgres` user with password `postgres`.
Do not reuse that password outside your machine.

Example using `psql`:

```powershell
psql -U postgres -c "CREATE DATABASE hrmind_mailops;"
```

If your local PostgreSQL install uses a different password, user, host, or port,
adjust `.env` accordingly.

Edit `.env` with your local PostgreSQL connection:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/hrmind_mailops
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_MINUTES=60
BACKEND_ENV=development
```

Create the database in PostgreSQL before running migrations. Secrets belong in
`.env`; never commit that file.

### Optional isolated project-local PostgreSQL cluster

If port `5432` is already occupied or the installed PostgreSQL service has an
unknown password, you can run an isolated cluster from PostgreSQL binaries
inside this project. This keeps runtime data under ignored `backend/.pgdata`.

```powershell
cd backend
$pw = Join-Path $env:TEMP "hrmind_pg_pw.txt"
Set-Content -Path $pw -Value "postgres" -NoNewline
& "E:\PostgreSQL\bin\initdb.exe" -D ".pgdata" -U postgres --auth-host=scram-sha-256 --auth-local=trust --pwfile=$pw
Remove-Item $pw -Force
& "E:\PostgreSQL\bin\pg_ctl.exe" -D ".pgdata" -o '"-p 55432"' -l "pg-runtime.log" start
$env:PGPASSWORD = "postgres"
& "E:\PostgreSQL\bin\createdb.exe" -h 127.0.0.1 -p 55432 -U postgres hrmind_mailops
```

Use this URL for the isolated cluster:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:55432/hrmind_mailops
BACKEND_ENV=development
```

## Alembic migrations

Run the committed schema migration:

```powershell
alembic upgrade head
```

Useful follow-up commands:

```powershell
alembic revision --autogenerate -m "describe change"
alembic current
alembic history
alembic downgrade -1
```

## Seed the demo workspace

Run migrations first, then seed:

```powershell
python -m app.seed
```

The seed is idempotent: if `demo_ws_local` exists, it makes no changes.

## Verify PostgreSQL runtime

After migrations and seed data are in place:

```powershell
python scripts/check_backend.py
```

The script checks that:

- `.env` / `DATABASE_URL` loads correctly.
- PostgreSQL accepts a connection.
- All required tables exist.
- The demo workspace and seeded rows are present.
- API routes return `200` if Uvicorn is already running on
  `http://127.0.0.1:8000`.

To verify API routes too, run the server in a second terminal:

```powershell
uvicorn app.main:app --reload --port 8000
```

## Run the API

```powershell
uvicorn app.main:app --reload --port 8000
```

Open:

- Health: <http://localhost:8000/health>
- OpenAPI: <http://localhost:8000/docs>

## Routes

- `GET /health`
- `GET /api/workspaces/demo`
- `GET /api/settings/{workspace_id}`
- `PATCH /api/settings/{workspace_id}`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/workspaces/me`
- `GET /api/private/settings`
- `PATCH /api/private/settings`
- `GET /api/private/email-threads`
- `GET /api/private/candidates`
- `GET /api/private/drafts`
- `GET /api/private/interview-kits`
- `GET /api/private/rag-sources`
- `GET /api/email-threads/{workspace_id}`
- `GET /api/candidates/{workspace_id}`
- `GET /api/drafts/{workspace_id}`
- `PATCH /api/drafts/{draft_id}`
- `GET /api/interview-kits/{workspace_id}`
- `GET /api/rag-sources/{workspace_id}`
- `POST /api/audit-logs`

All current data is demo-safe. RAG routes expose metadata only, drafts require
human review by default, and no route sends or modifies external email.

## Troubleshooting

- PostgreSQL not running: start your local PostgreSQL service, then retry
  `alembic upgrade head`.
- `DATABASE_URL` missing: copy `.env.example` to `.env` and confirm the file is
  in the `backend` directory.
- Wrong password: update the password segment in `DATABASE_URL`, then retry a
  simple `psql` connection or `python scripts/check_backend.py`.
- Database does not exist: create `hrmind_mailops` before running Alembic.
- Alembic migration failed: confirm `DATABASE_URL` starts with
  `postgresql+psycopg://`, PostgreSQL is reachable, and the database user can
  create tables.

# Aedify-Management

This repository contains:

- Frontend dashboard app in `dashboard/`
- Backend API server in `server/`

## Quick start

### Backend (API + database)

1) Create a Postgres database and set `DATABASE_URL` (example):

```bash
set DATABASE_URL=postgres://postgres:postgres@localhost:5432/aedify
```

2) Start the backend (this will auto-apply `server/sql/001_bootstrap.sql` on each `npm run dev`):

```bash
cd server
npm install
npm run dev
```

Backend health check: http://localhost:3001/health

### Frontend (dashboard)

```bash
cd dashboard
npm install
npm run dev
```

Open http://localhost:3000

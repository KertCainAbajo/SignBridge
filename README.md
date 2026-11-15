# SignBridge

Monorepo with a Laravel API backend and a React web frontend.

```
backend/   Laravel 13 API (Sanctum auth, SQLite by default)
frontend/  React 19 + TypeScript + Vite (axios, react-router)
```

## Requirements

- PHP 8.3+ and Composer
- Node.js 20+ and npm

## First-time setup

```bash
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate

# Frontend
cd ../frontend
npm install
```

## Running locally

Open two terminals:

```bash
# Terminal 1 – API on http://localhost:8000
cd backend
php artisan serve

# Terminal 2 – website on http://localhost:5173
cd frontend
npm run dev
```

The Vite dev server proxies `/api/*` to Laravel, so the frontend calls `api.get('/health')`
(see `frontend/src/lib/api.ts`). Open http://localhost:5173 — it should say **Backend connected**.

## Configuration

- `backend/.env` → `FRONTEND_URL` lists allowed CORS origins (comma-separated).
- `frontend/.env` → `VITE_API_URL` is the backend URL in production (leave empty in dev).
- API routes live in `backend/routes/api.php`; auth uses Sanctum bearer tokens
  (usable by both the website and a future mobile app).

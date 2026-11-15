# SignBridge

AI-assisted Filipino Sign Language (FSL) communication and learning platform.
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design and roadmap.

```
backend/   Laravel 13 REST API (Sanctum SPA auth, spatie roles/permissions)
frontend/  React 19 + TypeScript + Vite + Tailwind CSS 4
docs/      Architecture & plan
```

## Requirements

- PHP 8.3+ and Composer
- Node.js 20+ and npm
- MySQL 8 (local development) — production uses PostgreSQL on Supabase

## First-time setup

```bash
# Backend
cd backend
composer install
cp .env.example .env          # then set DB_* and SUPERADMIN_* values
php artisan key:generate
php artisan migrate
php artisan db:seed           # creates roles/permissions + the first super admin

# Frontend
cd ../frontend
npm install
```

## Running locally

Two terminals:

```bash
cd backend  && php artisan serve    # API  → http://localhost:8000
cd frontend && npm run dev          # Site → http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` and `/sanctum` to Laravel,
so cookie-based login works without extra configuration.

## Roles

| Role | Can do |
|---|---|
| `user` | Translator, speech tools, learning, quizzes, own history and settings |
| `admin` | + manage users, content, quizzes, view analytics |
| `super_admin` | + manage admin accounts and system settings |

New registrations get `user`. The first `super_admin` comes from `SUPERADMIN_EMAIL` /
`SUPERADMIN_PASSWORD` in `backend/.env` when you run `php artisan db:seed`.

## Tests

```bash
cd backend  && php artisan test
cd frontend && npm run build && npm run lint
```

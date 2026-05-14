# BESTSOL ERP System

BESTSOL is a business management and ERP-style system with:

- Next.js frontend
- Laravel API backend
- Sanctum authentication
- Roles and permissions
- Sales, purchases, stock, finance, reports, POS, customers, suppliers, settings

## Project Structure

```text
bestsol-frontend-ui/
├── app/                 # Next.js app router pages
├── components/          # shared UI and layout components
├── lib/                 # frontend helpers and API client
├── public/              # static assets
└── backend/             # Laravel API backend
```

## Requirements

- Node.js 20+
- npm
- PHP 8.3+
- Composer

## Frontend Setup

```bash
npm install
npm run build
npm run dev
```

Frontend runs on:

```text
http://localhost:3000
```

## Backend Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

Backend runs on:

```text
http://127.0.0.1:8000
```

Frontend local environment:

```bash
cp .env.example .env.local
```

Seeded admin:

```text
email: admin@bestsol.az
password: password
```

## Useful Commands

Frontend:

```bash
npm run build
```

Backend:

```bash
cd backend
php artisan test
php artisan route:list --path=api
```

## GitHub Upload Notes

These files and folders are already ignored:

- `node_modules`
- `.next`
- `backend/vendor`
- `backend/.env`
- `backend/database/*.sqlite`
- logs, cache, local editor files

Before pushing, make sure:

1. `backend/.env` is not committed
2. `backend/vendor` is not committed
3. `node_modules` and `.next` are not committed
4. any local secrets are kept only in `.env`

## Deployment

GitHub itself only stores code. It does not run your Laravel backend automatically.

If you uploaded the whole folder to GitHub and opened the frontend somewhere, backend data will not come until you deploy the backend separately and connect the frontend to that backend URL.

Recommended setup:

1. Deploy frontend to Vercel
2. Deploy `backend/` Laravel API to Railway, Render, VPS, or shared hosting
3. In frontend environment variables set:

```env
NEXT_PUBLIC_BACKEND_API_URL=https://your-backend-domain.com/api
```

4. In backend `.env` set:

```env
APP_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

5. In backend `config/cors.php`, allow your frontend domain if needed

Example:

- Frontend: `https://bestsol.vercel.app`
- Backend: `https://bestsol-api.up.railway.app`
- Frontend env:

```env
NEXT_PUBLIC_BACKEND_API_URL=https://bestsol-api.up.railway.app/api
```

## Create and Push Repository

If this folder is not yet a git repository:

```bash
cd /Users/theminalii/Downloads/bestsol-frontend-ui
git init
git add .
git commit -m "Initial BESTSOL ERP system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

If git is already initialized:

```bash
git add .
git commit -m "Prepare BESTSOL for GitHub"
git push
```

## Notes

- Frontend and backend are in the same repository.
- Backend local development is currently prepared to run on `127.0.0.1:8000`.
- Settings, sales, purchases, products, stock, warehouses, finance, reports, customers, suppliers and POS are wired to the backend API.
# best.cervision.com
# bestsol.cervision.com

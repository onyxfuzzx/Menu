# Menu - Digital Restaurant Menu Platform

A full-stack platform for creating, managing, and serving digital menus for restaurants. Customers scan a QR code, browse the menu on their phone, and staff manage everything through a role-based dashboard.

---

## Features

| Feature | Description |
|---|---|
| Customer Menu | Mobile-friendly menu page, accessible via QR code (`/restaurant/:id/menu`) |
| Role-Based Auth | JWT-secured roles: `SuperAdmin`, `RestroAdmin`, `Chef`, `Waiter` |
| Menu Studio | Drag-and-drop menu editor for categories and items |
| OCR Ingestion | Paste AI-extracted JSON (e.g., from Kimi) -> backend validates and saves |
| Admin Dashboard | Super-admin overview of all restaurants |
| Chef and Waiter Views | Role-specific dashboards for kitchen and front-of-house staff |
| Image Storage | S3-compatible storage via Supabase |
| Redis Caching | Distributed cache + pub/sub alerts |
| QR Code Generation | Per-restaurant QR codes generated in-app |

---

## Architecture

```
Menu/
├── frontend/      # React 19 + Vite + TypeScript + Tailwind CSS
└── backend/       # ASP.NET Core (.NET) + PostgreSQL + Redis
```

### Frontend Stack

- **React 19** with **TypeScript**
- **Vite** as the build tool
- **Tailwind CSS** for styling
- **React Router v6** for navigation
- **TanStack Query** for server state
- **Zustand + Immer + Zundo** for local state + undo history
- **Framer Motion** for page transitions and animations
- **@dnd-kit** for drag-and-drop menu editing
- **Lucide React** for icons
- **Sonner** for toast notifications
- **html5-qrcode / qr-code-styling** for QR scanning and generation

### Backend Stack

- **ASP.NET Core** Web API
- **Entity Framework Core** with **PostgreSQL** (via Npgsql)
- **JWT Bearer Authentication**
- **FluentValidation** for request validation
- **Redis** (StackExchange.Redis) for caching and pub/sub
- **Serilog** for structured logging
- **Supabase S3** for image storage
- **Swagger / OpenAPI** for API documentation

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [.NET SDK](https://dotnet.microsoft.com/) >= 10
- [PostgreSQL](https://www.postgresql.org/) running locally or via a cloud provider
- [Redis](https://redis.io/) running locally or via a cloud provider

---

### 1. Clone the repo

```bash
git clone <repo-url>
cd Menu
```

---

### 2. Backend Setup

```bash
cd backend
```

Copy the example config:

```bash
Copy-Item appsettings.Example.json appsettings.Local.json
```

Edit the ignored `appsettings.Local.json` and fill in your values (including `Storage:S3` settings). This local file is excluded from build/publish output. Production deployments should inject environment variables or a secret store. Environment variables override local settings; development user-secrets also override the local file.

Never commit real credentials. Previously exposed credentials must be rotated with the database/storage providers and the JWT signing secret replaced. Existing local values were preserved during the security cleanup; they have not been rotated.

Example configuration:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=menu_db;Username=YOUR_USER;Password=YOUR_PASSWORD"
  },
  "Jwt": {
    "Secret": "REPLACE_WITH_A_RANDOM_STRING_AT_LEAST_32_CHARS_LONG"
  },
  "Seed": {
    "SuperAdminPassword": "REPLACE_IN_PRODUCTION"
  }
}
```

> **Tip:** Use `dotnet user-secrets` to avoid committing secrets:
> ```bash
> dotnet user-secrets set "Jwt:Secret" "your-secret-here"
> ```

Run migrations and start the API:

```bash
dotnet ef database update
dotnet run
```

The API will be available at `http://localhost:5010` (or the port shown in your terminal).
Swagger UI: `http://localhost:5010/swagger`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dev server will start at `http://localhost:5180`.

---

## Routes

| Path | Access | Description |
|---|---|---|
| `/login` | Public | Login page |
| `/restaurant/:id/menu` | Public | Customer-facing menu (QR landing page) |
| `/admin` | SuperAdmin | Super-admin dashboard |
| `/restro-admin` | RestroAdmin | Restaurant admin dashboard |
| `/restaurant/:id/manage` | RestroAdmin, SuperAdmin | Menu Studio (drag-and-drop editor) |
| `/restro-admin/ocr` | SuperAdmin | OCR ingestion dashboard |
| `/restaurant/:id/category/:name` | SuperAdmin | JSON paste screen (OCR workflow) |
| `/restaurant/:id/review` | SuperAdmin | Full menu review and edit |
| `/chef` | Chef | Kitchen view |
| `/waiter` | Waiter | Front-of-house view |

---

## Roles

| Role | Permissions |
|---|---|
| `SuperAdmin` | Full access to all restaurants, OCR ingestion, admin panel |
| `RestroAdmin` | Manage their own restaurant's menu, items, and staff |
| `Chef` | View incoming orders in the kitchen dashboard |
| `Waiter` | Take and manage table orders |

---

## Environment and Configuration

| Key | Description |
|---|---|
| `ConnectionStrings:DefaultConnection` | PostgreSQL connection string |
| `Jwt:Secret` | HS256 signing secret (min 32 chars) |
| `Seed:SuperAdminPassword` | Initial super-admin password (seeded on first run) |
| `Redis:ConnectionString` | Redis connection string (default: `localhost:6379`) |
| `Redis:InstanceName` | Redis key prefix (default: `optionc:`) |

---

## Scripts

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run oxlint |

### Backend

| Command | Description |
|---|---|
| `dotnet run` | Start the API |
| `dotnet ef database update` | Apply pending migrations |
| `dotnet ef migrations add <Name>` | Create a new migration |

---

## Project Structure

```
frontend/src/
├── components/        # Shared and feature components (dashboard, editor, paste, etc.)
├── pages/             # Route-level pages (admin, chef, customer, waiter, auth)
├── store/             # Zustand stores
├── services/          # API service layer (axios)
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
├── utils/             # Helper utilities
└── lib/               # Third-party library wrappers

backend/
├── Controllers/       # API controllers
├── Services/          # Business logic (OCR engine, cache, storage, etc.)
├── Models/            # EF Core entity models
├── DTOs/              # Request/response data transfer objects
├── Data/              # DbContext and migrations
└── Seed/              # Database seeding logic
```

---

## License

This project is private. All rights reserved.


## Zaika sample menu

The explicit seed command adds 24 sample dishes across Starters, Main Course, Rice & Biryani, Breads, Desserts and Beverages to the existing Zaika restaurant. It preserves existing items/prices, skips matching dish names on repeat runs, and refuses missing or ambiguous restaurant matches. Sample prices are for testing.

Run from `backend` (the separate build output lets an existing API keep running):

```powershell
dotnet build --no-restore --output bin/ZaikaSeed -p:UseAppHost=false
dotnet bin/ZaikaSeed/MenuOcrEngine.dll --seed-zaika=true
```

This command does not run migrations, reset data, create staff, or start another API server. It uses the configured database and evicts Zaika's menu cache when Redis is available. Refresh the customer menu or Menu Studio after seeding.

## Security regression tests

```powershell
dotnet test tests/Backend.Tests/Backend.Tests.csproj
```

These tests use isolated in-memory persistence and ASP.NET TestServer; they do not run application startup migrations or contact configured PostgreSQL, Redis or storage services. They cover protected menu endpoints, role and restaurant boundaries, token revocation after account changes, inactive restaurants (including warm menu caches), and login throttling. PostgreSQL transaction/concurrency tests remain part of the next implementation phase.

All existing users must sign in again after this security update: access tokens now include a credential version and are checked against current account/restaurant state on every authenticated request. Public customer menu reads, waiter calls, login and image normalization remain explicitly anonymous. Menu ingestion and image administration require SuperAdmin; restaurant administrators can edit only their own active restaurant.

Request limits are per process/IP: login 10/minute, waiter calls 20/minute, normalization 60/minute. Configure trusted forwarded headers at the deployment boundary before relying on client IPs behind a reverse proxy; multiple replicas need a shared limiter if cluster-wide limits are required.

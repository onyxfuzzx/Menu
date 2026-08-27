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
- [.NET SDK](https://dotnet.microsoft.com/) >= 8
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
cp appsettings.Example.json appsettings.json
```

Edit `appsettings.json` and fill in your values:

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

The API will be available at `https://localhost:5001` (or the port shown in your terminal).
Swagger UI: `https://localhost:5001/swagger`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dev server will start at `http://localhost:5173`.

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

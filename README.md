# Menu OCR Engine - Option-C

A full-stack restaurant menu management platform built around a **manual JSON OCR workflow**. Users extract menu data from images using an AI tool (e.g. Kimi), paste the resulting JSON into the app, and the backend validates, deduplicates, and persists it into a structured database, ultimately powering a live customer-facing digital menu with QR code access, table ordering, and real-time kitchen/waiter alerts.

---

## Features

### Menu OCR Pipeline

- **JSON paste workflow** - paste AI-extracted menu JSON; backend validates structure and content
- **Deduplication engine** - prevents duplicate menu items across paste operations
- **Image normalization funnel** - 3-phase image pipeline (Phase 1 -> 2 -> 3) for standardising food item images
- **Suggestor service** - food item name suggestions during OCR review
- **Validation error reports** - structured error feedback with actionable messages

### Multi-Tenant Restaurant Management

- **SuperAdmin** - manages all restaurants, runs OCR ingestion, assigns RestroAdmins
- **RestroAdmin** - manages their restaurant's menu via Menu Studio (drag-and-drop editor)
- **Menu Studio** - full drag-and-drop menu editor with category/subcategory/item management
- **QR Code generation** - each restaurant gets a unique QR code that links to its digital menu

### Customer-Facing Digital Menu

- Responsive digital menu at `/restaurant/:id/menu`
- Browse categories, subcategories, and items with images and prices
- **Table ordering** - customers scan a table QR, browse the menu, and place orders directly

### Kitchen and Front-of-House

- **Chef dashboard** - real-time incoming order queue with status updates
- **Waiter dashboard** - manages tables, sees alerts, handles order workflow
- **Real-time alerts** - Redis pub/sub powers instant waiter call and order notifications

### Authentication and Authorisation

- JWT-based authentication
- Role-based access control: `SuperAdmin`, `RestroAdmin`, `Chef`, `Waiter`
- Protected routes on both frontend and backend

---

## Architecture

```
Menu/
├── backend/        # ASP.NET Core 8 Web API
└── frontend/       # React 19 + Vite SPA
```

### Backend - ASP.NET Core 8

| Layer | Tech |
|---|---|
| Framework | ASP.NET Core 8 (.NET 8) |
| Database | PostgreSQL via EF Core + Npgsql |
| Cache | Redis (StackExchange.Redis) |
| Auth | JWT Bearer |
| Validation | FluentValidation |
| Storage | AWS S3-compatible (Supabase Storage) |
| Logging | Serilog |
| API Docs | Swagger / OpenAPI |
| Password Hashing | BCrypt.Net |

### Frontend - React 19 + Vite

| Layer | Tech |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | TailwindCSS 3 |
| Routing | React Router DOM v6 |
| State | Zustand + Immer + Zundo (undo/redo) |
| Data Fetching | TanStack Query v5 |
| Drag and Drop | dnd-kit |
| Animations | Framer Motion |
| QR Codes | react-qr-code + qr-code-styling |
| Image Export | html-to-image |
| Icons | Lucide React |
| Toasts | Sonner |
| HTTP | Axios |

---

## API Endpoints (Summary)

| Controller | Base Route | Description |
|---|---|---|
| `AuthController` | `/api/auth` | Login, token management |
| `AdminController` | `/api/admin` | SuperAdmin - restaurants, users |
| `RestroAdminController` | `/api/restro-admin` | RestroAdmin - their own restaurant |
| `MenuOcrController` | `/api/menu-ocr` | OCR paste, validate, save, review |
| `OrdersController` | `/api/orders` | Customer orders, status updates |
| `SessionsController` | `/api/sessions` | Table sessions and QR scan flow |
| `AlertsController` | `/api/alerts` | Waiter alerts via SSE / Redis |
| `Phase1ImageController` | `/api/phase1` | Image funnel - Phase 1 |
| `Phase2ImageController` | `/api/phase2` | Image funnel - Phase 2 |
| `Phase3ImageController` | `/api/phase3` | Image funnel - Phase 3 (CRUD + aliases) |
| `NormalizeImageController` | `/api/normalize` | Trigger normalization engine |
| `SuggestorController` | `/api/suggestor` | Food item name suggestions |
| `UnmatchedLogController` | `/api/unmatched` | Logs of unmatched OCR items |

Interactive docs available at **`/swagger`** when running in Development mode.

---

## Frontend Routes

| Route | Role | Description |
|---|---|---|
| `/login` | Public | Login page |
| `/restaurant/:id/menu` | Public | Customer-facing digital menu |
| `/admin` | SuperAdmin | Admin dashboard |
| `/restro-admin` | RestroAdmin | Restaurant dashboard |
| `/restaurant/:id/manage` | RestroAdmin, SuperAdmin | Menu Studio (drag-and-drop editor) |
| `/restro-admin/ocr` | SuperAdmin | OCR pipeline dashboard |
| `/restaurant/:id/category/:name` | SuperAdmin | JSON paste screen for a category |
| `/restaurant/:id/edit/:categoryId` | SuperAdmin | Editor screen for a specific category |
| `/restaurant/:id/review` | SuperAdmin | Full-menu review before publishing |
| `/chef` | Chef | Kitchen order queue |
| `/waiter` | Waiter | Table and order management |

---

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8)
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/) (local or remote)

### Backend Setup

```bash
cd backend
```

1. **Configure settings** - copy the example config and fill in your values:
   ```bash
   cp appsettings.Example.json appsettings.json
   ```
   Edit `appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=YOUR_HOST;Port=5432;Database=postgres;Username=YOUR_USER;Password=YOUR_PASSWORD"
     },
     "Jwt": {
       "Secret": "REPLACE_WITH_A_RANDOM_STRING_AT_LEAST_32_CHARS_LONG"
     },
     "Seed": {
       "SuperAdminPassword": "REPLACE_IN_PRODUCTION"
     },
     "Redis": {
       "ConnectionString": "localhost:6379",
       "InstanceName": "optionc:"
     }
   }
   ```

   > **Tip:** Use `dotnet user-secrets` to avoid committing secrets:
   > ```bash
   > dotnet user-secrets set "Jwt:Secret" "your_secret_here"
   > ```

2. **Run the API** - migrations and seeding happen automatically on startup:
   ```bash
   dotnet run
   ```
   The API will be available at `http://localhost:5010` (or the port shown in the console).
   Swagger UI: `http://localhost:5010/swagger`

3. **Manual migration** (if auto-migration fails):
   ```bash
   dotnet ef database update
   ```

### Frontend Setup

```bash
cd frontend
```

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the dev server:**
   ```bash
   npm run dev
   ```
   The app runs on `http://localhost:5180` by default.

3. **Build for production:**
   ```bash
   npm run build
   ```

### Frontend Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and production build |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview production build |

---

## Configuration Reference

### Backend (`appsettings.json`)

| Key | Description |
|---|---|
| `ConnectionStrings:DefaultConnection` | PostgreSQL connection string |
| `Jwt:Secret` | HMAC-SHA256 signing key (32+ chars) |
| `Seed:SuperAdminPassword` | Initial super-admin password set on first seed |
| `Redis:ConnectionString` | Redis host (e.g. `localhost:6379`) |
| `Redis:InstanceName` | Key prefix for Redis entries |
| `Storage:S3:*` | S3-compatible storage credentials (Supabase/AWS) |

### Environment Variables (Production)

Override any setting using double-underscore (`__`) as the separator:

```bash
export ConnectionStrings__DefaultConnection="..."
export Jwt__Secret="..."
export Redis__ConnectionString="redis-host:6379"
```

---

## Key Backend Services

| Service | Description |
|---|---|
| `JsonValidator` | Validates pasted OCR JSON against the menu schema |
| `DeduplicationService` | Merges duplicate items across categories |
| `EngineCacheService` | Singleton in-memory snapshot of the normalization engine |
| `NormalizationEngineService` | Matches food images through the 3-phase funnel |
| `SuggestorService` | Suggests food item names from the known name database |
| `CacheService` | Typed cache-aside pattern over Redis |
| `AlertPublisher` | Redis pub/sub publisher for real-time waiter alerts |
| `S3StorageService` | Upload/delete images to S3-compatible storage |
| `ErrorReportFormatter` | Formats validation errors into human-readable reports |

---

## Tech Stack Summary

| | Technology |
|---|---|
| **Backend** | ASP.NET Core 8, EF Core, PostgreSQL, Redis, JWT, Serilog, Swagger |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS, Zustand, TanStack Query, dnd-kit |
| **Storage** | Supabase S3-compatible object storage |
| **Auth** | JWT Bearer tokens with role-based access control |

---

## License

This project is private. All rights reserved.

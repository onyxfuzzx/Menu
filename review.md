# Backend and Frontend Code Review

Review date: 2026-10-30

## Implementation progress

The findings below record the original review. Implementation has started with Phase 1:

- **Implemented:** B01 (role/tenant protection on menu writes), B09 (live account checks on JWTs), B10 (inactive restaurants denied at login, authenticated requests, public menu reads before cache access, and waiter calls), and F04 (menu bearer headers). New fallback authorization protects endpoints unless explicitly anonymous; image-administration endpoints require SuperAdmin.
- **Secret cleanup implemented, rotation pending:** B02 credential literals/defaults removed, tracked settings sanitized, fixed reset password removed, and existing machine configuration moved to ignored `backend/appsettings.Local.json`, excluded from build/publish output. Provider-side credential rotation and history remediation have not been performed. Existing local values were preserved, not rotated.
- **Related fixes:** F07 customer settings writes removed; server default values respected; theme success appears after persistence. F08 structured HTTP errors preserved for image conflicts. Protected menu/image/order/session clients clear rejected tokens. Per-IP fixed-window limits added for login (10/min), waiter calls (20/min), and public normalization (60/min); these limits are per process and require deployment-aware proxy/distributed configuration when scaling.
- **Session compatibility:** Existing tokens lack the new credential-version claim and require sign-in again. User deletion, role/restaurant reassignment, password-hash changes, and restaurant suspension invalidate access on the next request. The account lookup deliberately uses the database on each authenticated request to avoid a revocation delay.
- **Validation:** All 20 backend security integration tests pass at `tests/Backend.Tests`, using real MVC/JWT middleware with isolated in-memory persistence and cache/publisher substitutes. Frontend production build and lint pass; the existing 8 lint warnings and large bundle warning remain. No live database, Redis, or S3 operations were performed.
- **Next phase:** B03/B04 and F01–F03: atomic stable-ID category saves and reliable autosave/partial-save handling. Other review findings remain open unless explicitly described above.

## Scope and verification

Reviewed the ASP.NET Core backend and React frontend, concentrating on authentication, tenant isolation, menu ingestion/editing/publishing, order creation and settlement, image storage and normalization, caching, client state, error handling, accessibility, and build configuration. Findings below are based on the checked-out source. This is a repository review, not a live penetration test or a dependency vulnerability audit.

Validation performed:

| Check | Result |
| --- | --- |
| `dotnet build --no-restore` in `backend` | Passed: 0 warnings, 0 errors, using existing restored dependencies. |
| `npm.cmd run build` in `frontend` | Passed: TypeScript and Vite production build. Main JS chunk: 1,353.92 kB minified / 393.57 kB gzip; Vite reported a large-chunk warning. |
| `npm.cmd run lint` in `frontend` | Passed with 8 warnings: 4 component-export warnings, 3 hook warnings (`CustomerMenuGrid` and `MenuManagerPage`), and 1 unused variable in the restaurant editor. |
| Automated behavioral tests / CI | No tracked test suite or CI workflow found. No application tests were added for this review. |
| Database, Redis, storage, camera and browser integration | Not exercised. Starting the backend automatically runs migrations and seeding; this review did not run it against configured infrastructure. |

At the original review baseline, only this report was added. Subsequent application changes are tracked in Implementation progress above. Build output goes into ignored build directories.

Severity: **Critical** = address before exposing the service; **High** = security, data loss, or billing/workflow correctness; **Medium** = reliability, performance, or user-facing defects. Reproduction steps are proposed regression checks unless explicitly listed above as executed.

## Highest priorities

1. Protect menu write endpoints and enforce restaurant ownership on the server.
2. Rotate exposed credentials and remove credentials from source/defaults.
3. Make category replacement transactional and preserve item IDs.
4. Fix save failure handling, request ordering, and partial-save data loss.
5. Validate order prices, item ownership, staff permissions, and state transitions on the backend.

## Backend findings

### B01 — Critical: menu mutations are publicly accessible

**Locations:** `backend/Controllers/MenuOcrController.cs:25`, `:104`, `:269`, `:317`, `:427`, `:456`, `:534`, `:605`, `:661`; `backend/Program.cs:176`.

The menu controller has no `[Authorize]` attributes, and the application has no fallback policy requiring authentication. Unauthenticated callers can save categories, replace or delete categories/items, confirm categories, and change restaurant settings. The settings endpoint even creates a restaurant when the supplied ID does not exist. The public menu response exposes category and item IDs, so IDs are not an access control boundary. Frontend route guards cannot protect these APIs.

**Change:** Require explicit roles on all writes. Resolve the target restaurant through category/subcategory/item relationships and compare it to the authenticated restaurant claim; allow an explicit SuperAdmin override. Restrict OCR ingestion to its intended role. Keep only intentional customer reads anonymous. Return 404 for missing restaurants in settings instead of creating them implicitly. Add a default authenticated policy with explicit anonymous exceptions.

**Verify:** Anonymous writes return 401; Chef/Waiter writes return 403; Restaurant A's admin cannot modify Restaurant B through any ID-based endpoint. Public menu reads still work.

### B02 — Critical: credentials are present in tracked configuration and code

**Locations:** `backend/Services/S3StorageService.cs:24`, `:25`; tracked `backend/appsettings.json`; `.gitignore`.

The storage service contains literal access-key and secret-key fallbacks. Tracked application configuration also contains populated database, JWT, and S3 settings. Credential validity was not tested. Treat credential values exposed through source control as compromised until invalidated; deleting the current lines does not revoke copies in history.

**Change:** Rotate the storage credentials, JWT signing secret, and any real database credentials stored in the tracked configuration. Remove credential defaults and fail startup when required production settings are missing. Inject secrets through environment variables, user-secrets, or the deployment secret store. Keep a placeholder-only example and add automated secret scanning. Coordinate any history cleanup after rotation; avoid copying secrets into tickets or logs.

**Verify:** A fresh checkout contains no usable secrets, missing production configuration fails clearly, and old credentials/tokens no longer work.

### B03 — High: category replacement deletes live data outside a transaction

**Location:** `backend/Controllers/MenuOcrController.cs:321`, especially `:341`–`:394`.

`SyncCategory` executes three immediate bulk deletes before rebuilding and calling `SaveChangesAsync`. Those deletes are not covered by the later implicit SaveChanges transaction, despite comments describing the operation as atomic. A failure after the first delete can leave missing prices/items/subcategories. Overlapping syncs can also interleave deletes and inserts, producing lost or combined snapshots.

**Change:** Execute the entire read/delete/write operation inside one explicit transaction using the configured EF execution strategy. Serialize updates to a category or require a revision/concurrency token and reject stale writes with 409. Prefer updating the existing graph rather than replacing it wholesale.

**Verify:** Inject failures after every delete and before insert: the original graph must remain intact. Send overlapping updates and verify one coherent snapshot wins or the stale request receives 409.

### B04 — High: saving a category changes every item's identity

**Locations:** `backend/Controllers/MenuOcrController.cs:349`, `:855`; `backend/DTOs/MenuDtos.cs` (`SyncItemRequest`); `backend/Data/AppDbContext.cs` (`OrderItem` relationship).

Every sync deletes and recreates items/prices; sync payloads contain no persisted item IDs. Even renaming a category therefore changes all its item IDs. Existing customer QR codes and cart references become stale, and the `SetNull` delete behavior removes `OrderItem.MenuItemId` links from historical orders. A stale QR then reaches the frontend's zero-price unknown-item fallback (F05).

**Change:** Include stable IDs in sync DTOs, validate that they belong to the scoped category, and diff/update existing rows. Delete only intentionally removed items. Preserve historical order snapshots and define how discontinued menu references behave. Use stable price-variant IDs as well.

**Verify:** Renaming a category or editing a description preserves unaffected item/variant IDs and historical order links. An older QR resolves an unchanged item after an unrelated edit.

### B05 — High: order creation trusts client-supplied prices and item ownership

**Location:** `backend/Controllers/OrdersController.cs:174`, `:249`–`:261`.

The API copies `ItemName`, `Price`, and `MenuItemId` directly from the request and calculates totals from those prices. Only a minimum quantity is checked. An authorized client can submit negative/arbitrary prices or reference an existing menu item from another restaurant. A foreign key confirms existence, not restaurant ownership. Null item IDs also allow unpriced custom lines without a separate permission or approval path.

**Change:** Accept item ID, selected variant ID, quantity and notes; load the scoped menu entries and derive names/prices/totals on the server. Reject unavailable or foreign items. If custom lines or price overrides are required, model them explicitly with role restrictions and an audit record. Bound quantity, line count, text length, and amount precision/range.

**Verify:** Modified prices, foreign item IDs, negative amounts, oversized quantities, missing variants, and unavailable items are rejected without creating an order/session.

### B06 — High: order state changes lack transition and role rules

**Location:** `backend/Controllers/OrdersController.cs:289`–`:347`.

Any Chef or Waiter in the restaurant can submit any parsable status, including Paid or Cancelled, or move a Paid order back to Preparing. There is no previous-state check, role-specific transition rule, or concurrency guard. Repeating Ready creates another alert. `Enum.TryParse` alone also accepts numeric strings representing undefined enum values. Marking an individual order Paid does not settle its session.

**Change:** Define an explicit state machine and allowed transitions per role. Validate enum membership, reject invalid/backward transitions, make repeated requests idempotent, and use a version check. Route settlement through one operation that maintains order/session consistency and records who changed what.

**Verify:** Chefs cannot settle bills; Paid/Cancelled orders cannot re-enter the kitchen flow; undefined numeric statuses fail; duplicate Ready requests do not duplicate alerts; concurrent transitions cannot overwrite newer state.

### B07 — High: waiter ownership is enforced on lists but not writes

**Locations:** `backend/Controllers/SessionsController.cs:167`; `backend/Controllers/OrdersController.cs:289`; `backend/Controllers/AlertsController.cs:119`.

List endpoints limit waiters to their own sessions/orders or targeted alerts. Mutation endpoints only compare restaurant IDs. A waiter who obtains another waiter's object ID can settle that session, change its orders, or dismiss its alerts, bypassing the ownership rule used for reads.

**Change:** Apply the same waiter ownership predicate to writes through shared authorization policies/services. Permit reassignment and restaurant-wide overrides only through explicit admin permissions. Ensure the ownership check and mutation cannot race.

**Verify:** Waiter A cannot mutate Waiter B's session/order/targeted alert, while restaurant admins can perform intended overrides.

### B08 — High: session creation and settlement can race

**Locations:** `backend/Controllers/OrdersController.cs:210`–`:236`; `backend/Controllers/SessionsController.cs:167`; `backend/Data/AppDbContext.cs` (`TableSession` index).

Session creation performs a lookup followed by an insert with no unique open-session constraint. Concurrent orders can create duplicate open tabs. Settlement reads the current order collection and marks it Paid; a concurrent create can attach another Pending order to that session before settlement commits, leaving a Paid session with an unpaid order. The waiter filter can also create separate open tabs for the same physical table; the intended ownership rule needs to be explicit.

**Change:** Define whether one table has one open tab or one tab per waiter. Enforce that invariant with an appropriate filtered unique index and a transaction/locking or retry strategy. Coordinate order attachment and settlement using the same session lock/version. Add an idempotency key to order creation to prevent duplicate orders after network retries.

**Verify:** Parallel creates obey the chosen tab invariant. Creating while paying cannot produce a Paid session containing a Pending order. Retrying one order request does not create a second billable order.

### B09 — High: deleted staff keep access through existing JWTs

**Locations:** `backend/Controllers/AuthController.cs:78`; `backend/Controllers/RestroAdminController.cs:132`; `backend/Program.cs:163`–`:175`.

Tokens last seven days. Deleting a staff row does not invalidate its token, and bearer validation does not check that the user still exists or is enabled. Most endpoints continue authorizing from the old role/restaurant claims. `GetUserNameAsync` returning null does not revoke those permissions.

**Change:** Add an account security stamp/token version or server-side session record validated on authenticated requests, with suitable caching and explicit invalidation. Use shorter access-token lifetimes and a revocable renewal/session mechanism. Revoke sessions when deleting staff or changing roles/tenant membership.

**Verify:** A token issued before staff deletion immediately loses access, including to create-order and status endpoints.

### B10 — High: disabling a restaurant does not disable its operations

**Locations:** `backend/Controllers/AdminController.cs:211`; `backend/Controllers/AuthController.cs:53`; `backend/Controllers/MenuOcrController.cs:204`; `backend/Controllers/OrdersController.cs:174`; `backend/Controllers/AlertsController.cs:141`.

The status toggle changes a string and admin caches, but login, public menu serving, order creation, and waiter calls do not enforce restaurant status. Existing JWTs continue working. If the toggle is intended as suspension, the current behavior does not implement it.

**Change:** Define which operations Inactive blocks, enforce that rule centrally, and check it before returning cached public responses. Invalidate the restaurant menu and relevant account/session caches on status changes.

**Verify:** A suspended restaurant behaves consistently for new logins, existing staff sessions, menu scans, ordering, and waiter calls.

### B11 — High: image publishing can delete a successfully committed image

**Location:** `backend/Controllers/Phase3ImageController.cs:105`–`:197`.

The outer compensation `catch` covers both the database transaction and the cache rebuild after commit. If `InvalidateAsync` fails after the image/aliases commit, the catch deletes the uploaded object while committed rows still reference it. Upload keys are deterministic per slug, so concurrent same-slug requests can overwrite or clean up each other's object. Also, `Conflict(body)` returns a `ConflictObjectResult`; checking `result is ConflictResult` misses those conflicts and their intended cleanup.

**Change:** Use a unique object key per upload attempt; distinguish pre-commit rollback cleanup from post-commit cache-refresh failure. Never delete committed storage as compensation for a cache error. Handle conflicts by status/result type correctly, map unique-constraint races to 409, and reconcile orphaned objects with a background job/outbox.

**Verify:** Force cache refresh to fail after commit: the image remains usable. Race same-slug uploads: the winner's image remains intact, the loser returns 409, and no unwanted objects remain.

### B12 — Medium: local image fallback URLs are not served by this application

**Locations:** `backend/Services/S3StorageService.cs:76`–`:91`; `backend/Program.cs:196`–`:200`; `frontend/vite.config.ts:17`.

Storage fallback writes under `wwwroot/uploads` and returns `/uploads/...`, but the backend never enables static-file serving. The frontend dev proxy forwards only `/api`, so the browser sends `/uploads` to the frontend server. The default engine fallback `/storage/food-images/system/default-food-plate.png` also has no matching tracked frontend asset or backend route. Unless external hosting supplies these paths, image URLs fail while upload requests report success.

**Change:** Use a durable, explicitly configured storage path and a served public URL. If retaining local fallback, configure static serving and the frontend/reverse-proxy route, and account for multiple replicas and ephemeral disks. Provide a real default image and verify its URL. Expose storage degradation through health/metrics.

**Verify:** With S3 unavailable, upload an image and fetch the returned URL through the actual frontend origin; repeat across instances/restarts where supported.

### B13 — Medium: public menu reads also act as publishing

**Locations:** `backend/Controllers/MenuOcrController.cs:204`–`:261`; `frontend/src/pages/customer/CustomerMenuPage.tsx:69`; `frontend/src/components/editor/EditorScreen.tsx:132`.

Customer loading and the Publish action both call `build-menu`. On a cache miss it writes `PageStatus.Completed` and returns every category regardless of confirmation status. Autosaved draft changes become public after cache invalidation, even before Publish; merely opening a customer URL also completes the page. A cache hit takes a different path and skips that write.

**Change:** Separate a side-effect-free public GET from an authenticated publish command. If publishing is an approval boundary, serve an immutable published revision and keep drafts separate. Make confirmation/status semantics explicit. If live editing is intended, remove misleading Publish/Confirm guarantees.

**Verify:** Reading a public menu never writes processing state; draft edits remain private until publish if that is the chosen workflow.

### B14 — Medium: menu cache survives restaurant deletion and image mapping changes

**Locations:** `backend/Controllers/AdminController.cs:249`–`:252`; `backend/Controllers/MenuOcrController.cs:209`; `backend/Controllers/Phase3ImageController.cs:181`, `:303`, `:322`.

Restaurant deletion evicts only admin caches, leaving `menu:{restaurantId}` accessible for up to ten minutes. Image-funnel mutations rebuild the engine cache but do not invalidate menu responses that already embed resolved image URLs; deleting an image can therefore leave menus serving its deleted URL. Concurrent read-and-fill can also repopulate an old response after a mutation's eviction.

**Change:** Centralize invalidation across restaurant/menu/image changes. Validate restaurant existence/status before serving cached public data. Consider versioned menu keys and an image-mapping revision so old reads cannot repopulate the current version. Explicitly invalidate/refetch affected frontend query keys, including `waiter-menu`.

**Verify:** Warm the cache, delete a restaurant or change/delete an image mapping, then fetch again: no deleted restaurant or stale image is returned.

### B15 — Medium: item CRUD cannot find imported subcategory items

**Locations:** `backend/Controllers/MenuOcrController.cs:609`, `:619`, `:664`, `:667`, `:805`, `:389`; `backend/Models/MenuItem.cs:17`.

Imported/synced subcategory items are attached through `MenuSubCategory.Items`, which sets the subcategory FK; their direct `MenuCategoryId` is null by design. Update/delete handlers require `i.MenuCategoryId == catId`, so these valid items return 404. `AddItem`, in contrast, sets both FKs when a subcategory is supplied, creating inconsistent representations.

**Change:** Standardize the ownership model and resolve a subcategory item's category through its parent. Use that same relationship predicate for authorization, update, and delete. Add database constraints for the intended direct-category/subcategory relationship.

**Verify:** Import a category with subcategories and update/delete one of its items via the item endpoints; equivalent newly added items behave the same way.

### B16 — Medium: unmatched-name deduplication is documented but missing from migrations

**Locations:** `backend/Data/AppDbContext.cs:300`; `backend/Services/NormalizationEngineService.cs:82`–`:106`; `backend/Migrations/20260813074743_AddImageFunnelTables.cs:93`.

Comments claim a daily unique index exists, but the tracked migration creates no such index. Each cache miss reaching fallback schedules an unbounded `Task.Run` that inserts a row; restarts, cache expiration, varying categories, and invalidations can repeatedly record the same name. Errors are silently swallowed. The resulting frequency is also cache-miss frequency rather than request frequency.

**Change:** Decide whether this measures daily unique names or demand volume. Add an explicit UTC-day deduplication key/unique index or aggregate counters accordingly. Use a bounded background queue/worker instead of a task per miss, and record genuine persistence failures separately from expected duplicates. Add retention and a paginated/protected analytics endpoint.

**Verify:** Repeated same-day misses obey the chosen counting rule across app instances, and a burst cannot create unbounded background work.

### B17 — Medium: image cache refresh is local to one process and can regress

**Location:** `backend/Services/EngineCacheService.cs:66`–`:140`.

Mutation refreshes only the singleton in the handling process. Other instances retain old mappings indefinitely. Within one process, concurrent rebuilds can finish out of order, and the alias/root/keyword/fallback fields are assigned individually rather than as one coherent snapshot. A lookup started before cache clear can also insert an old result after it.

**Change:** Publish a mapping version/invalidation event to all replicas. Serialize rebuilds or discard stale versions; swap one immutable snapshot atomically. Tie result-cache entries to the snapshot version to prevent stale reinsertion.

**Verify:** Update an alias through instance A and resolve it through instance B; force rebuild completion out of order and confirm the newest version stays active.

### B18 — Medium: startup can report a running API with failed schema initialization

**Locations:** `backend/Program.cs:205`–`:243`; `README.md` backend setup; `backend/Seed/DbResetUtility.cs:9`.

Migration failures are logged and startup continues. Engine-cache rebuild failure also leaves the API running with empty/default mappings. There is no readiness endpoint representing these dependencies. A fresh database has no normal startup path creating the first SuperAdmin: the documented `Seed:SuperAdminPassword` is unused; the only local utility creating one first deletes domain data and uses a hardcoded password. That utility is not called by startup.

**Change:** Use a controlled migration deployment step and fail readiness when the schema is unusable. Add bounded retries/recovery for engine initialization. Provide a non-destructive, idempotent first-admin provisioning command using supplied credentials, and remove fixed-password reset behavior. Correct setup docs: the project targets `net10.0`, and configured development ports are 5180/5010 rather than the README examples.

**Verify:** Provision a new database from documented steps without resetting it. Simulate migration/cache failure and verify meaningful readiness and recovery behavior.

## Frontend findings

### F01 — High: autosave failures do not stop publish or confirmation

**Locations:** `frontend/src/hooks/useCategoryAutosync.ts:84`–`:101`, `:135`–`:151`; `frontend/src/components/editor/EditorScreen.tsx:132`, `:158`.

`runSync` catches failures and returns normally. `flush` uses `Promise.allSettled` and never checks failures, so `await flush()` resolves even when edits were not saved. Publish/Confirm can then succeed, show success, and navigate away while the database still contains older content or a damaged replacement.

**Change:** Make flushing reject or return an explicit failure result. Await every outstanding save and require all current snapshots to be acknowledged before Publish/Confirm. Keep the user on the page with actionable retry feedback when saving fails.

**Verify:** Force sync to return 500: publish/confirm must not run or display success, and edits remain available for retry.

### F02 — High: autosave can send stale snapshots after newer edits or undo

**Location:** `frontend/src/hooks/useCategoryAutosync.ts:84`–`:151`.

Saves are not serialized per category. A second edit or `flush()` can overlap an existing request, letting an older request finish last and overwrite newer content. A pending timer is also not cleared when the user reverts to the baseline: edit A to B, undo to A before 800 ms, and the early return at line 119 leaves B's timer active. Save state can report dirty/saving indefinitely after that stale write.

**Change:** Maintain one per-category save queue, replace queued work with the latest snapshot, cancel stale timers on every change including reverts/removals, and track acknowledged revisions. Make flush await the queue and current in-flight promise rather than start duplicate requests. Pair this with backend revision checks (B03).

**Verify:** Use delayed responses to finish old saves last; final server state still matches the editor. Edit then undo inside the debounce window; no reverted content is persisted.

### F03 — High: partial Save All clears unsaved changes

**Location:** `frontend/src/pages/admin/components/restro-editor/useMenuEditorState.ts:347`–`:390`.

If any category saves successfully, the hook clears the entire dirty set, even for failed categories. Query invalidation then allows server reinitialization to overwrite those failed edits. Edits made while an earlier snapshot is saving are also cleared because there is no per-category version check.

**Change:** Track the revision/snapshot submitted for each category. Clear only successful categories whose current snapshot still matches the acknowledged one. Preserve failed and newly edited categories as dirty, and reconcile successful server responses without replacing unrelated drafts.

**Verify:** Save two dirty categories with one failing; the failed category remains dirty and editable after refetch. Make another edit while saving; that edit remains pending.

### F04 — High: the menu API client sends no bearer token

**Location:** `frontend/src/services/api.ts:4`; compare `frontend/src/services/imageFunnelApi.ts:18`.

The menu Axios instance does not attach the authenticated token. Menu writes currently work because the backend endpoints are anonymous. Securing B01 without changing this client will break legitimate editing and OCR operations.

**Change:** Attach the current token through a shared authenticated client for protected calls. Keep the public menu read explicit. Preserve HTTP status and structured validation/conflict details, and handle expired sessions consistently.

**Verify:** Inspect authenticated write requests for the bearer header; anonymous customer reads remain functional. A 401 produces a login flow rather than a misleading generic save error.

### F05 — High: QR scanning accepts stale/foreign orders and creates free unknown lines

**Location:** `frontend/src/pages/waiter/ScanOrderModal.tsx:34`–`:46`, `:64`–`:77`, `:109`–`:120`.

The scanner checks only the top-level type and a nonempty items array. It ignores `restro`, does not validate individual IDs/quantities, and maps unknown IDs to `Unknown item` with price zero. Submit then sends those lines with `menuItemId: null`, which the backend accepts. A QR from another restaurant or one made stale by category sync can therefore create an incorrect order. JSON such as `null` can also throw after parsing because the handler accesses `parsed.type` outside the parse catch.

**Change:** Validate the decoded payload with a runtime schema, enforce restaurant identity, bound item count and positive integer quantities, and block unknown/unavailable items. Re-resolve IDs and authoritative prices on the backend. Offer a clear refresh/review path for stale codes instead of creating placeholder lines.

**Verify:** Foreign-restaurant, stale-item, null, malformed-item, zero/negative/fractional quantity, and oversized QR payloads fail safely and cannot create an order.

### F06 — Medium: checkout totals disagree with stored bills and variants are lost

**Locations:** `frontend/src/pages/customer/components/CustomerCart.tsx:18`–`:22`, `:120`; `frontend/src/pages/customer/CustomerMenuPage.tsx:222`; `frontend/src/pages/customer/components/CustomerItemModal.tsx:22`; `frontend/src/pages/waiter/WaiterPage.tsx:39`; `frontend/src/pages/waiter/ScanOrderModal.tsx:47`.

The cart adds fixed tax percentages and an unconditional packing fee, but scanned/stored orders total only item prices. The displayed amount and eventual session bill therefore disagree. Customer and waiter ordering always take `prices[0]`; other menu variants cannot be selected, and the QR carries no variant identity. This is an implementation consistency finding, not an assessment of applicable tax rules.

**Change:** Define one server-owned quote/billing model with configured fees and explicit rounding. Use stable variant IDs through selection, cart, QR and order creation. Show variable/unavailable prices explicitly rather than silently turning missing prices into zero.

**Verify:** A multi-variant order keeps its chosen variant and the same line amounts/fees/total from customer summary through waiter confirmation and settled bill.

### F07 — Medium: customer visits can write stale theme/banner preferences to the server

**Location:** `frontend/src/pages/customer/CustomerMenuPage.tsx:85`–`:103`; `frontend/src/pages/admin/MenuManagerPage.tsx:39`–`:47`.

When the server theme is `default` or banner is empty, these effects treat local storage as authoritative and PUT it back to the restaurant. A returning customer can restore an old customization after an admin intentionally resets it. Rendering a public page unexpectedly mutates shared settings. The manager's theme action also shows Saved before awaiting the request and only logs failures.

**Change:** Make server settings authoritative, including explicit default/null values. Remove settings writes from customer rendering. Perform migrations only in an authenticated admin action; await confirmation, update query data, and show failure/rollback when a theme save fails. Distinguish omitted banner from an explicit clear operation in the API.

**Verify:** Set a restaurant back to default/remove its banner, then open a browser with stale local values: the server stays reset. A failed admin save never displays a successful persisted state.

### F08 — Medium: image conflict information is discarded before the UI uses it

**Locations:** `frontend/src/services/imageFunnelApi.ts:26`–`:36`; `frontend/src/pages/admin/components/ImageFunnelTab.tsx:100`–`:111`.

The interceptor replaces every Axios error with plain `Error(message)`. The upload handler expects `err.response.data` containing the 409 conflict and owner, so its conflict-specific UI cannot receive those details. The backend conflict body also lacks a generic `message` or `error`, producing generic feedback.

**Change:** Preserve the original Axios response or map it to a typed application error with status and conflict/validation fields. Parse the backend conflict schema once in the service layer.

**Verify:** Publish with an existing slug/alias: the interface identifies the owner and supports its intended conflict-resolution flow.

### F09 — Medium: SuperAdmin menu editing silently clears category emojis

**Locations:** `frontend/src/pages/admin/components/MenuEditorTab.tsx:118`, `:145`, `:176`; `backend/Controllers/MenuOcrController.cs:372`.

Every category-sync payload in this editor omits `emoji`. The backend treats a missing emoji as null and clears it. Editing an item, deleting an item, or renaming a category therefore resets unrelated category metadata. The payload is `any`, so TypeScript does not catch the missing required frontend sync field. Save failures are also swallowed in `handleSaveCategory`, after which modals close as if successful.

**Change:** Use a shared typed serializer that preserves every full-snapshot field, including emoji. Prefer targeted patches for small edits. Propagate save failures and keep modals open with retry feedback.

**Verify:** Set an emoji, edit an item's name, and confirm the emoji survives. Force a sync failure and confirm the modal retains its edits and shows an error.

### F10 — Medium: OCR editor state is not scoped or rehydrated by restaurant

**Locations:** `frontend/src/store/menuStore.ts:145`; `frontend/src/pages/admin/AdminPage.tsx:385`; `frontend/src/components/editor/EditorScreen.tsx:83`; `frontend/src/components/dashboard/Dashboard.tsx:17`.

Changing `restaurantId` does not clear/load categories or undo history. The editor reads the global category list without checking its restaurant against the route. Switching restaurants can show or sync the previous restaurant's categories while publishing the new route ID. A browser refresh, in contrast, loses the non-persisted OCR workspace and the editor does not reload its saved categories from the server.

**Change:** Key editor state by restaurant or clear and rehydrate it on a scoped route transition. Guard mismatched route/store IDs, reset undo history and account-specific drafts at appropriate boundaries, and fetch persisted content for direct editor navigation/refresh. If draft recovery is needed, persist it with restaurant and user identity.

**Verify:** Edit Restaurant A, switch to B, then undo/save: A's data cannot appear or be mutated through B's editor. Refresh/direct navigation restores the correct persisted menu.

### F11 — Medium: customer/menu loading failures appear as empty menus

**Locations:** `frontend/src/pages/customer/CustomerMenuPage.tsx:69`; `frontend/src/pages/admin/MenuManagerPage.tsx:31`; `frontend/src/pages/auth/LoginPage.tsx:32`.

Customer queries ignore loading/error state and fall back to an empty category array, so an outage or missing restaurant looks like an empty functioning menu. The manager does not surface query errors either. Login reports every non-2xx response, including server errors, as an invalid password. Error boundaries only handle render failures, not these request failures.

**Change:** Render separate loading, not-found/inactive, empty-menu, and recoverable-error states with retry controls. Disable ordering actions without valid menu data. Preserve meaningful server/status errors on login and protected calls.

**Verify:** Exercise offline, 404, 401, 500 and genuinely empty-menu responses; each has an accurate, usable state.

### F12 — Medium: category names are interpolated into an unescaped CSS selector

**Location:** `frontend/src/pages/customer/CustomerMenuPage.tsx:126`.

`document.querySelector` embeds the category name inside a quoted attribute selector. A valid category such as `Chef's "Specials"` can make the selector invalid and throw when the customer clicks its category button.

**Change:** Use element refs keyed by stable category IDs, or use correctly escaped selector values. IDs also avoid collisions between identically named categories.

**Verify:** Category names containing quotes, brackets, backslashes and Unicode navigate without exceptions.

### F13 — Medium: scanner cleanup can leave camera capture running

**Location:** `frontend/src/pages/waiter/ScanOrderModal.tsx:51`–`:104`.

If the modal unmounts while `scanner.start()` is pending, cleanup sees `started === false` and does not stop it. A later successful start sets `started = true` without checking `cancelled`, leaving a camera session after the UI closes. This is also exposed by development StrictMode's effect setup/cleanup cycle.

**Change:** Coordinate cleanup with the start promise and stop immediately if startup succeeds after cancellation. Serialize scanner lifecycle, guard decode callbacks after cancellation, and clear only after stopping finishes.

**Verify:** Close immediately after opening with delayed camera permission; no camera indicator/capture remains. Repeat under StrictMode and reopen the scanner successfully.

### F14 — Medium: every customer loads the complete application bundle

**Locations:** `frontend/src/App.tsx:4`–`:14`; production build output.

All page modules are eagerly imported, including admin editors, QR tools, and staff pages. The resulting primary JS chunk is about 1.35 MB minified / 394 kB gzip, which is significant for the mobile QR landing flow.

**Change:** Lazy-load route modules with appropriate Suspense fallbacks, then dynamically import expensive scanner/export/editor tools inside their features. Inspect the rebuilt bundle before adding manual chunk rules; measure the customer route's transferred JS and interactive load time.

**Verify:** A fresh customer-menu visit does not download staff/admin/scanner chunks; direct navigation and route loading/error fallbacks still work.

## Additional changes worth scheduling

These are improvement areas; they do not imply every item has been reproduced as a live defect.

| Area | Evidence and recommended change |
| --- | --- |
| API consistency | `api.ts`, `imageFunnelApi.ts`, `ordersApi.ts`, `sessionsApi.ts`, and page-local fetch calls duplicate transport/error/auth handling. Consolidate clients and generate request/response types from OpenAPI; preserve status, field errors and conflict metadata. |
| Session UX and client state | `RequireAuth` only checks token presence; auth logout only clears token/user. Add centralized 401 handling and clear private query/editor state on account changes. Consider the exposure of a seven-day bearer token persisted in local storage when choosing a session design. |
| Abuse controls | No application rate limiting is configured in `Program.cs`. Add bounded login attempts and endpoint-specific limits for public waiter calls, OCR validation, suggestions and normalization. Public waiter calls accept arbitrary table strings, and check-then-insert alert deduplication needs a database invariant under concurrency. |
| Upload validation | `Phase3ImageController.cs:61` trusts the supplied content type and retains an arbitrary supplied extension. Decode/verify image content, limit dimensions, choose a canonical allowed extension, and reject empty normalized alias sets and null alias elements. |
| Query cost | Orders/sessions load complete unbounded histories with nested items; chef polling fetches all statuses every 8 seconds. Add server-side active/history filters, pagination, response projection and measured indexes. `SuggestorService` loads the full name corpus per query; use a cached index or bounded database candidate search. |
| Large payloads | Full category sync and base64 image fields amplify DB/Redis/menu-response size. Upload images once to storage and keep URLs; set explicit item-count, request-size and field-length limits before mutations. |
| Error handling and observability | Add consistent ProblemDetails handling with request/trace IDs, cancellation propagation, readiness/liveness checks, and metrics for storage/cache degradation and failed saves. Avoid silently swallowing initialization/background failures. Configure production HTTPS/reverse-proxy behavior and allowed origins explicitly. |
| Bootstrap/configuration | Use one validated options object for JWT configuration. `Program.cs:158` permits a development fallback, but `AuthController.cs:60` rereads the absent config and returns 500, so that advertised fallback cannot issue tokens. Remove the fallback or share the same validated configuration. |
| Data invariants | `SaveCategory` first creates a page and then a category in separate saves, with no unique page invariant or request idempotency. Concurrent initial saves can create multiple pages while BuildMenu reads only one. Decide whether menus span pages; constrain a single-page design or aggregate all pages, and make ingestion retry-safe. Normalize emails consistently and map concurrent unique-email violations to 409. |
| Accessibility | Customer/item/edit/scan modals use custom overlay divs without consistent dialog semantics, focus trapping/restoration or Escape handling; several icon buttons lack accessible names. Adopt one accessible dialog primitive, label controls, and verify keyboard/screen-reader use. |
| UI correctness | Customer Info has no action; missing food images fall back to a chicken image regardless of dietary classification. Implement/remove inactive controls and use a neutral placeholder. Scope theme CSS variables and restore them on route exit. |
| Maintainability | Menu/customer/editor response models are repeated as `any`-based interfaces. There are multiple divergent menu editors and storage implementations. Share typed serializers and business rules, split large controllers/pages by workflow, and remove dead alternatives only after checking their consumers. |
| Lint/build hygiene | Resolve the 8 lint warnings, make warnings fail CI where appropriate, and run build/lint plus targeted backend checks in CI. Align the documented SDK and dependency-update policy with the actual target framework. No package vulnerability/version-support claims were verified during this review. |
| Real-time behavior | Redis publishes call-waiter events, but no SSE/WebSocket subscriber endpoint exists and staff pages poll. Order-created/ready paths also do not publish. Either document polling or implement authenticated tenant-scoped event delivery with reconnect/resync support and reliable post-commit publication. |

## Recommended implementation order

| Phase | Work | Completion criteria |
| --- | --- | --- |
| 1: Access and secrets | B01, B02, B09, B10, F04; abuse controls | No anonymous/foreign-tenant mutations, revoked staff lose access, status rules are enforced, and exposed credentials are invalidated. |
| 2: Menu data safety | B03, B04, B15, F01–F03, F09–F10 | Atomic stable-ID saves, deterministic save ordering, failed drafts retained, and no cross-restaurant editor state. |
| 3: Orders and billing | B05–B08, F05–F06 | Server-authoritative prices, valid staff/state transitions, race-safe settlement, consistent variants and totals. |
| 4: Storage and publication | B11–B14, B16–B18, F07–F08, F13 | Correct upload compensation, working fallback URLs, coherent publication/cache behavior, reliable initialization and camera cleanup. |
| 5: Delivery and usability | F11–F12, F14; accessibility, pagination, shared types, CI | Clear error states, accessible controls, smaller customer payload, bounded queries and repeatable checks. |

## Regression coverage to add

1. **Backend authorization integration tests:** anonymous, every staff role, same/foreign restaurant, deleted staff, inactive restaurant, and ownership checks for each write endpoint.
2. **PostgreSQL integration tests:** transaction rollback after each category-delete stage; stable item IDs; overlapping category revisions; unique open-tab creation; order-create versus settlement races; ingestion idempotency. Use PostgreSQL rather than an in-memory provider for SQL, constraints and transaction behavior.
3. **Order contract tests:** foreign/unavailable item IDs, variants, negative/oversized prices and quantities, authorized custom lines, enum membership, invalid transitions and repeat requests.
4. **Frontend save tests with controlled timers/network delays:** failed flush blocks publish, edit-undo cancels stale timers, out-of-order responses cannot win, partial Save All retains failures, edits made during a save stay dirty, and switching restaurants resets scoped state.
5. **Storage/cache integration tests:** post-commit cache failure does not delete storage, same-slug upload races preserve the winner, returned fallback URLs resolve, deleted restaurants disappear from warm caches, and multiple replicas observe mapping revisions.
6. **Browser workflow tests:** customer variant selection through waiter scan and settlement, stale/foreign QR rejection, loading/error states, theme reset with stale local storage, unusual category names, scanner cancellation and keyboard-accessible dialogs.

The build checks establish that the current source compiles. They do not validate the permissions, financial calculations, concurrent writes, or infrastructure-dependent behavior identified above.

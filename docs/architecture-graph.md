# Arquitectura y grafo de conocimiento

> Generado con **Graphify 0.9.97** sobre `src/` (89 archivos TypeScript/TSX, ~51,877 palabras).
> Fecha: 2026-10-28 · commit `933382f8`.
> Artefactos interactivos locales: `graphify-out/graph.html`, `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`.

## Lectura de arquitectura

La aplicación es una SPA React organizada en tres capas:

1. **App shell:** `src/main.tsx` → `App` → providers (React Query, Auth, Toast) → router con guards por rol → `ClientShell` / `StaffShell`.
2. **Features:** `auth`, `trips`, `bookings`, `staff`, `profile`, `favorites`, `notifications` y `company`. Cada feature agrupa páginas, hooks de datos y módulos de API.
3. **Shared:** cliente HTTP (`apiRequest`), tipos del contrato, kit de UI, mapa/asientos y utilidades de dinero, fechas, ICS, teléfono y política de reembolso.

Flujo de datos dominante:

```text
Page/Component → TanStack Query hook → features/*/api.ts → apiRequest() → /api → Railway → Supabase
```

Los nodos puente del grafo son `apiRequest()` (85 edges), `cn()` (80), `Button()` (64), `useDocumentTitle()` (61), `EmptyState()` (57), `PageHeader()` (56) y `useAuth()` (46). Esto confirma que la app está bien centralizada en infraestructura compartida, aunque también explica la baja cohesión de las comunidades de bookings y staff.

## Hallazgos

- **Sin ciclos de imports.**
- **Checkout (0.32)** y **Profile/Wallet (0.24)** son las comunidades más cohesivas y acotadas.
- **Bookings/refunds (0.07)**, **Staff admin (0.06)** y **Trip management (0.09)** son comunidades amplias; son candidatas naturales a extraerse por subdominio si el proyecto sigue creciendo.
- `apiRequest`, `cn` y `useAuth` son los principales bridges entre comunidades.
- El CSS de tokens (`src/shared/styles/tokens.css`) no entró al grafo por la heurística de archivos sensibles (la palabra “tokens” en el nombre), no porque contenga secretos.

## Reporte de Graphify

# Graph Report - src  (2026-10-28)

## Corpus Check
- 89 files · ~51,877 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 510 nodes · 2885 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `933382f8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Bookings & refunds core
- Shared UI & booking flows
- Staff admin & API client
- Trip discovery & favorites
- Auth, router & app shells
- Trip management domain
- Dates, ICS & trip form
- Maps, modals & itinerary
- App bootstrap & toasts
- Profile, wallet & payouts
- Checkout & seat selection

## God Nodes (most connected - your core abstractions)
1. `apiRequest()` - 85 edges
2. `cn()` - 80 edges
3. `Button()` - 64 edges
4. `useDocumentTitle()` - 61 edges
5. `EmptyState()` - 57 edges
6. `PageHeader()` - 56 edges
7. `PageLoader()` - 55 edges
8. `ErrorState()` - 54 edges
9. `useToast()` - 47 edges
10. `useAuth()` - 46 edges

## Surprising Connections (you probably didn't know these)
- `socialLogin()` --calls--> `apiRequest()`  [EXTRACTED]
  features/auth/api.ts → shared/api/client.ts
- `AppProviders()` --calls--> `AuthProvider()`  [EXTRACTED]
  app/providers.tsx → features/auth/AuthContext.tsx
- `NotFoundPage()` --calls--> `buttonClasses()`  [EXTRACTED]
  app/router.tsx → shared/components/ui/Button.tsx
- `login()` --calls--> `apiRequest()`  [EXTRACTED]
  features/auth/api.ts → shared/api/client.ts
- `register()` --calls--> `apiRequest()`  [EXTRACTED]
  features/auth/api.ts → shared/api/client.ts
- `LoginPage()` --calls--> `errorMessage()`  [EXTRACTED]
  features/auth/pages/LoginPage.tsx → shared/api/client.ts

## Import Cycles
- None detected.

## Communities (13 total, 2 thin omitted)

### Community 0 - "Bookings & refunds core"
Cohesion: 0.07
Nodes (67): cancelBooking(), cancelTicket(), listAllBookings(), listTripBookings(), listUserBookings(), payWithWallet(), registerPayment(), updateBookingStatus() (+59 more)

### Community 1 - "Shared UI & booking flows"
Cohesion: 0.13
Nodes (54): isStaffRole(), addPassengers(), checkinBooking(), checkinByToken(), checkinPassenger(), getBooking(), AddPassengersPage(), Row (+46 more)

### Community 2 - "Staff admin & API client"
Cohesion: 0.06
Nodes (60): createCoordinator(), createDiscount(), createExpense(), deleteCoordinator(), deleteDiscount(), deleteExpense(), listAuditLog(), listCoordinators() (+52 more)

### Community 3 - "Trip discovery & favorites"
Cohesion: 0.10
Nodes (45): useFavorites(), useToggleFavorite(), FavoritesPage(), addFavorite(), getMyRating(), getTrip(), listFavorites(), listTrips() (+37 more)

### Community 4 - "Auth, router & app shells"
Cohesion: 0.08
Nodes (40): RequireAuth(), RequireGuest(), RequireRole(), HomeRedirect(), NotFoundPage(), login(), register(), AuthContext (+32 more)

### Community 5 - "Trip management domain"
Cohesion: 0.09
Nodes (37): socialLogin(), InfoLine(), StaffTripDetailPage(), Filter, StaffTripsPage(), cancelTrip(), deleteTrip(), finalizeTrip() (+29 more)

### Community 6 - "Dates, ICS & trip form"
Cohesion: 0.10
Nodes (32): groupNotifications(), CATEGORIES, defaultEnd(), defaultStart(), emptyForm(), FormState, fromTrip(), StaffTripFormPage() (+24 more)

### Community 7 - "Maps, modals & itinerary"
Cohesion: 0.13
Nodes (19): Mode, SearchResult, StaffTripMapPage(), createPoi(), deletePoi(), updatePoi(), updateRoute(), CDMX (+11 more)

### Community 8 - "App bootstrap & toasts"
Cohesion: 0.16
Nodes (10): App(), AppProviders(), queryClient, router, ToastContext, ToastContextValue, ToastItem, ToastProvider() (+2 more)

### Community 9 - "Profile, wallet & payouts"
Cohesion: 0.24
Nodes (15): getMyProfile(), getMyStats(), getWallet(), listMyPayouts(), requestPayout(), updateMyProfile(), ProfilePage(), transactionLabels (+7 more)

### Community 10 - "Checkout & seat selection"
Cohesion: 0.32
Nodes (11): createBooking(), CheckoutDraft, clearCheckoutDraft(), key(), readCheckoutDraft(), saveCheckoutDraft(), CheckoutPage(), PassengerDraft (+3 more)

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Trip discovery & favorites` to `Bookings & refunds core`, `Shared UI & booking flows`, `Staff admin & API client`, `Auth, router & app shells`, `Trip management domain`, `Maps, modals & itinerary`, `App bootstrap & toasts`, `Profile, wallet & payouts`, `Checkout & seat selection`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `Bookings & refunds core` be split into smaller, more focused modules?**
  _Cohesion score 0.07199529826623567 - nodes in this community are weakly interconnected._
- **Why does `apiRequest()` connect `Staff admin & API client` to `Bookings & refunds core`, `Shared UI & booking flows`, `Trip discovery & favorites`, `Auth, router & app shells`, `Trip management domain`, `Dates, ICS & trip form`, `Maps, modals & itinerary`, `Profile, wallet & payouts`, `Checkout & seat selection`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `Shared UI & booking flows` be split into smaller, more focused modules?**
  _Cohesion score 0.13069233617178821 - nodes in this community are weakly interconnected._
- **Why does `useAuth()` connect `Auth, router & app shells` to `Bookings & refunds core`, `Shared UI & booking flows`, `Trip discovery & favorites`, `Trip management domain`, `Dates, ICS & trip form`, `Maps, modals & itinerary`, `Profile, wallet & payouts`, `Checkout & seat selection`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `Staff admin & API client` be split into smaller, more focused modules?**
  _Cohesion score 0.06376811594202898 - nodes in this community are weakly interconnected._
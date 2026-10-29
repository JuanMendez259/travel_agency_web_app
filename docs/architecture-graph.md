# Arquitectura y grafo de conocimiento

> Generado con **Graphify 0.9.97** sobre `src/` (91 archivos TypeScript/TSX, ~52,954 palabras).
> Fecha: 2026-10-28 · commit `76e65fd5`.
> Artefactos interactivos locales: `graphify-out/graph.html`, `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`.

## Lectura de arquitectura

La aplicación es una SPA React organizada en tres capas:

1. **App shell:** `src/main.tsx` → `App` → providers (React Query, Auth, Toast) → router con guards por rol → `ClientShell` / `StaffShell`.
2. **Features:** `auth`, `trips`, `bookings`, `staff`, `profile`, `favorites`, `notifications` y `company`. Cada feature agrupa páginas, hooks de datos y módulos de API.
3. **Shared:** cliente HTTP (`apiRequest`), tipos del contrato, kit de UI, mapa/asientos y utilidades de dinero, fechas, imágenes, ICS, teléfono y política de reembolso.

Flujo de datos dominante:

```text
Página/Componente → TanStack Query hook → features/*/api.ts → apiRequest() → /api → Railway → Supabase
```

La galería de viajes sube hasta 10 imágenes por viaje. El cliente reduce imágenes grandes a 1920 px y WebP antes de enviarlas; el API valida formato, tamaño máximo de 20 MB, re-encodea y aplica la portada.

## Hallazgos

- **Sin ciclos de imports.**
- Comunidades más cohesivas: **Ratings (0.50)**, **Auth API contracts (0.40)**, **HTTP client/errors (0.33)**, **Profile/Wallet (0.27)** y **Discounts/finance (0.27)**.
- Comunidades amplias o débiles: **Auth/navigation (0.05)**, **Bookings/refunds (0.08)**, **Domain types (0.08)** y **Dates/images/notifications (0.08)**. Son candidatas a subdividirse por subdominio.
- `apiRequest`, `cn`, `useAuth`, `useToast` y el kit de UI son los principales puentes entre comunidades.
- El CSS de tokens (`src/shared/styles/tokens.css`) no entró al grafo por la heurística de archivos sensibles (la palabra “tokens” en el nombre), no porque contenga secretos.

## Reporte de Graphify

# Graph Report - src  (2026-10-28)

## Corpus Check
- 91 files · ~52,954 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 522 nodes · 2912 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76e65fd5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HTTP client and errors
- Auth and app navigation
- Staff admin and UI kit
- Discounts and staff finance
- Auth API contracts
- Trip management screens
- Bookings and refunds
- Dates, images and notifications
- Checkout and UI primitives
- Domain types and contracts
- API client and bookings
- Maps and itinerary
- Profile and wallet
- Ratings interface

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
- `StaffCheckinPage()` --indirect_call--> `listManageTrips()`  [INFERRED]
  src/features/staff/pages/StaffCheckinPage.tsx → src/features/trips/api.ts
- `StaffExpensesPage()` --indirect_call--> `listManageTrips()`  [INFERRED]
  src/features/staff/pages/StaffExpensesPage.tsx → src/features/trips/api.ts
- `StaffPayoutsPage()` --indirect_call--> `listUsers()`  [INFERRED]
  src/features/staff/pages/StaffPayoutsPage.tsx → src/features/profile/api.ts
- `StaffScanPage()` --indirect_call--> `listManageTrips()`  [INFERRED]
  src/features/staff/pages/StaffScanPage.tsx → src/features/trips/api.ts
- `StaffTripBookingsPage()` --indirect_call--> `listManageTrips()`  [INFERRED]
  src/features/staff/pages/StaffTripBookingsPage.tsx → src/features/trips/api.ts
- `StaffDiscountsPage()` --indirect_call--> `listManageTrips()`  [INFERRED]
  src/features/staff/pages/StaffDiscountsPage.tsx → src/features/trips/api.ts

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 11 - "HTTP client and errors"
Cohesion: 0.33
Nodes (7): ApiError, RequestOptions, ApiErrorKind, apiUpload(), parseError(), kindFromStatus(), messageFromStatus()

### Community 0 - "Auth and app navigation"
Cohesion: 0.05
Nodes (64): AuthContextValue, Mode, LoginValues, RegisterValues, Session, AuthResponse, NavItem, TextFieldProps (+56 more)

### Community 1 - "Staff admin and UI kit"
Cohesion: 0.13
Nodes (63): Row, CreateForm, AuditLog, SelectProps, SwitchProps, TextAreaProps, checkinBooking(), checkinPassenger() (+55 more)

### Community 10 - "Discounts and staff finance"
Cohesion: 0.27
Nodes (12): FormState, Discount, DiscountInput, PayoutRequest, TripExpense, createDiscount(), deleteDiscount(), listDiscounts() (+4 more)

### Community 13 - "Auth API contracts"
Cohesion: 0.40
Nodes (4): LoginRequest, RegisterRequest, SocialAuthResponse, socialLogin()

### Community 2 - "Trip management screens"
Cohesion: 0.09
Nodes (52): FormState, Filter, TripCardProps, Tone, InfoLine(), StaffTripDetailPage(), emptyForm(), StaffTripOptionsPage() (+44 more)

### Community 3 - "Bookings and refunds"
Cohesion: 0.08
Nodes (49): Booking, BookingStatus, PaymentStatus, PayoutStatus, Tone, MoneyValue, cancelBooking(), cancelTicket() (+41 more)

### Community 4 - "Dates, images and notifications"
Cohesion: 0.08
Nodes (41): Tag, FormState, Notification, isStaffRole(), classify(), groupNotifications(), NotificationsPage(), listNotifications() (+33 more)

### Community 5 - "Checkout and UI primitives"
Cohesion: 0.11
Nodes (29): CheckoutDraft, PassengerDraft, BookingOptionInput, Seat, SeatRow, ButtonProps, ButtonVariant, Size (+21 more)

### Community 6 - "Domain types and contracts"
Cohesion: 0.08
Nodes (31): AdminStats, BookingItem, BookingPassenger, CancelTicketResult, CapacityRequest, Coordinator, CreateCoordinatorRequest, CreatedCoordinator (+23 more)

### Community 7 - "API client and bookings"
Cohesion: 0.17
Nodes (15): CancelBookingResult, CheckinTokenResult, CreateBookingRequest, CreatePassengersRequest, Payment, PaymentMethod, addPassengers(), checkinByToken() (+7 more)

### Community 8 - "Maps and itinerary"
Cohesion: 0.19
Nodes (13): Mode, SearchResult, MapMarker, MapMarkerKind, MapViewProps, StaffTripMapPage(), createPoi(), deletePoi() (+5 more)

### Community 9 - "Profile and wallet"
Cohesion: 0.27
Nodes (13): UserProfile, WalletSummary, WalletType, getMyProfile(), getMyStats(), getWallet(), listMyPayouts(), requestPayout() (+5 more)

### Community 12 - "Ratings interface"
Cohesion: 0.50
Nodes (6): getMyRating(), getTrip(), upsertRating(), RateTripPage(), ratingLabel(), StarRating()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Auth and app navigation` to `Staff admin and UI kit`, `Trip management screens`, `Bookings and refunds`, `Dates, images and notifications`, `Checkout and UI primitives`, `Maps and itinerary`, `Profile and wallet`, `Ratings interface`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `Auth and app navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.0506578947368421 - nodes in this community are weakly interconnected._
- **Why does `apiRequest()` connect `API client and bookings` to `Auth and app navigation`, `Staff admin and UI kit`, `Trip management screens`, `Bookings and refunds`, `Dates, images and notifications`, `Checkout and UI primitives`, `Domain types and contracts`, `Maps and itinerary`, `Profile and wallet`, `Discounts and staff finance`, `HTTP client and errors`, `Ratings interface`, `Auth API contracts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `Staff admin and UI kit` be split into smaller, more focused modules?**
  _Cohesion score 0.12643678160919541 - nodes in this community are weakly interconnected._
- **Why does `useAuth()` connect `Auth and app navigation` to `Staff admin and UI kit`, `Trip management screens`, `Bookings and refunds`, `Dates, images and notifications`, `Checkout and UI primitives`, `Maps and itinerary`, `Profile and wallet`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `Trip management screens` be split into smaller, more focused modules?**
  _Cohesion score 0.08864767073722297 - nodes in this community are weakly interconnected._
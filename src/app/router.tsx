import { useEffect } from "react";
import { createBrowserRouter, Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { RequireAuth, RequireGuest, RequireRole } from "@/app/guards";
import { useAuth } from "@/features/auth/AuthContext";
import { homePathForRole } from "@/features/auth/session";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { AboutPage } from "@/features/company/pages/AboutPage";
import { AddPassengersPage } from "@/features/bookings/pages/AddPassengersPage";
import { BookingDetailPage } from "@/features/bookings/pages/BookingDetailPage";
import { CheckoutPage } from "@/features/bookings/pages/CheckoutPage";
import { MyBookingsPage } from "@/features/bookings/pages/MyBookingsPage";
import { PassengerQrPage } from "@/features/bookings/pages/PassengerQrPage";
import { FavoritesPage } from "@/features/favorites/pages/FavoritesPage";
import { NotificationsPage } from "@/features/notifications/pages/NotificationsPage";
import { ProfilePage } from "@/features/profile/pages/ProfilePage";
import { ExplorePage } from "@/features/trips/pages/ExplorePage";
import { RateTripPage } from "@/features/trips/pages/RateTripPage";
import { TripDetailPage } from "@/features/trips/pages/TripDetailPage";
import { TripMapPage } from "@/features/trips/pages/TripMapPage";
import { StaffAuditPage } from "@/features/staff/pages/StaffAuditPage";
import { StaffBookingDetailPage } from "@/features/staff/pages/StaffBookingDetailPage";
import { StaffBookingQrPage } from "@/features/staff/pages/StaffBookingQrPage";
import { StaffBookingsPage } from "@/features/staff/pages/StaffBookingsPage";
import { StaffCheckinPage } from "@/features/staff/pages/StaffCheckinPage";
import { StaffCoordinatorsPage } from "@/features/staff/pages/StaffCoordinatorsPage";
import { StaffDiscountsPage } from "@/features/staff/pages/StaffDiscountsPage";
import { StaffExpensesPage } from "@/features/staff/pages/StaffExpensesPage";
import { StaffPayoutsPage } from "@/features/staff/pages/StaffPayoutsPage";
import { StaffScanPage } from "@/features/staff/pages/StaffScanPage";
import { StaffStatsPage } from "@/features/staff/pages/StaffStatsPage";
import { StaffTripBookingsPage } from "@/features/staff/pages/StaffTripBookingsPage";
import { StaffTripDetailPage } from "@/features/staff/pages/StaffTripDetailPage";
import { StaffTripFormPage } from "@/features/staff/pages/StaffTripFormPage";
import { StaffTripMapPage } from "@/features/staff/pages/StaffTripMapPage";
import { StaffTripOptionsPage } from "@/features/staff/pages/StaffTripOptionsPage";
import { StaffTripSeatsPage } from "@/features/staff/pages/StaffTripSeatsPage";
import { StaffTripsPage } from "@/features/staff/pages/StaffTripsPage";
import { BrandLockup } from "@/shared/components/brand/LogoMark";
import { buttonClasses } from "@/shared/components/ui/Button";
import { ClientShell } from "@/shared/components/layout/ClientShell";
import { StaffShell } from "@/shared/components/layout/StaffShell";

function RootLayout() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const timer = window.setTimeout(() => {
        document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);
  return <Outlet />;
}

function HomeRedirect() {
  const { session } = useAuth();
  return <Navigate to={session ? homePathForRole(session.role) : "/login"} replace />;
}

function NotFoundPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-4">
      <div className="max-w-md text-center">
        <BrandLockup className="justify-center" />
        <p className="mt-4 text-label-sm uppercase tracking-[0.2em] text-secondary">Error 404</p>
        <h1 className="mt-1 text-display text-on-surface">Esta parada no existe</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          El enlace que buscas cambió de ruta. Vuelve a explorar las salidas disponibles.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/explore" className={buttonClasses({ variant: "primary" })}>
            Explorar viajes
          </Link>
          <Link to="/login" className={buttonClasses({ variant: "outline" })}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <RequireGuest />,
        children: [{ path: "login", element: <LoginPage /> }],
      },
      { path: "/", element: <HomeRedirect /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireRole roles={["Client"]} />,
            children: [
              {
                element: <ClientShell />,
                children: [
                  { path: "explore", element: <ExplorePage /> },
                  { path: "trips/:id", element: <TripDetailPage /> },
                  { path: "trips/:id/book", element: <CheckoutPage /> },
                  { path: "trips/:id/map", element: <TripMapPage /> },
                  { path: "trips/:id/rate", element: <RateTripPage /> },
                  { path: "favorites", element: <FavoritesPage /> },
                  { path: "bookings", element: <MyBookingsPage /> },
                  { path: "bookings/:id", element: <BookingDetailPage /> },
                  { path: "bookings/:id/qr", element: <PassengerQrPage /> },
                  { path: "bookings/:id/passengers/add", element: <AddPassengersPage /> },
                  { path: "profile", element: <ProfilePage /> },
                  { path: "notifications", element: <NotificationsPage /> },
                  { path: "about", element: <AboutPage /> },
                ],
              },
            ],
          },
          {
            element: <RequireRole roles={["Admin", "Coordinador"]} />,
            children: [
              {
                element: <StaffShell />,
                children: [
                  { path: "staff/trips", element: <StaffTripsPage /> },
                  { path: "staff/trips/:id", element: <StaffTripDetailPage /> },
                  { path: "staff/trips/:id/seats", element: <StaffTripSeatsPage /> },
                  { path: "staff/trips/:id/options", element: <StaffTripOptionsPage /> },
                  {
                    element: <RequireRole roles={["Admin"]} />,
                    children: [
                      { path: "staff/trips/new", element: <StaffTripFormPage /> },
                      { path: "staff/trips/:id/edit", element: <StaffTripFormPage /> },
                      { path: "staff/trips/:id/bookings", element: <StaffTripBookingsPage /> },
                      { path: "staff/trips/:id/map", element: <StaffTripMapPage /> },
                      { path: "staff/trips/:id/checkin", element: <StaffCheckinPage /> },
                      { path: "staff/trips/:id/scan", element: <StaffScanPage /> },
                      { path: "staff/bookings", element: <StaffBookingsPage /> },
                      { path: "staff/bookings/:id", element: <StaffBookingDetailPage /> },
                      { path: "staff/bookings/:id/qr", element: <StaffBookingQrPage /> },
                      { path: "staff/stats", element: <StaffStatsPage /> },
                      { path: "staff/coordinators", element: <StaffCoordinatorsPage /> },
                      { path: "staff/discounts", element: <StaffDiscountsPage /> },
                      { path: "staff/payouts", element: <StaffPayoutsPage /> },
                      { path: "staff/expenses", element: <StaffExpensesPage /> },
                      { path: "staff/audit", element: <StaffAuditPage /> },
                    ],
                  },
                  { path: "staff/notifications", element: <NotificationsPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

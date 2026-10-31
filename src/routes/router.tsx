import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useApp } from "../features/store/StoreProvider";
import { ClerkSignIn, ClerkSignUp, useClerkUserId } from "../pages/Login/ClerkAuth";
import AppLayout from "../components/layout/AppLayout";
import LocationOnboarding from "../pages/Onboarding/LocationOnboarding";
import ChoosePath from "../pages/Onboarding/ChoosePath";
import Dashboard from "../pages/Dashboard/Dashboard";
import WorkoutArena from "../pages/WorkoutArena/WorkoutArena";
import WorldMap from "../pages/WorldMap/WorldMap";
import Kingdom3D from "../pages/Kingdom3D";
import Sabha from "../pages/Sabha/Sabha";
import Profile from "../pages/Profile/Profile";
import NotFound from "../pages/NotFound";

/** Waits for Clerk to load (useClerkUserId is null while loading), then
 *  requires a signed-in Clerk session. Loading state renders the login page,
 *  which itself shows Clerk's own loading spinner — no premature 401 fetches. */
function ClerkGuard({ children }: { children: React.ReactNode }) {
  const clerkUserId = useClerkUserId();
  if (!clerkUserId) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function OnboardedGuard({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  if (state.profile && !state.profile.onboarded)
    return <Navigate to="/onboarding/location" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <ClerkGuard>
      <AppLayout />
      <Outlet />
    </ClerkGuard>
  );
}

export const router = createBrowserRouter([
  { path: "/register", element: <ClerkSignUp /> },
  { path: "/login", element: <ClerkSignIn /> },
  {
    path: "/onboarding/location",
    element: (
      <ClerkGuard>
        <LocationOnboarding />
      </ClerkGuard>
    ),
  },
  {
    path: "/onboarding/choose-path",
    element: (
      <ClerkGuard>
        <ChoosePath />
      </ClerkGuard>
    ),
  },
  {
    element: <AppRoutes />,
    children: [
      {
        path: "/dashboard",
        element: (
          <OnboardedGuard>
            <Dashboard />
          </OnboardedGuard>
        ),
      },
      {
        path: "/workout",
        element: (
          <OnboardedGuard>
            <WorkoutArena />
          </OnboardedGuard>
        ),
      },
      {
        path: "/map",
        element: (
          <OnboardedGuard>
            <WorldMap />
          </OnboardedGuard>
        ),
      },
      {
        path: "/kingdom/:kingdomId",
        element: (
          <OnboardedGuard>
            <Kingdom3D />
          </OnboardedGuard>
        ),
      },
      {
        path: "/sabha",
        element: (
          <OnboardedGuard>
            <Sabha />
          </OnboardedGuard>
        ),
      },
      {
        path: "/profile",
        element: (
          <OnboardedGuard>
            <Profile />
          </OnboardedGuard>
        ),
      },
    ],
  },
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "*", element: <NotFound /> },
]);

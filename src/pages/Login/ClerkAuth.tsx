import { SignIn, SignUp, useAuth } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router-dom";
import { CrownLogo } from "../../components/ui/CrownLogo";

/** Centered Clerk auth card, matching the empire styling. */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-royal/10 blur-[120px]" />      </div>
      <div className="animate-fade-up relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <CrownLogo size={56} />
          <h1 className="gold-text font-display text-3xl font-black tracking-wide">
            FITNESS MESSER
          </h1>
          <p className="text-sm text-gray-500">
            Let&apos;s Build Empire With Exercise.
          </p>
        </div>
        <div className="panel p-7">{children}</div>
      </div>
    </div>
  );
}

export function ClerkSignIn() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const dest =
    (location.state as { from?: string } | null)?.from ?? "/dashboard";
  if (isLoaded && isSignedIn) return <Navigate to={dest} replace />;
  return (
    <AuthShell>
      <SignIn
        routing="virtual"
        afterSignInUrl={dest}
        signUpUrl="/register"
      />
    </AuthShell>
  );
}

export function ClerkSignUp() {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Navigate to="/onboarding/location" replace />;
  return (
    <AuthShell>
      <SignUp routing="virtual" signInUrl="/login" />
    </AuthShell>
  );
}

/** Hook: the Clerk user's id once fully loaded, else null. */
export function useClerkUserId(): string | null {
  const { isLoaded, isSignedIn, userId } = useAuth();
  return isLoaded && isSignedIn ? userId ?? null : null;
}

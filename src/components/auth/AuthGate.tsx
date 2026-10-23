import React from 'react';
import { useAuth } from '@/state/AuthContext';
import { AuthGateLoading } from './AuthGateLoading';

/**
 * AuthGate
 *
 * Version-compatible alternative to expo-router protected routes
 * (protected routes require expo-router v4 / SDK 51; this project uses
 * expo-router ~3.4.8 on SDK 50).
 *
 * While the initial session is resolving, renders the loading gate to
 * prevent navigation flicker. Once resolved, the root layout decides
 * which route group to display based on the authentication state.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { authLoading } = useAuth();

  if (authLoading) {
    return <AuthGateLoading />;
  }

  return <>{children}</>;
}


import { supabase } from './supabase';

/**
 * Email-confirmation deep-link handling.
 *
 * Supabase sends the confirmation link to `fitnessmesser://auth/confirm`.
 * That URL arrives inside the app as a deep link and carries the
 * confirmation payload either in the URL fragment (implicit flow:
 * access_token / refresh_token), the query string (PKCE flow: code) or as
 * a token_hash for verifyOtp. This module turns any of those shapes into
 * a real session. Redirecting alone does NOT create a session — that is
 * why the original confirmation link opened a dead page.
 */

export const AUTH_REDIRECT_PATH = 'auth/confirm';
export const AUTH_REDIRECT_URL = `fitnessmesser://${AUTH_REDIRECT_PATH}`;

export type AuthRedirectResult = {
  /** 'ignored' = not an auth link; 'signed-in' = session established. */
  status: 'ignored' | 'signed-in' | 'invalid' | 'error';
  /** Short, safe message for the UI. Never contains tokens. */
  message?: string;
};

/**
 * Minimal URL query/fragment parser. Uses plain string splitting so it
 * behaves identically in Jest and on-device without depending on a URL
 * polyfill being installed by the caller.
 */
export function parseAuthUrl(url: string): {
  params: Record<string, string>;
  isAuthLink: boolean;
} {
  let path = '';
  let rest = url;
  const schemeEnd = rest.indexOf('://');
  if (schemeEnd !== -1) {
    const afterScheme = rest.slice(schemeEnd + 3);
    const pathEnd = afterScheme.search(/[?#]/);
    path =
      pathEnd === -1
        ? afterScheme
        : afterScheme.slice(0, pathEnd);
    rest = pathEnd === -1 ? '' : afterScheme.slice(pathEnd);
  }

  const params: Record<string, string> = {};
  // Both a fragment (#...) and a query (?...) may carry auth parameters.
  for (const chunk of rest.split(/[#&?]/)) {
    if (!chunk) continue;
    const eq = chunk.indexOf('=');
    if (eq === -1) continue;
    const key = chunk.slice(0, eq);
    let value = chunk.slice(eq + 1);
    try {
      value = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
      // Keep the raw value if it is not valid percent-encoding.
    }
    params[key] = value;
  }

  const isAuthLink =
    path.replace(/^\/+/, '') === AUTH_REDIRECT_PATH.replace(/^\/+/, '') ||
    params.type === 'signup' ||
    params.access_token !== undefined ||
    params.token_hash !== undefined ||
    params.error_description !== undefined;

  return { params, isAuthLink };
}

/** Map a Supabase error to a short, safe message. */
function friendlyCallbackError(message: string | undefined): string {
  const normalized = (message ?? '').toLowerCase();
  if (
    normalized.includes('expired') ||
    normalized.includes('invalid') ||
    normalized.includes('already been used')
  ) {
    return 'This confirmation link is invalid or has already been used. If your email is already confirmed, you can simply sign in.';
  }
  return 'Could not complete email confirmation. Please try signing in, or request a new confirmation email.';
}

export async function handleAuthRedirect(
  url: string
): Promise<AuthRedirectResult> {
  if (!url) return { status: 'ignored' };

  const { params, isAuthLink } = parseAuthUrl(url);
  if (!isAuthLink) return { status: 'ignored' };

  // Supabase reports failures through error/error_description parameters.
  const errorDescription = params.error_description ?? params.error;
  if (errorDescription) {
    return { status: 'invalid', message: friendlyCallbackError(errorDescription) };
  }

  try {
    // 1. PKCE flow: a one-time code that must be exchanged for a session.
    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) {
        return { status: 'error', message: friendlyCallbackError(error.message) };
      }
      return { status: 'signed-in' };
    }

    // 2. verifyOtp flow: a token_hash from a newer confirmation template.
    if (params.token_hash) {
      const { error } = await supabase.auth.verifyOtp({
        type: 'signup',
        token_hash: params.token_hash,
      });
      if (error) {
        return { status: 'error', message: friendlyCallbackError(error.message) };
      }
      return { status: 'signed-in' };
    }

    // 3. Implicit flow: the email template delivered raw tokens directly.
    if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) {
        return { status: 'error', message: friendlyCallbackError(error.message) };
      }
      return { status: 'signed-in' };
    }

    // A link with no usable payload (e.g. plain redirect of an
    // already-confirmed user). Never treat this as a failure of sign-in.
    return {
      status: 'invalid',
      message:
        'Your email is confirmed. Please sign in to enter the empire.',
    };
  } catch {
    return {
      status: 'error',
      message: 'Could not complete email confirmation. Please try signing in.',
    };
  }
}

/**
 * Email-confirmation deep-link handling tests.
 *
 * Verifies that the auth callback correctly converts every link shape
 * Supabase can deliver into a session, and that failures never crash the
 * app or leak tokens. The Supabase client is fully mocked.
 */
import {
  handleAuthRedirect,
  parseAuthUrl,
  AUTH_REDIRECT_URL,
} from '@/lib/authRedirect';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSupabaseAuth = jest.requireMock('@/lib/supabase').supabase.auth;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: jest.fn(),
      verifyOtp: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

beforeEach(() => {
  mockSupabaseAuth.exchangeCodeForSession.mockReset();
  mockSupabaseAuth.verifyOtp.mockReset();
  mockSupabaseAuth.setSession.mockReset();
});

describe('parseAuthUrl', () => {
  it('recognizes the auth confirm path', () => {
    expect(parseAuthUrl('fitnessmesser://auth/confirm#access_token=a').isAuthLink).toBe(true);
  });

  it('recognizes signup-type links on any path', () => {
    expect(parseAuthUrl('fitnessmesser://x?type=signup').isAuthLink).toBe(true);
  });

  it('ignores ordinary deep links', () => {
    expect(parseAuthUrl('fitnessmesser://app/(tabs)').isAuthLink).toBe(false);
  });

  it('extracts parameters from both query and fragment', () => {
    const { params } = parseAuthUrl(
      'fitnessmesser://auth/confirm?code=abc&error_description=expired%20link'
    );
    expect(params.code).toBe('abc');
    expect(params.error_description).toBe('expired link');
  });
});

describe('handleAuthRedirect', () => {
  it('ignores non-auth links entirely', async () => {
    const result = await handleAuthRedirect('fitnessmesser://app/(tabs)/profile');
    expect(result.status).toBe('ignored');
    expect(mockSupabaseAuth.setSession).not.toHaveBeenCalled();
  });

  it('exchanges a PKCE code for a session', async () => {
    mockSupabaseAuth.exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const result = await handleAuthRedirect('fitnessmesser://auth/confirm?code=one-time-code');
    expect(result.status).toBe('signed-in');
    expect(mockSupabaseAuth.exchangeCodeForSession).toHaveBeenCalledWith('one-time-code');
  });

  it('reports a friendly error when code exchange fails', async () => {
    mockSupabaseAuth.exchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'invalid request: code has been used' },
    });
    const result = await handleAuthRedirect('fitnessmesser://auth/confirm?code=stale');
    expect(result.status).toBe('error');
    expect(result.message).toContain('invalid or has already been used');
    expect(result.message).not.toContain('stale');
  });

  it('verifies a token_hash link via verifyOtp', async () => {
    mockSupabaseAuth.verifyOtp.mockResolvedValueOnce({ error: null });
    const result = await handleAuthRedirect(
      'fitnessmesser://auth/confirm?token_hash=tok&type=signup'
    );
    expect(result.status).toBe('signed-in');
    expect(mockSupabaseAuth.verifyOtp).toHaveBeenCalledWith(
      expect.objectContaining({ token_hash: 'tok', type: 'signup' })
    );
  });

  it('establishes a session from an implicit-flow token link', async () => {
    mockSupabaseAuth.setSession.mockResolvedValueOnce({ error: null });
    const result = await handleAuthRedirect(
      'fitnessmesser://auth/confirm#access_token=at&refresh_token=rt'
    );
    expect(result.status).toBe('signed-in');
    expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    });
  });

  it('returns a safe message for expired/used links without crashing', async () => {
    mockSupabaseAuth.setSession.mockResolvedValueOnce({
      error: { message: 'Unused token: expired link' },
    });
    const result = await handleAuthRedirect(
      'fitnessmesser://auth/confirm#access_token=old&refresh_token=old'
    );
    expect(result.status).toBe('error');
    expect(result.message).toContain('invalid or has already been used');
  });

  it('surfaces supabase error_description instead of attempting a session', async () => {
    const result = await handleAuthRedirect(
      'fitnessmesser://auth/confirm?error=access_denied&error_description=expired+link'
    );
    expect(result.status).toBe('invalid');
    expect(result.message).toContain('invalid or has already been used');
    expect(mockSupabaseAuth.setSession).not.toHaveBeenCalled();
  });

  it('treats a payload-less link as an already-confirmed redirect, not a crash', async () => {
    const result = await handleAuthRedirect('fitnessmesser://auth/confirm');
    expect(result.status).toBe('invalid');
    expect(result.message).toContain('confirmed');
    expect(result.message).toContain('sign in');
  });

  it('never lets a thrown error crash the caller', async () => {
    mockSupabaseAuth.setSession.mockRejectedValueOnce(new Error('network down'));
    const result = await handleAuthRedirect(
      'fitnessmesser://auth/confirm#access_token=a&refresh_token=b'
    );
    expect(result.status).toBe('error');
    expect(result.message).toBe(
      'Could not complete email confirmation. Please try signing in.'
    );
  });

  it('redirect URL matches the app deep-link scheme', () => {
    expect(AUTH_REDIRECT_URL).toBe('fitnessmesser://auth/confirm');
  });
});

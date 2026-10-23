/**
 * Tests for the "Enter the Empire" authentication UI.
 *
 * The Supabase client is mocked so tests never touch the network, and
 * no test ever asserts on password values, tokens or secrets.
 */
import TestRenderer, { act } from 'react-test-renderer';
import { AuthProvider } from '@/state/AuthContext';
import { AuthFlow } from '@/components/auth/screens/AuthFlow';

type AuthStateChangeCb = (event: string, session: unknown) => void;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

jest.mock('@/lib/authRedirect', () => {
  const actual = jest.requireActual('@/lib/authRedirect');
  return {
    ...actual,
    // Deep-link session exchange is covered in its own test file with a
    // controllable fake; the UI tests never need the network path.
    handleAuthRedirect: jest.fn(async () => ({ status: 'ignored' })),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSupabaseAuth = jest.requireMock('@/lib/supabase').supabase.auth;

describe('AuthFlow UI', () => {
  let fireSessionRef: AuthStateChangeCb | undefined;

  function fireSession(session: unknown) {
    const cb = fireSessionRef;
    act(() => {
      cb?.('SIGNED_IN', session);
    });
  }

  beforeEach(() => {
    mockSupabaseAuth.signInWithPassword.mockReset();
    mockSupabaseAuth.signUp.mockReset();
    mockSupabaseAuth.signOut.mockReset();
    mockSupabaseAuth.onAuthStateChange.mockReset();
    mockSupabaseAuth.onAuthStateChange.mockImplementation((cb: AuthStateChangeCb) => {
      fireSessionRef = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
  });

  function renderFlow() {
    const authenticatedEvents: boolean[] = [];
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(
        <AuthProvider>
          <AuthFlow
            onAuthenticated={(isGuest) => {
              authenticatedEvents.push(isGuest);
            }}
          />
        </AuthProvider>
      );
    });
    // Resolve INITIAL_SESSION with no session so authLoading completes.
    fireSession(null);

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tree: tree!,
      authenticatedEvents,
      findByTestId: (id: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tree as any).root.findByProps({ testID: id }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryByTestId: (id: string) => (tree as any).root.findByProps({ testID: id }, () => true),
    };
  }

  it('shows the welcome screen with the required copy and actions', () => {
    const { tree } = renderFlow();

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Your strength.');
    expect(json).toContain('Your kingdom.');
    expect(json).toContain('Every workout builds your legacy');
    expect(json).toContain('Create Your Account');
    expect(json).toContain('Sign In');
    expect(json).toContain('Continue as Guest');
    // Local progress note is unobtrusive but present.
    expect(json).toContain('saved locally');
  });

  it('navigates welcome → sign in → back to welcome', () => {
    const { tree, findByTestId } = renderFlow();

    act(() => {
      findByTestId('welcome-sign-in').props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Enter your realm');

    act(() => {
      findByTestId('sign-in-back').props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Your strength.');
  });

  it('navigates welcome → create account → back to welcome', () => {
    const { tree, findByTestId } = renderFlow();

    act(() => {
      findByTestId('welcome-create-account').props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Found your empire');

    act(() => {
      findByTestId('sign-up-back').props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Your strength.');
  });

  it('continue as guest notifies the shell without any Supabase auth call', () => {
    const { findByTestId, authenticatedEvents } = renderFlow();

    act(() => {
      findByTestId('welcome-guest').props.onPress();
    });

    expect(authenticatedEvents).toEqual([true]);
    expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
  });

  it('sign in validates empty inputs inline', async () => {
    const { tree, findByTestId } = renderFlow();

    act(() => {
      findByTestId('welcome-sign-in').props.onPress();
    });

    await act(async () => {
      findByTestId('sign-in-submit').props.onPress();
    });

    expect(JSON.stringify(tree.toJSON())).toContain('Email is required.');
    expect(JSON.stringify(tree.toJSON())).toContain('Password is required.');
    expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('sign in calls the existing supabase method and reports friendly errors', async () => {
    mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    const { tree, findByTestId } = renderFlow();

    act(() => {
      findByTestId('welcome-sign-in').props.onPress();
    });
    act(() => {
      findByTestId('sign-in-email').props.onChangeText('knight@realm.io');
      findByTestId('sign-in-password').props.onChangeText('not-the-real-one');
    });

    await act(async () => {
      findByTestId('sign-in-submit').props.onPress();
    });

    expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'knight@realm.io',
      // Deliberately not asserted for content beyond being supplied —
      // passwords must never be logged or displayed.
      password: expect.any(String),
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Incorrect email or password.');
  });

  it('successful sign in signals entry to the app', async () => {
    mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } },
      error: null,
    });

    const { findByTestId, authenticatedEvents } = renderFlow();

    act(() => {
      findByTestId('welcome-sign-in').props.onPress();
    });
    act(() => {
      findByTestId('sign-in-email').props.onChangeText('knight@realm.io');
      findByTestId('sign-in-password').props.onChangeText('sword-shield-42');
    });

    await act(async () => {
      findByTestId('sign-in-submit').props.onPress();
    });

    expect(authenticatedEvents).toEqual([false]);
  });

  /** Fill the create-account form with a complete, valid submission. */
  function fillSignUpForm(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findByTestId: (id: string) => any,
    overrides: { playerName?: string; email?: string } = {}
  ) {
    act(() => {
      findByTestId('welcome-create-account').props.onPress();
    });
    act(() => {
      findByTestId('sign-up-email').props.onChangeText(
        overrides.email ?? 'founder@realm.io'
      );
      findByTestId('sign-up-player-name').props.onChangeText(
        overrides.playerName ?? 'Iron Knight'
      );
      findByTestId('sign-up-password').props.onChangeText('longenough1');
      findByTestId('sign-up-confirm-password').props.onChangeText('longenough1');
    });
  }

  it('sign up validates password mismatch without calling supabase', async () => {
    const { tree, findByTestId } = renderFlow();

    act(() => {
      findByTestId('welcome-create-account').props.onPress();
    });
    act(() => {
      findByTestId('sign-up-email').props.onChangeText('founder@realm.io');
      findByTestId('sign-up-password').props.onChangeText('longenough1');
      findByTestId('sign-up-confirm-password').props.onChangeText('different1');
    });

    await act(async () => {
      findByTestId('sign-up-submit').props.onPress();
    });

    expect(JSON.stringify(tree.toJSON())).toContain('Passwords do not match.');
    expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
  });

  it('sign up shows the honest verification notice when supabase requires email confirmation', async () => {
    mockSupabaseAuth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'u2' }, session: null },
      error: null,
    });

    const { tree, findByTestId } = renderFlow();

    fillSignUpForm(findByTestId);

    await act(async () => {
      findByTestId('sign-up-submit').props.onPress();
    });

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Verify your email');
    expect(json).toContain('founder@realm.io');
    // Registration must NOT be presented as complete.
    expect(json).not.toContain('Welcome back');
  });

  it('sign up enters the app when supabase returns a session immediately', async () => {
    mockSupabaseAuth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'u3' }, session: { user: { id: 'u3' } } },
      error: null,
    });

    const { findByTestId, authenticatedEvents } = renderFlow();

    fillSignUpForm(findByTestId);

    await act(async () => {
      findByTestId('sign-up-submit').props.onPress();
    });

    expect(authenticatedEvents).toEqual([false]);
  });

  it('sign up surfaces a friendly error when supabase rejects the account', async () => {
    mockSupabaseAuth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    });

    const { tree, findByTestId } = renderFlow();

    fillSignUpForm(findByTestId);

    await act(async () => {
      findByTestId('sign-up-submit').props.onPress();
    });

    expect(JSON.stringify(tree.toJSON())).toContain(
      'An account with this email already exists. Try signing in.'
    );
  });

  it('sign up never crashes the app when the network request throws', async () => {
    mockSupabaseAuth.signUp.mockRejectedValueOnce(new Error('offline'));

    const { tree, findByTestId } = renderFlow();

    fillSignUpForm(findByTestId);

    await act(async () => {
      findByTestId('sign-up-submit').props.onPress();
    });

    expect(JSON.stringify(tree.toJSON())).toContain('Registration failed.');
  });
});

describe('Player Name registration validation', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockSupabaseAuth = jest.requireMock('@/lib/supabase').supabase.auth;
  let fireSessionRef: AuthStateChangeCb | undefined;

  beforeEach(() => {
    mockSupabaseAuth.signUp.mockReset();
    mockSupabaseAuth.onAuthStateChange.mockReset();
    mockSupabaseAuth.onAuthStateChange.mockImplementation((cb: AuthStateChangeCb) => {
      fireSessionRef = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
  });

  function renderFlow() {
    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <AuthProvider>
          <AuthFlow onAuthenticated={() => {}} />
        </AuthProvider>
      );
    });
    act(() => {
      fireSessionRef?.('INITIAL_SESSION', null);
    });
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tree: tree!,
      findByTestId: (id: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tree as any).root.findByProps({ testID: id }),
    };
  }

  async function submitWithPlayerName(name: string) {
    const { tree, findByTestId } = renderFlow();
    act(() => {
      findByTestId('welcome-create-account').props.onPress();
    });
    act(() => {
      findByTestId('sign-up-email').props.onChangeText('founder@realm.io');
      findByTestId('sign-up-player-name').props.onChangeText(name);
      findByTestId('sign-up-password').props.onChangeText('longenough1');
      findByTestId('sign-up-confirm-password').props.onChangeText('longenough1');
    });
    await act(async () => {
      findByTestId('sign-up-submit').props.onPress();
    });
    return JSON.stringify(tree.toJSON());
  }

  it('rejects a whitespace-only player name', async () => {
    const json = await submitWithPlayerName('   ');
    expect(json).toContain('Player Name is required.');
    expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
  });

  it('rejects a player name shorter than 2 characters', async () => {
    const json = await submitWithPlayerName('A');
    expect(json).toContain('Player Name must be at least 2 characters.');
    expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
  });

  it('rejects a player name longer than 24 characters', async () => {
    const json = await submitWithPlayerName('x'.repeat(25));
    expect(json).toContain('Player Name must be at most 24 characters.');
    expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
  });

  it('trims the player name before sending it to supabase', async () => {
    mockSupabaseAuth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'u9' }, session: null },
      error: null,
    });
    const json = await submitWithPlayerName('  Iron Knight  ');
    expect(json).toContain('Verify your email');
    expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: { player_name: 'Iron Knight' },
        }),
      })
    );
  });
});

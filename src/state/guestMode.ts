import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Guest-mode preference flag.
 *
 * This is deliberately a SEPARATE storage key from all game state keys
 * (guest game state lives in `@fitness-messer/state/v1`, accounts in
 * `@fitness-messer/account-state/v1/<user-id>`). It only records whether
 * the user last chose "Continue as Guest", so it can never read, write,
 * overwrite or expose any game progress.
 */
const GUEST_MODE_KEY = '@fitness-messer/guest-mode/v1';

export async function getGuestMode(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(GUEST_MODE_KEY);
    return value === 'true';
  } catch {
    // A failed read must never force the app into any mode; default is
    // "not guest", which shows the welcome screen again — harmless.
    return false;
  }
}

export async function setGuestMode(isGuest: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(GUEST_MODE_KEY, isGuest ? 'true' : 'false');
  } catch {
    // Non-fatal: if the flag can't be saved the welcome screen simply
    // shows again on next launch. No game progress is affected.
  }
}

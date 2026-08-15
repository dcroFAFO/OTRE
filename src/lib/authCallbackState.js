import { sanitizeReturnTarget } from "@/lib/authReturnTo";

export const AUTH_CALLBACK_STATE_KEY = "otre_auth_callback_state";

export function createAuthCallbackTarget(
  returnTarget,
  {
    origin = window.location.origin,
    sessionStorage = window.sessionStorage,
    randomUUID = () => window.crypto.randomUUID(),
  } = {},
) {
  const state = randomUUID();
  sessionStorage.setItem(AUTH_CALLBACK_STATE_KEY, state);
  const callback = new URL("/login", origin);
  callback.searchParams.set("auth_state", state);
  callback.searchParams.set("next", sanitizeReturnTarget(returnTarget, origin));
  return callback.toString();
}


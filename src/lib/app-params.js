// @ts-check

const BOOTSTRAP_QUERY_KEYS = [
  "access_token",
  "auth_state",
  "clear_access_token",
  "app_id",
  "app_base_url",
  "functions_version",
  "from_url",
];

const memoryValues = new Map();
const memoryStorage = {
  getItem: (key) => memoryValues.get(key) ?? null,
  setItem: (key, value) => memoryValues.set(key, String(value)),
  removeItem: (key) => memoryValues.delete(key),
};

function envValue(env, name) {
  const value = env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeHttpsUrl(value) {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return undefined;
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.origin;
  } catch {
    return undefined;
  }
}

function removeBootstrapParams(url, history, title) {
  const before = url.search;
  for (const key of BOOTSTRAP_QUERY_KEYS) url.searchParams.delete(key);
  if (url.search !== before && history?.replaceState) {
    history.replaceState({}, title || "", `${url.pathname}${url.search}${url.hash}`);
  }
}

/**
 * Resolve Base44 startup settings without allowing URL parameters or stale
 * localStorage values to repoint this build at another app/backend.
 *
 * The access token remains a one-time URL callback value. It is removed from
 * the address bar immediately and is not written to storage until AuthContext
 * verifies it against this build's configured app id.
 */
export function resolveAppParams({
  env = import.meta.env,
  location = typeof window === "undefined" ? null : window.location,
  history = typeof window === "undefined" ? null : window.history,
  storage = typeof window === "undefined" ? memoryStorage : window.localStorage,
  sessionStorage = typeof window === "undefined" ? memoryStorage : window.sessionStorage,
  title = typeof document === "undefined" ? "" : document.title,
} = {}) {
  const appId = envValue(env, "VITE_BASE44_APP_ID");
  const appBaseUrl = safeHttpsUrl(envValue(env, "VITE_BASE44_APP_BASE_URL"));
  const functionsVersion = envValue(env, "VITE_BASE44_FUNCTIONS_VERSION");

  if (!location) {
    return { appId, token: null, tokenFromUrl: false, fromUrl: "/", functionsVersion, appBaseUrl };
  }

  const url = new URL(location.href);
  const callbackToken = url.searchParams.get("access_token") || null;
  const callbackState = url.searchParams.get("auth_state") || null;
  const expectedState = sessionStorage.getItem("otre_auth_callback_state");
  const callbackStateValid = Boolean(
    callbackToken && callbackState && expectedState && callbackState === expectedState,
  );
  const clearToken = url.searchParams.get("clear_access_token") === "true";

  if (callbackToken || callbackState) {
    sessionStorage.removeItem("otre_auth_callback_state");
  }

  if (clearToken || callbackToken) {
    storage.removeItem("base44_access_token");
    storage.removeItem("token");
  }

  // Previously verified SDK tokens must survive a reload. URL callback tokens
  // take precedence, but are held in memory until AuthContext verifies them.
  const token = (callbackStateValid ? callbackToken : null) || (!callbackToken && !clearToken
    ? storage.getItem("base44_access_token") || storage.getItem("token")
    : null);

  // functions_version is a deploy-time setting. Never retain a stale version
  // that can make newly deployed functions return 404.
  storage.removeItem("base44_functions_version");
  removeBootstrapParams(url, history, title);

  return {
    appId,
    token,
    tokenFromUrl: callbackStateValid,
    fromUrl: `${url.origin}${url.pathname}${url.search}${url.hash}`,
    functionsVersion,
    appBaseUrl,
  };
}

export const appParams = resolveAppParams();

import { createClient, removeAccessToken } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export function clearStoredBase44Token() {
  removeAccessToken({});
  removeAccessToken({ storageKey: 'token' });
}

// Hold a discovered token in appParams until AuthContext verifies it. The SDK
// otherwise attaches stale local-storage tokens to public requests immediately.
if (token) {
  clearStoredBase44Token();
}

// Authentication is applied only after AuthContext verifies the stored token.
export const base44 = createClient({
  appId,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

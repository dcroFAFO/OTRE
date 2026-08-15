// @ts-check

import { createClient, removeAccessToken } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, tokenFromUrl, functionsVersion, appBaseUrl } = appParams;

if (!appId) {
  throw new Error('VITE_BASE44_APP_ID is required to start the application.');
}

export function clearStoredBase44Token() {
  removeAccessToken({});
  removeAccessToken({ storageKey: 'token' });
}

// Hold a discovered token in appParams until AuthContext verifies it. The SDK
// otherwise attaches stale local-storage tokens to public requests immediately.
if (tokenFromUrl) {
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

export async function getPublicAppSettings() {
  const response = await fetch(`/api/apps/public/prod/public-settings/by-id/${encodeURIComponent(appId)}`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}`, 'X-App-Id': appId } : { 'X-App-Id': appId },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = /** @type {Error & { status?: number, data?: unknown }} */ (
      new Error(body?.message || 'Failed to load application settings.')
    );
    error.status = response.status;
    error.data = body;
    throw error;
  }
  return response.json();
}

export async function getCurrentUserWithToken(candidateToken) {
  const response = await fetch(`/api/apps/${encodeURIComponent(appId)}/entities/User/me`, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${candidateToken}`, 'X-App-Id': appId },
  });
  if (!response.ok) {
    const error = /** @type {Error & { status?: number }} */ (new Error('Current user request failed.'));
    error.status = response.status;
    throw error;
  }
  return response.json();
}

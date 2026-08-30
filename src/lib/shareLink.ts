import { Platform } from 'react-native';

// Mirrors AuthContext's getRedirectUrl() — falls back to the production
// domain when there's no browser window (native), since there's no custom
// URL scheme set up yet for a standalone app to catch these links itself.
export function getAppBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return 'https://passdown.it.com';
}

export function getRecipeShareUrl(recipeId: string): string {
  return `${getAppBaseUrl()}/recipe/${recipeId}`;
}

export function getCircleInviteUrl(circleId: string): string {
  return `${getAppBaseUrl()}/circle/${circleId}/join`;
}

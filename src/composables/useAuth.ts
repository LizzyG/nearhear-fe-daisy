import { computed, ref } from 'vue';

import { resolveApiPath } from '@/config/api';
import { usePostHog } from '@/composables/usePostHog';

// Storage keys
const STORAGE_KEYS = {
  lastSectionBeforeAuth: 'nearhear-last-section-before-auth',
} as const;

// Cookie name constants
const COOKIE_NAMES = {
  spotifyUserId: 'spotify_user_id',
  spotifyAuthToken: 'spotify_auth_token',
} as const;

// Shared reactive state (singleton pattern)
const spotifyUserId = ref<string | undefined>(undefined);
const isInitialized = ref(false);

/**
 * Get a cookie value by name
 */
const getCookie = (name: string): string | undefined => {
  const value = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
  return value || undefined;
};

/**
 * Composable for managing Spotify authentication
 */
export const useAuth = () => {
  const { identify: posthogIdentify, reset: posthogReset } = usePostHog();

  // Initialize auth state from cookies (only once)
  const initAuth = () => {
    if (isInitialized.value) return;

    const userId = getCookie(COOKIE_NAMES.spotifyUserId);
    if (userId && userId !== 'error') {
      spotifyUserId.value = userId;
      // Identify user in PostHog
      posthogIdentify(userId);
    }
    isInitialized.value = true;
  };

  // Computed properties for auth state
  const isLoggedIn = computed(() => {
    return !!spotifyUserId.value && spotifyUserId.value !== 'error';
  });

  const isAuthError = computed(() => {
    return spotifyUserId.value === 'error';
  });

  const hasNoAuth = computed(() => {
    return spotifyUserId.value === undefined;
  });

  const userId = computed(() => spotifyUserId.value);

  // Storage helpers
  const storeLastSection = (path: string) => {
    localStorage.setItem(STORAGE_KEYS.lastSectionBeforeAuth, path);
  };

  const getLastSection = (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.lastSectionBeforeAuth);
  };

  const clearLastSection = () => {
    localStorage.removeItem(STORAGE_KEYS.lastSectionBeforeAuth);
  };

  /**
   * Initiate Spotify OAuth flow
   * @param currentPath - Current route path to return to after auth
   */
  const loginWithSpotify = (currentPath?: string) => {
    // Store current location to redirect back after auth
    if (currentPath) {
      storeLastSection(currentPath);
    }

    // Build auth endpoint URL
    let authEndpoint = resolveApiPath('/spotify/auth');
    if (spotifyUserId.value) {
      authEndpoint += `?userid=${encodeURIComponent(spotifyUserId.value)}`;
    }
    console.log('authEndpoint', authEndpoint);
    // Redirect to Spotify OAuth
    window.location.href = authEndpoint;
  };

  /**
   * Logout from Spotify
   */
  const logout = async () => {
    try {
      const logoutEndpoint = resolveApiPath('/spotify/logout');
      await fetch(logoutEndpoint, {
        method: 'GET',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API response
      spotifyUserId.value = undefined;
      // Reset PostHog identity
      posthogReset();
    }
  };

  /**
   * Refresh auth state from cookies
   * Useful after OAuth callback redirect
   */
  const refreshAuthState = () => {
    const userId = getCookie(COOKIE_NAMES.spotifyUserId);
    if (userId && userId !== 'error') {
      spotifyUserId.value = userId;
      // Identify user in PostHog
      posthogIdentify(userId);
    } else if (userId === 'error') {
      spotifyUserId.value = 'error';
    } else {
      spotifyUserId.value = undefined;
    }
  };

  /**
   * Check if user was redirected from OAuth and handle redirect
   * @returns The stored last section path if available
   */
  const handleOAuthRedirect = (): string | null => {
    // Refresh state to pick up new cookies from OAuth callback
    refreshAuthState();

    // Get and clear the stored last section
    const lastSection = getLastSection();
    if (lastSection) {
      clearLastSection();
    }

    return lastSection;
  };

  // Initialize on first use
  initAuth();

  return {
    // State
    isLoggedIn,
    isAuthError,
    hasNoAuth,
    userId,

    // Actions
    loginWithSpotify,
    logout,
    refreshAuthState,
    handleOAuthRedirect,

    // Storage helpers
    storeLastSection,
    getLastSection,
    clearLastSection,
  };
};

import { computed, ref } from 'vue';

import { apiFetch } from '@/utils/api';

// Cookie name for admin auth token
const ADMIN_AUTH_COOKIE = 'nearhear_admin_token';

// Shared reactive state (singleton pattern)
const adminToken = ref<string | undefined>(undefined);
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
 * Composable for managing admin authentication
 */
export const useAdminAuth = () => {
  // Initialize auth state from cookies (only once)
  const initAuth = () => {
    if (isInitialized.value) return;

    const token = getCookie(ADMIN_AUTH_COOKIE);
    if (token) {
      adminToken.value = token;
    }
    isInitialized.value = true;
  };

  // Computed properties for auth state
  const isAdminLoggedIn = computed(() => !!adminToken.value);

  const token = computed(() => adminToken.value);

  /**
   * Login with username and password
   * @returns Object with success status and optional error message
   */
  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload = { username, password };
      console.debug('Admin login payload:', payload);

      // Use shared apiFetch helper which sets headers and includes credentials
      await apiFetch<void>('/admin/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Server sets cookie via Set-Cookie header.
      // Try to read it to update local state for UI.
      const token = getCookie(ADMIN_AUTH_COOKIE);
      if (token) {
        adminToken.value = token;
      } else {
        // Cookie might be HttpOnly, mark as logged in anyway
        adminToken.value = 'logged-in';
      }
      return { success: true };
    } catch (err) {
      console.error('Admin login error:', err);

      // Try to extract a helpful error message from the thrown error
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMessage || 'Network error. Please try again.' };
    }
  };

  /**
   * Logout from admin
   */
  const logout = async () => {
    try {
      // Call server logout endpoint to clear the cookie
      await apiFetch<void>('/admin/logout', { method: 'POST' });
    } catch (error) {
      console.error('Admin logout error:', error);
    } finally {
      // Clear local state regardless of API response
      adminToken.value = undefined;
    }
  };

  /**
   * Refresh auth state from cookies
   */
  const refreshAuthState = () => {
    const storedToken = getCookie(ADMIN_AUTH_COOKIE);
    adminToken.value = storedToken || undefined;
  };

  // Initialize on first use
  initAuth();

  return {
    // State
    isAdminLoggedIn,
    token,

    // Actions
    login,
    logout,
    refreshAuthState,
  };
};


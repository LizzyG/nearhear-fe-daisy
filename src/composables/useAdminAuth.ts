import { computed, ref } from 'vue';

import { apiFetch } from '@/utils/api';

// Shared reactive state (singleton pattern)
const adminToken = ref<string | undefined>(undefined);
const isInitialized = ref(false);
const isCheckingSession = ref(false);

/**
 * Composable for managing admin authentication
 */
export const useAdminAuth = () => {
  // Initialize auth state by checking session with server (only once)
  const initAuth = async () => {
    if (isInitialized.value || isCheckingSession.value) return;
    isCheckingSession.value = true;

    try {
      // Check if we have a valid session cookie (HttpOnly, so we can't read it directly)
      await apiFetch<void>('/admin/checkSession', { method: 'GET' });
      // If we get here without error, the session is valid
      adminToken.value = 'session-valid';
    } catch {
      // Session invalid or expired
      adminToken.value = undefined;
    } finally {
      isInitialized.value = true;
      isCheckingSession.value = false;
    }
  };

  // Computed properties for auth state
  const isAdminLoggedIn = computed(() => !!adminToken.value);
  const isLoading = computed(() => isCheckingSession.value);

  const token = computed(() => adminToken.value);

  /**
   * Login with username and password
   * @returns Object with success status and optional error message
   */
  const login = async (
    username: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload = { username, password };

      // Use shared apiFetch helper which sets headers and includes credentials
      await apiFetch<void>('/admin/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Server sets HttpOnly cookie via Set-Cookie header
      // Mark as logged in for UI state
      adminToken.value = 'session-valid';
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
   * Refresh auth state by checking session with server
   */
  const refreshAuthState = async () => {
    try {
      await apiFetch<void>('/admin/checkSession', { method: 'GET' });
      adminToken.value = 'session-valid';
    } catch {
      adminToken.value = undefined;
    }
  };

  // Initialize on first use
  initAuth();

  return {
    // State
    isAdminLoggedIn,
    isLoading,
    token,

    // Actions
    login,
    logout,
    refreshAuthState,
  };
};

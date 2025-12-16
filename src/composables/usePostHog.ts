import posthog from 'posthog-js';

// Singleton flag to prevent multiple initializations
let isInitialized = false;
let isEnabled = false;

/**
 * Initialize and provide access to PostHog analytics
 */
export const usePostHog = () => {
  if (!isInitialized) {
    const apiKey = import.meta.env.VITE_POSTHOG_KEY;
    const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (apiKey) {
      posthog.init(apiKey, {
        api_host: apiHost,
        person_profiles: 'identified_only',
        capture_pageview: false, // We'll handle page views manually in the router
        capture_pageleave: true,
      });
      isEnabled = true;
      console.log('[PostHog] Initialized successfully');
    } else {
      console.warn('[PostHog] VITE_POSTHOG_KEY not set - analytics disabled');
    }
    isInitialized = true;
  }

  /**
   * Identify a user (call after successful authentication)
   */
  const identify = (userId: string, properties?: Record<string, unknown>) => {
    if (!isEnabled) return;
    posthog.identify(userId, properties);
  };

  /**
   * Reset user identity (call on logout)
   */
  const reset = () => {
    if (!isEnabled) return;
    posthog.reset();
  };

  /**
   * Capture a custom event
   */
  const capture = (eventName: string, properties?: Record<string, unknown>) => {
    if (!isEnabled) return;
    posthog.capture(eventName, properties);
  };

  /**
   * Capture a page view with route metadata
   */
  const capturePageView = (
    path: string,
    routeName?: string,
    properties?: Record<string, unknown>,
  ) => {
    if (!isEnabled) return;
    console.log('[PostHog] Capturing pageview:', path, routeName);
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      path,
      route_name: routeName,
      ...properties,
    });
  };

  return {
    posthog,
    identify,
    reset,
    capture,
    capturePageView,
  };
};

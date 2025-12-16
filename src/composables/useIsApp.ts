import { ref, onMounted } from 'vue';

/**
 * Composable to detect if the app is running inside an iOS WebView
 * Checks for the presence of webkit.messageHandlers.bridge which is
 * injected by the native iOS app
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: Window & { webkit?: { messageHandlers?: { bridge?: any } } };

const isApp = ref(false);
const isInitialized = ref(false);

const checkIsApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!window.webkit?.messageHandlers?.bridge;
};

export function useIsApp() {
  onMounted(() => {
    if (!isInitialized.value) {
      isApp.value = checkIsApp();
      isInitialized.value = true;
    }
  });

  return {
    isApp,
    checkIsApp,
  };
}

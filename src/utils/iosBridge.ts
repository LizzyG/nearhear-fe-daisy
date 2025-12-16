/**
 * iOS WebView Bridge
 *
 * This file supports communication between the iOS app and the JavaScript.
 * Copied from: https://dev.to/alexiey91/interaction-between-vue-js-webview-and-native-apps-15e2
 *
 * Usage in Vue components:
 * - Include the `name` property on your component
 * - Put the function and reference to `this` on the window in beforeMount:
 *
 * @example
 * beforeMount(){
 *     // Create interface between Webview and Native application
 *     // 'NowPlaying' matches the name property on the component
 *     window['NowPlaying'] = {
 *         components: this,
 *         LocationResponse: (data) => this.LocationResponse(data),
 *     };
 * },
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

// var nativeApp;

function LocationResponse(data: unknown) {
  window.MapPage.LocationResponse(data);
}

function UpdateNowPlaying(data: unknown) {
  window.NowPlaying.UpdateNowPlaying(data);
}

function handleAuthData(data: { token?: string; userID?: string }) {
  console.log('received auth data, setting cookies');
  var d = new Date();
  const exdays = 365;
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  var expires = 'expires=' + d.toUTCString();

  // Check if the token is not null or empty, then set the cookie
  if (data.token && data.token.trim() !== '') {
    document.cookie =
      'spotify_auth_token=' + data.token.trim() + ';' + expires + ';path=/;domain=.nearhear.app';
  } else {
    console.log('token was empty');
  }

  // Check if the userID is not null or empty, then set the cookie
  if (data.userID && data.userID.trim() !== '') {
    document.cookie =
      'spotify_user_id=' + data.userID.trim() + ';' + expires + ';path=/;domain=.nearhear.app';
  } else {
    console.log('user id was empty');
  }
}

function clearAuthCookies() {
  document.cookie =
    'spotify_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;domain=.nearhear.app';
  document.cookie =
    'spotify_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;domain=.nearhear.app';
}

// Export functions for use in Vue components and expose to window for iOS bridge
export { LocationResponse, UpdateNowPlaying, handleAuthData, clearAuthCookies };

// Attach to window for iOS native app access
if (typeof window !== 'undefined') {
  window.LocationResponse = LocationResponse;
  window.UpdateNowPlaying = UpdateNowPlaying;
  window.handleAuthData = handleAuthData;
  window.clearAuthCookies = clearAuthCookies;
}

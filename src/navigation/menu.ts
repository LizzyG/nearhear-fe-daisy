import calendarIcon from '@/assets/icons/calendar.svg';
import playlistIcon from '@/assets/icons/playlist.svg';
import addIcon from '@/assets/icons/add.svg';
import mapIcon from '@/assets/icons/map.svg';

export interface MainNavItem {
  name: string;
  label: string;
  path: string;
  icon?: string;
}

export interface AddMenuItem {
  name: string;
  label: string;
  path: string;
}

// Desktop top navigation items (visible in header)
export const desktopNavItems: MainNavItem[] = [
  { name: 'calendar', label: 'Calendar', path: '/calendar', icon: calendarIcon },
  { name: 'map', label: 'Map', path: '/map', icon: mapIcon },
  { name: 'playlists', label: 'Playlists', path: '/playlists', icon: playlistIcon },
];

// Mobile bottom navigation items (first 4 items)
export const mobileBottomNavItems: MainNavItem[] = [
  { name: 'calendar', label: 'Calendar', path: '/calendar', icon: calendarIcon },
  { name: 'map', label: 'Map', path: '/map', icon: mapIcon },
  { name: 'playlists', label: 'Playlists', path: '/playlists', icon: playlistIcon },
];

// Add dropdown menu items
export const addMenuItems: AddMenuItem[] = [
  { name: 'add-events', label: 'Add Event', path: '/add-events' },
  { name: 'add-artist', label: 'Add Artist', path: '/add-artist' },
];

// Add icon export for use in components
export { addIcon };

// Items that appear in the "More" drawer menu on mobile
export interface MoreMenuItem {
  name: string;
  label: string;
  path?: string;
  action?: () => void;
}

export const moreMenuItems: MoreMenuItem[] = [
  { name: 'profile', label: 'Profile', path: '/profile' },
  { name: 'faq', label: 'FAQ', path: '/faq' },
  { name: 'about', label: 'About', path: '/about' },
  { name: 'mailing-list', label: 'Mailing List', path: '/mailing-list' },
  { name: 'settings', label: 'Settings', path: '/settings' },
];

// Legacy export for backward compatibility (all routes)
export const mainNavItems: MainNavItem[] = [
  ...desktopNavItems,
  { name: 'add-events', label: 'Add Events', path: '/add-events', icon: addIcon },
];

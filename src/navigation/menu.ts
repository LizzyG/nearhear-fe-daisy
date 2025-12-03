import calendarIcon from '@/assets/icons/calendar.svg';
import playlistIcon from '@/assets/icons/playlist.svg';
import showsIcon from '@/assets/icons/shows.svg';
import addIcon from '@/assets/icons/add.svg';
import mapIcon from '@/assets/icons/map.svg';

export interface MainNavItem {
  name: string;
  label: string;
  path: string;
  icon?: string;
}

// Desktop top navigation items (visible in header)
export const desktopNavItems: MainNavItem[] = [
  { name: 'calendar', label: 'Calendar', path: '/calendar', icon: calendarIcon },
  { name: 'map', label: 'Map', path: '/map', icon: mapIcon },
  { name: 'playlists', label: 'Playlists', path: '/playlists', icon: playlistIcon },
  { name: 'your-shows', label: 'Your Shows', path: '/your-shows', icon: showsIcon },
];

// Mobile bottom navigation items (first 4 items)
export const mobileBottomNavItems: MainNavItem[] = [
  { name: 'calendar', label: 'Calendar', path: '/calendar', icon: calendarIcon },
  { name: 'map', label: 'Map', path: '/map', icon: mapIcon },
  { name: 'playlists', label: 'Playlists', path: '/playlists', icon: playlistIcon },
  { name: 'your-shows', label: 'Your Shows', path: '/your-shows', icon: showsIcon },
];

// Items that appear in the "More" drawer menu on mobile
export interface MoreMenuItem {
  name: string;
  label: string;
  path?: string;
  action?: () => void;
}

export const moreMenuItems: MoreMenuItem[] = [
  { name: 'add-events', label: 'Add Events', path: '/add-events' },
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

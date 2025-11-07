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

export const mainNavItems: MainNavItem[] = [
  { name: 'calendar', label: 'Calendar', path: '/calendar', icon: calendarIcon },
  { name: 'playlists', label: 'Playlists', path: '/playlists', icon: playlistIcon },
  { name: 'your-shows', label: 'Your Shows', path: '/your-shows', icon: showsIcon },
  { name: 'add-events', label: 'Add Events', path: '/add-events', icon: addIcon },
  { name: 'map', label: 'Map', path: '/map', icon: mapIcon },
];

import type { RouteRecordRaw } from 'vue-router';

import { mainNavItems, addMenuItems } from '@/navigation/menu';
import AddArtistView from '@/views/AddArtistView.vue';
import AddEventsView from '@/views/AddEventsView.vue';
import CalendarView from '@/views/CalendarView.vue';
import MapView from '@/views/MapView.vue';
import PlaylistsView from '@/views/PlaylistsView.vue';
import ProfileView from '@/views/ProfileView.vue';

export interface AppRouteMeta {
  label: string;
  showInNav?: boolean;
}

declare module 'vue-router' {
  interface RouteMeta {
    label?: string;
    showInNav?: boolean;
  }
}

const routeComponentMap: Record<string, RouteRecordRaw['component']> = {
  calendar: CalendarView,
  playlists: PlaylistsView,
  'add-events': AddEventsView,
  'add-artist': AddArtistView,
  map: MapView,
  profile: ProfileView,
  // Placeholder components for more menu items (can be created later)
  faq: () => Promise.resolve({ default: { template: '<div>FAQ</div>' } }),
  about: () => Promise.resolve({ default: { template: '<div>About</div>' } }),
  'mailing-list': () => Promise.resolve({ default: { template: '<div>Mailing List</div>' } }),
  settings: () => Promise.resolve({ default: { template: '<div>Settings</div>' } }),
};

export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'calendar' },
  },
  // Main navigation routes
  ...mainNavItems.map((item) => {
    const component = routeComponentMap[item.name];

    if (!component) {
      throw new Error(`Missing component mapping for route "${item.name}"`);
    }

    return {
      path: item.path,
      name: item.name,
      component,
      meta: {
        label: item.label,
        showInNav: true,
      },
    };
  }),
  // Add menu routes
  ...addMenuItems.map((item) => {
    const component = routeComponentMap[item.name];

    if (!component) {
      throw new Error(`Missing component mapping for route "${item.name}"`);
    }

    return {
      path: item.path,
      name: item.name,
      component,
      meta: {
        label: item.label,
      },
    };
  }),
  // Additional routes for more menu
  {
    path: '/profile',
    name: 'profile',
    component: routeComponentMap.profile,
    meta: { label: 'Profile / Account' },
  },
  {
    path: '/faq',
    name: 'faq',
    component: routeComponentMap.faq,
    meta: { label: 'FAQ' },
  },
  {
    path: '/about',
    name: 'about',
    component: routeComponentMap.about,
    meta: { label: 'About' },
  },
  {
    path: '/mailing-list',
    name: 'mailing-list',
    component: routeComponentMap['mailing-list'],
    meta: { label: 'Mailing List' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: routeComponentMap.settings,
    meta: { label: 'Settings' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'calendar' },
  },
];

export interface AppNavigationLink {
  name: string;
  label: string;
  to: { name: string };
  icon?: string;
}

export const primaryNavigation: AppNavigationLink[] = mainNavItems.map((item) => ({
  name: item.name,
  label: item.label,
  icon: item.icon,
  to: { name: item.name },
}));

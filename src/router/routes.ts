import type { RouteRecordRaw } from 'vue-router';

import { mainNavItems } from '@/navigation/menu';
import AddEventsView from '@/views/AddEventsView.vue';
import CalendarView from '@/views/CalendarView.vue';
import MapView from '@/views/MapView.vue';
import PlaylistsView from '@/views/PlaylistsView.vue';
import YourShowsView from '@/views/YourShowsView.vue';

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
  'your-shows': YourShowsView,
  'add-events': AddEventsView,
  map: MapView,
};

export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'calendar' },
  },
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

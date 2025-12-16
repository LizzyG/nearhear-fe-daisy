import { createRouter, createWebHistory } from 'vue-router';

import { usePostHog } from '@/composables/usePostHog';
import { appRoutes } from './routes';

// Initialize PostHog
const { capturePageView } = usePostHog();

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: appRoutes,
  scrollBehavior: () => ({ top: 0 }),
});

// Track page views on navigation
router.afterEach((to) => {
  capturePageView(to.path, to.name?.toString(), {
    route_label: to.meta?.label,
  });
});

export default router;

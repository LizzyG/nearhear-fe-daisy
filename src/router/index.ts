import { createRouter, createWebHistory } from 'vue-router';

import { appRoutes } from './routes';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: appRoutes,
  scrollBehavior: () => ({ top: 0 }),
});

export default router;

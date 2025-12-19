<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

import PageHeader from '@/components/layout/PageHeader.vue';
import AdminLogin from '@/components/admin/AdminLogin.vue';
import { useAdminAuth } from '@/composables/useAdminAuth';

// Admin sections
import AdminLookups from '@/components/admin/sections/AdminLookups.vue';
import AdminArtists from '@/components/admin/sections/AdminArtists.vue';
import AdminEvents from '@/components/admin/sections/AdminEvents.vue';
import AdminUsers from '@/components/admin/sections/AdminUsers.vue';
import AdminVenues from '@/components/admin/sections/AdminVenues.vue';
import AdminErrors from '@/components/admin/sections/AdminErrors.vue';
import AdminStats from '@/components/admin/sections/AdminStats.vue';

const router = useRouter();
const { isAdminLoggedIn, logout } = useAdminAuth();

type AdminSection = 'lookups' | 'artists' | 'events' | 'users' | 'venues' | 'errors' | 'stats';

const activeSection = ref<AdminSection>('lookups');

const sections: { id: AdminSection; label: string; icon: string }[] = [
  { id: 'lookups', label: 'Lookups', icon: 'search' },
  { id: 'artists', label: 'Manage Artists', icon: 'music' },
  { id: 'events', label: 'Manage Events', icon: 'calendar' },
  { id: 'users', label: 'Manage Users', icon: 'users' },
  { id: 'venues', label: 'Manage Venues', icon: 'map-pin' },
  { id: 'errors', label: 'Errors', icon: 'alert' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
];

const currentSectionComponent = computed(() => {
  const componentMap = {
    lookups: AdminLookups,
    artists: AdminArtists,
    events: AdminEvents,
    users: AdminUsers,
    venues: AdminVenues,
    errors: AdminErrors,
    stats: AdminStats,
  };
  return componentMap[activeSection.value];
});

const handleLoginSuccess = () => {
  // Auth state is already updated in the composable
};

const handleLoginCancel = () => {
  router.push({ name: 'calendar' });
};

const handleLogout = () => {
  logout();
  router.push({ name: 'calendar' });
};
</script>

<template>
  <section>
    <!-- Show login if not authenticated -->
    <template v-if="!isAdminLoggedIn">
      <PageHeader title="Admin" />
      <AdminLogin @success="handleLoginSuccess" @cancel="handleLoginCancel" />
    </template>

    <!-- Show admin panel if authenticated -->
    <template v-else>
      <PageHeader title="Admin Panel">
        <div class="mt-4">
          <button
            class="btn-action-outline-error text-sm"
            @click="handleLogout"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="mr-2 h-4 w-4"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
            Sign Out
          </button>
        </div>
      </PageHeader>

      <div class="mt-8">
        <!-- Navigation Tabs -->
        <div class="mb-6 overflow-x-auto">
          <div class="flex min-w-max gap-2 border-b border-base-300 pb-2 md:flex-wrap md:gap-3">
            <button
              v-for="section in sections"
              :key="section.id"
              :class="[
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activeSection === section.id
                  ? 'bg-primary text-primary-content'
                  : 'border border-base-300 bg-base-100 text-base-content hover:border-primary hover:bg-base-200',
              ]"
              @click="activeSection = section.id"
            >
              <!-- Icons -->
              <svg
                v-if="section.icon === 'search'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <svg
                v-else-if="section.icon === 'music'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
                />
              </svg>
              <svg
                v-else-if="section.icon === 'calendar'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              <svg
                v-else-if="section.icon === 'users'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <svg
                v-else-if="section.icon === 'map-pin'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              <svg
                v-else-if="section.icon === 'alert'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <svg
                v-else-if="section.icon === 'chart'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
              {{ section.label }}
            </button>
          </div>
        </div>

        <!-- Active Section Content -->
        <div class="card border border-base-300 bg-base-100 shadow-sm">
          <div class="card-body p-6">
            <component :is="currentSectionComponent" />
          </div>
        </div>
      </div>
    </template>
  </section>
</template>


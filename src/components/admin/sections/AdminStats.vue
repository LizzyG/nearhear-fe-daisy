<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isLoading = ref(true);

// Placeholder stats data
const stats = ref({
  totalArtists: 0,
  totalEvents: 0,
  totalVenues: 0,
  totalUsers: 0,
  eventsThisWeek: 0,
  newUsersThisMonth: 0,
});

const recentActivity = ref<{ action: string; timestamp: string; user?: string }[]>([]);

onMounted(() => {
  // TODO: Fetch actual stats
  setTimeout(() => {
    stats.value = {
      totalArtists: 1234,
      totalEvents: 5678,
      totalVenues: 89,
      totalUsers: 456,
      eventsThisWeek: 42,
      newUsersThisMonth: 23,
    };
    recentActivity.value = [
      { action: 'New event added: Jazz Night at Blue Note', timestamp: '5 minutes ago' },
      { action: 'Artist profile updated: The Strokes', timestamp: '15 minutes ago' },
      { action: 'New user registered', timestamp: '1 hour ago', user: 'user@example.com' },
      { action: 'Venue added: Crystal Ballroom', timestamp: '2 hours ago' },
    ];
    isLoading.value = false;
  }, 500);
});

const statCards = [
  { label: 'Total Artists', key: 'totalArtists', icon: 'music' },
  { label: 'Total Events', key: 'totalEvents', icon: 'calendar' },
  { label: 'Total Venues', key: 'totalVenues', icon: 'map-pin' },
  { label: 'Total Users', key: 'totalUsers', icon: 'users' },
  { label: 'Events This Week', key: 'eventsThisWeek', icon: 'trending' },
  { label: 'New Users This Month', key: 'newUsersThisMonth', icon: 'user-plus' },
] as const;
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="heading-section">Statistics</h2>
      <p class="text-base-content/60 mt-1 text-sm">
        Overview of application metrics and activity.
      </p>
    </div>

    <!-- Stats Grid -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="stat in statCards"
          :key="stat.key"
          class="rounded-lg border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary"
        >
          <div class="flex items-center gap-4">
            <div class="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
              <svg
                v-if="stat.icon === 'music'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-6 w-6 text-primary"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
                />
              </svg>
              <svg
                v-else-if="stat.icon === 'calendar'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-6 w-6 text-primary"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              <svg
                v-else-if="stat.icon === 'map-pin'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-6 w-6 text-primary"
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
                v-else-if="stat.icon === 'users'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-6 w-6 text-primary"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <svg
                v-else-if="stat.icon === 'trending'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-6 w-6 text-primary"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                />
              </svg>
              <svg
                v-else-if="stat.icon === 'user-plus'"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-6 w-6 text-primary"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                />
              </svg>
            </div>
            <div>
              <p class="text-base-content/60 text-sm">{{ stat.label }}</p>
              <p class="text-2xl font-bold text-base-content">
                {{ stats[stat.key].toLocaleString() }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="mt-8">
        <h3 class="heading-card mb-4">Recent Activity</h3>
        <div class="overflow-hidden rounded-lg border border-base-300">
          <div
            v-for="(activity, index) in recentActivity"
            :key="index"
            :class="[
              'flex items-center justify-between p-4',
              index % 2 === 0 ? 'bg-base-200' : 'bg-row-alt',
            ]"
          >
            <div>
              <p class="text-base-content">{{ activity.action }}</p>
              <p v-if="activity.user" class="text-base-content/60 text-sm">
                {{ activity.user }}
              </p>
            </div>
            <span class="text-base-content/50 text-sm">{{ activity.timestamp }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>


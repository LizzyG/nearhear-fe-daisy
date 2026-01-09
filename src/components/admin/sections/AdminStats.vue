<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '@/utils/api';
import type { ScraperStatus, GetScraperStatusResponse } from '@/types/adminLookup';

const isLoading = ref(true);
const error = ref('');
const scrapers = ref<ScraperStatus[]>([]);
const togglingIds = ref<Set<number>>(new Set());

const fetchScraperStatus = async () => {
  isLoading.value = true;
  error.value = '';
  try {
    const response = await apiFetch<GetScraperStatusResponse>('/admin/getScraperStatus');
    scrapers.value = response.scrapers || [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load scraper status';
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchScraperStatus);

// Scrapers with 0 events on last run
const failedScrapers = computed(() => 
  scrapers.value.filter(s => s.lastRunAt && s.lastEventCount === 0 && !s.isPaused)
);

// Scrapers that are working fine
const workingScrapers = computed(() => 
  scrapers.value.filter(s => s.lastRunAt && s.lastEventCount > 0 && !s.isPaused)
);

// Paused scrapers
const pausedScrapers = computed(() => 
  scrapers.value.filter(s => s.isPaused)
);

// Scrapers that have never run
const neverRunScrapers = computed(() => 
  scrapers.value.filter(s => !s.lastRunAt && !s.isPaused)
);

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const formatDateOnly = (dateStr?: string) => {
  if (!dateStr) return '-';
  return dateStr.split('T')[0];
};

const timeSince = (dateStr?: string) => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
};

const togglePause = async (scraper: ScraperStatus) => {
  togglingIds.value.add(scraper.scraperId);
  try {
    const newPauseState = !scraper.isPaused;
    await apiFetch(`/admin/toggleScraperPause?scraperId=${scraper.scraperId}&pause=${newPauseState}`);
    scraper.isPaused = newPauseState;
  } catch (err) {
    alert('Failed to toggle pause: ' + (err instanceof Error ? err.message : err));
  } finally {
    togglingIds.value.delete(scraper.scraperId);
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="heading-section">Scrapers</h2>
        <p class="text-base-content/60 mt-1 text-sm">Monitor scraper status and execution history.</p>
      </div>
      <button class="btn-action-outline" @click="fetchScraperStatus" :disabled="isLoading">
        <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
        <span v-else>Refresh</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-error">
      <span>{{ error }}</span>
    </div>

    <template v-else>
      <!-- Summary Cards -->
      <div class="grid gap-4 sm:grid-cols-4">
        <div class="rounded-lg border border-error/30 bg-error/5 p-4">
          <p class="text-error text-2xl font-bold">{{ failedScrapers.length }}</p>
          <p class="text-base-content/60 text-sm">Failed (0 events)</p>
        </div>
        <div class="rounded-lg border border-success/30 bg-success/5 p-4">
          <p class="text-success text-2xl font-bold">{{ workingScrapers.length }}</p>
          <p class="text-base-content/60 text-sm">Working</p>
        </div>
        <div class="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p class="text-warning text-2xl font-bold">{{ pausedScrapers.length }}</p>
          <p class="text-base-content/60 text-sm">Paused</p>
        </div>
        <div class="rounded-lg border border-base-300 bg-base-200 p-4">
          <p class="text-base-content text-2xl font-bold">{{ neverRunScrapers.length }}</p>
          <p class="text-base-content/60 text-sm">Never Run</p>
        </div>
      </div>

      <!-- Failed Scrapers (0 events) -->
      <div v-if="failedScrapers.length" class="space-y-3">
        <h3 class="heading-card text-error flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Scrapers with 0 Events (Last Run)
        </h3>
        <div class="overflow-x-auto rounded-lg border border-error/30">
          <table class="table table-sm w-full">
            <thead class="bg-error/10">
              <tr>
                <th>Name</th>
                <th>Last Run</th>
                <th>Last Success</th>
                <th>Success Count</th>
                <th>Pages</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in failedScrapers" :key="s.scraperId" class="hover">
                <td>
                  <a :href="s.url" target="_blank" rel="noopener" class="link link-primary">{{ s.name }}</a>
                </td>
                <td>{{ timeSince(s.lastRunAt) }}</td>
                <td>{{ s.lastSuccessAt ? timeSince(s.lastSuccessAt) : 'Never' }}</td>
                <td>{{ s.lastSuccessCount || 0 }}</td>
                <td>{{ s.lastNumPages }}</td>
                <td>
                  <button 
                    class="btn btn-xs btn-warning"
                    :disabled="togglingIds.has(s.scraperId)"
                    @click="togglePause(s)"
                  >
                    <span v-if="togglingIds.has(s.scraperId)" class="loading loading-spinner loading-xs"></span>
                    <span v-else>Pause</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Working Scrapers -->
      <div v-if="workingScrapers.length" class="space-y-3">
        <h3 class="heading-card text-success flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Working Scrapers
        </h3>
        <div class="overflow-x-auto rounded-lg border border-success/30">
          <table class="table table-sm w-full">
            <thead class="bg-success/10">
              <tr>
                <th>Name</th>
                <th>Last Run</th>
                <th>Events</th>
                <th>Date Range</th>
                <th>Pages</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in workingScrapers" :key="s.scraperId" class="hover">
                <td>
                  <a :href="s.url" target="_blank" rel="noopener" class="link link-primary">{{ s.name }}</a>
                </td>
                <td>{{ timeSince(s.lastRunAt) }}</td>
                <td class="font-medium text-success">{{ s.lastEventCount }}</td>
                <td>{{ formatDateOnly(s.lastEarliestDate) }} → {{ formatDateOnly(s.lastLatestDate) }}</td>
                <td>{{ s.lastNumPages }}</td>
                <td>
                  <button 
                    class="btn btn-xs btn-ghost"
                    :disabled="togglingIds.has(s.scraperId)"
                    @click="togglePause(s)"
                  >
                    <span v-if="togglingIds.has(s.scraperId)" class="loading loading-spinner loading-xs"></span>
                    <span v-else>Pause</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Paused Scrapers -->
      <div v-if="pausedScrapers.length" class="space-y-3">
        <h3 class="heading-card text-warning flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
          Paused Scrapers
        </h3>
        <div class="overflow-x-auto rounded-lg border border-warning/30">
          <table class="table table-sm w-full">
            <thead class="bg-warning/10">
              <tr>
                <th>Name</th>
                <th>Last Run</th>
                <th>Last Events</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in pausedScrapers" :key="s.scraperId" class="hover opacity-60">
                <td>
                  <a :href="s.url" target="_blank" rel="noopener" class="link">{{ s.name }}</a>
                </td>
                <td>{{ s.lastRunAt ? timeSince(s.lastRunAt) : 'Never' }}</td>
                <td>{{ s.lastEventCount }}</td>
                <td>
                  <button 
                    class="btn btn-xs btn-success"
                    :disabled="togglingIds.has(s.scraperId)"
                    @click="togglePause(s)"
                  >
                    <span v-if="togglingIds.has(s.scraperId)" class="loading loading-spinner loading-xs"></span>
                    <span v-else>Unpause</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Never Run Scrapers -->
      <div v-if="neverRunScrapers.length" class="space-y-3">
        <h3 class="heading-card flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          Never Run
        </h3>
        <div class="overflow-x-auto rounded-lg border border-base-300">
          <table class="table table-sm w-full">
            <thead class="bg-base-200">
              <tr>
                <th>Name</th>
                <th>URL</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in neverRunScrapers" :key="s.scraperId" class="hover">
                <td>{{ s.name }}</td>
                <td>
                  <a :href="s.url" target="_blank" rel="noopener" class="link link-primary text-xs truncate max-w-xs block">{{ s.url }}</a>
                </td>
                <td>
                  <button 
                    class="btn btn-xs btn-warning"
                    :disabled="togglingIds.has(s.scraperId)"
                    @click="togglePause(s)"
                  >
                    <span v-if="togglingIds.has(s.scraperId)" class="loading loading-spinner loading-xs"></span>
                    <span v-else>Pause</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

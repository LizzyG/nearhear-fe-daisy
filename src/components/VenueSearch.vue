<script setup lang="ts">
import { ref, computed, watch } from 'vue';

import type { Venue, SupportedCity } from '@/types/event';
import { apiFetch } from '@/utils/api';

// Props
const props = defineProps<{
  modelValue: Venue | null;
  city: SupportedCity | null;
}>();

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: Venue | null): void;
  (e: 'venueSelected', value: Venue): void;
}>();

// State
const venueName = ref('');
const selectedVenue = ref<Venue | null>(null);
const isSearching = ref(false);
const searchError = ref<string | null>(null);
const searchResults = ref<Venue[]>([]);
const showResults = ref(false);
const isExistingVenue = ref(false);

// Manual venue fields
const manualWebsite = ref('');
const manualInstagramHandle = ref('');
const manualAddress = ref('');

// Check if we can search
const canSearch = computed(() => {
  return venueName.value.trim().length > 0 && props.city !== null;
});

// Validation
const normalizeURL = (url: string): string => {
  if (!url) return '';
  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

const isValidURL = (url: string): boolean => {
  if (!url) return true;
  try {
    new URL(normalizeURL(url));
    return true;
  } catch {
    return false;
  }
};

const isValidInstagramHandle = (handle: string): boolean => {
  if (!handle) return true;
  // Instagram handles: 1-30 chars, alphanumeric, underscore, period
  return /^[a-zA-Z0-9_.]{1,30}$/.test(handle);
};

// Validation errors
const validationErrors = computed(() => ({
  venueName:
    !isExistingVenue.value && !selectedVenue.value?.Name?.trim() ? 'Venue name is required' : null,
  website: manualWebsite.value && !isValidURL(manualWebsite.value) ? 'Must be a valid URL' : null,
  instagram:
    manualInstagramHandle.value && !isValidInstagramHandle(manualInstagramHandle.value)
      ? 'Must be a valid Instagram handle (no @ symbol)'
      : null,
}));

const hasValidationErrors = computed(() => {
  return (
    !!validationErrors.value.venueName ||
    !!validationErrors.value.website ||
    !!validationErrors.value.instagram
  );
});

// Build final venue info
const getFinalVenueInfo = (): Venue | null => {
  if (!selectedVenue.value) return null;

  const website = manualWebsite.value
    ? normalizeURL(manualWebsite.value)
    : selectedVenue.value.Website;
  const instagramHandle = manualInstagramHandle.value || selectedVenue.value.InstagramHandle;
  const address = manualAddress.value || selectedVenue.value.Address;

  return {
    ...selectedVenue.value,
    Website: website,
    InstagramHandle: instagramHandle,
    Address: address,
  };
};

// Expose methods for parent
defineExpose({
  getFinalVenueInfo,
  hasValidationErrors,
  isExistingVenue,
});

// Search for venue
const searchVenue = async () => {
  if (!canSearch.value) return;

  isSearching.value = true;
  searchError.value = null;
  searchResults.value = [];
  showResults.value = false;

  try {
    const response = await apiFetch<Venue[]>('/media/lookupVenue', {
      method: 'POST',
      body: JSON.stringify({
        VenueName: venueName.value.trim(),
        City: props.city,
      }),
    });

    searchResults.value = response || [];
    showResults.value = true;

    // If exactly one result, auto-select it
    if (searchResults.value.length === 1) {
      selectVenue(searchResults.value[0]);
    }
  } catch (err) {
    console.error('Venue search error:', err);
    searchError.value = err instanceof Error ? err.message : 'Failed to search for venue';
  } finally {
    isSearching.value = false;
  }
};

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
const triggerSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  showResults.value = false;
  searchTimeout = setTimeout(() => {
    if (canSearch.value && !selectedVenue.value) {
      searchVenue();
    }
  }, 500);
};

// Select a venue from search results
const selectVenue = (venue: Venue) => {
  selectedVenue.value = venue;
  isExistingVenue.value = true;
  venueName.value = venue.Name;
  showResults.value = false; // Hide search results

  // Pre-populate manual fields if they exist
  if (venue.Website) manualWebsite.value = venue.Website;
  if (venue.InstagramHandle) manualInstagramHandle.value = venue.InstagramHandle;
  if (venue.Address) manualAddress.value = venue.Address;

  emit('venueSelected', venue);
  emit('update:modelValue', venue);
};

// Create manual venue
const createManualVenue = () => {
  const newVenue: Venue = {
    Name: venueName.value.trim() || '',
    Website: manualWebsite.value ? normalizeURL(manualWebsite.value) : undefined,
    InstagramHandle: manualInstagramHandle.value || undefined,
    Address: manualAddress.value || undefined,
    City: props.city || undefined,
  };

  selectedVenue.value = newVenue;
  isExistingVenue.value = false;

  emit('venueSelected', newVenue);
  emit('update:modelValue', newVenue);
};

// Clear selection
const clearSelection = () => {
  selectedVenue.value = null;
  isExistingVenue.value = false;
  venueName.value = '';
  searchResults.value = [];
  showResults.value = false;
  manualWebsite.value = '';
  manualInstagramHandle.value = '';
  manualAddress.value = '';
  emit('update:modelValue', null);
};

// Watch for input changes
watch(venueName, (newValue) => {
  // Only clear selection if user is manually editing (value differs from selected venue)
  if (selectedVenue.value && newValue !== selectedVenue.value.Name) {
    clearSelection();
  }
  triggerSearch();
});

// Watch for city changes - clear venue when city changes
watch(
  () => props.city,
  () => {
    if (selectedVenue.value) {
      clearSelection();
    }
  },
);

// Sync with v-model
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && newVal !== selectedVenue.value) {
      selectedVenue.value = newVal;
      venueName.value = newVal.Name;
    } else if (!newVal && selectedVenue.value) {
      clearSelection();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="space-y-4">
    <!-- Search Input - Always visible -->
    <div class="space-y-3">
      <div class="form-control relative">
        <input
          v-model="venueName"
          type="text"
          placeholder="Enter venue name..."
          class="input-primary"
          :class="{ 'pr-10': selectedVenue }"
          :disabled="!city"
        />
        <!-- Clear button when venue is selected -->
        <button
          v-if="selectedVenue"
          type="button"
          title="Clear selection"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-base-200"
          @click="clearSelection"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-4 w-4"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p v-if="!city" class="text-base-content/50 mt-1 text-xs">Please select a city first</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isSearching && !selectedVenue" class="flex items-center gap-2 py-2">
      <span class="loading loading-spinner loading-sm"></span>
      <span class="text-base-content/70 text-sm">Searching for venue...</span>
    </div>

    <!-- Search Error -->
    <div v-if="searchError && !selectedVenue" class="alert alert-error">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{{ searchError }}</span>
    </div>

    <!-- Search Results (multiple matches) -->
    <div
      v-if="showResults && searchResults.length > 1 && !selectedVenue"
      class="rounded-lg border border-base-300 bg-base-100"
    >
      <div class="border-b border-base-300 px-4 py-2">
        <span class="text-sm font-medium">Multiple venues found - select one:</span>
      </div>
      <div class="max-h-60 overflow-y-auto">
        <button
          v-for="(venue, index) in searchResults"
          :key="index"
          type="button"
          class="w-full border-b border-base-300 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-base-200"
          @click="selectVenue(venue)"
        >
          <div class="font-medium">{{ venue.Name }}</div>
          <div class="text-base-content/60 text-sm">
            {{ venue.Address || venue.Neighborhood || 'No address available' }}
          </div>
        </button>
      </div>
    </div>

    <!-- No Results -->
    <div
      v-if="
        showResults && searchResults.length === 0 && !isSearching && !selectedVenue && canSearch
      "
      class="border-warning/50 bg-warning/10 rounded-lg border p-4"
    >
      <p class="mb-3 text-sm">
        <strong>No venue found in our database.</strong>
      </p>
      <button type="button" class="btn-action-solid" @click="createManualVenue">
        Add "{{ venueName }}" as new venue
      </button>
    </div>

    <!-- Selected Venue Details - Show below input when venue is selected -->
    <div v-if="selectedVenue" class="text-base-content/70 text-sm">
      <p v-if="selectedVenue.Address" class="mb-1">
        {{ selectedVenue.Address }}
      </p>
      <div
        v-if="selectedVenue.Website || selectedVenue.InstagramHandle"
        class="flex flex-wrap gap-3"
      >
        <a
          v-if="selectedVenue.Website"
          :href="selectedVenue.Website"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:underline"
        >
          Website
        </a>
        <a
          v-if="selectedVenue.InstagramHandle"
          :href="`https://instagram.com/${selectedVenue.InstagramHandle}`"
          target="_blank"
          rel="noopener noreferrer"
          class="text-instagram hover:underline"
        >
          @{{ selectedVenue.InstagramHandle }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const searchQuery = ref('');
const searchType = ref<'artist' | 'venue' | 'event'>('artist');
const isSearching = ref(false);

const searchTypes = [
  { id: 'artist', label: 'Artist' },
  { id: 'venue', label: 'Venue' },
  { id: 'event', label: 'Event' },
] as const;

const handleSearch = () => {
  if (!searchQuery.value.trim()) return;
  isSearching.value = true;
  // TODO: Implement actual search
  setTimeout(() => {
    isSearching.value = false;
  }, 1000);
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="heading-section">Lookups</h2>
      <p class="text-base-content/60 mt-1 text-sm">
        Search and lookup artists, venues, or events in the database.
      </p>
    </div>

    <!-- Search Form -->
    <div class="flex flex-col gap-4 md:flex-row md:items-end">
      <div class="form-control flex-1">
        <label class="label" for="lookup-search">
          <span class="label-text font-medium">Search Query</span>
        </label>
        <input
          id="lookup-search"
          v-model="searchQuery"
          type="text"
          class="input-primary"
          placeholder="Enter search term..."
          @keyup.enter="handleSearch"
        />
      </div>

      <div class="form-control md:w-40">
        <label class="label" for="lookup-type">
          <span class="label-text font-medium">Type</span>
        </label>
        <select id="lookup-type" v-model="searchType" class="select-primary">
          <option v-for="type in searchTypes" :key="type.id" :value="type.id">
            {{ type.label }}
          </option>
        </select>
      </div>

      <button
        class="btn-action-solid md:w-32"
        :disabled="isSearching || !searchQuery.trim()"
        @click="handleSearch"
      >
        <span v-if="isSearching" class="loading loading-spinner loading-sm"></span>
        <span v-else>Search</span>
      </button>
    </div>

    <!-- Results Placeholder -->
    <div class="rounded-lg border border-base-300 bg-base-200 p-8 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="text-base-content/30 mx-auto h-12 w-12"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <p class="text-base-content/60 mt-3">Enter a search query to find {{ searchType }}s</p>
    </div>
  </div>
</template>

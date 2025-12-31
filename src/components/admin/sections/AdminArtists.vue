<script setup lang="ts">
import { ref } from 'vue';

const filterQuery = ref('');

// Placeholder data structure
const artists = ref<{ id: string; name: string; genres: string[]; eventCount: number }[]>([]);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="heading-section">Manage Artists</h2>
        <p class="text-base-content/60 mt-1 text-sm">View, edit, and manage artist profiles.</p>
      </div>

      <button class="btn-action-solid w-full md:w-auto">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="mr-2 h-4 w-4"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Artist
      </button>
    </div>

    <!-- Filter -->
    <div class="form-control max-w-md">
      <input
        v-model="filterQuery"
        type="text"
        class="input-primary"
        placeholder="Filter artists..."
      />
    </div>

    <!-- Artists Table/List -->
    <div class="overflow-x-auto rounded-lg border border-base-300">
      <table class="table w-full">
        <thead class="bg-base-200">
          <tr>
            <th class="text-base-content">Name</th>
            <th class="text-base-content">Genres</th>
            <th class="text-base-content">Events</th>
            <th class="text-base-content">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="artists.length === 0">
            <td colspan="4" class="text-base-content/60 py-8 text-center">
              No artists to display. Use the search to find artists or add a new one.
            </td>
          </tr>
          <tr v-for="artist in artists" :key="artist.id" class="hover:bg-base-200">
            <td>{{ artist.name }}</td>
            <td>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="genre in artist.genres"
                  :key="genre"
                  class="badge badge-outline badge-sm"
                >
                  {{ genre }}
                </span>
              </div>
            </td>
            <td>{{ artist.eventCount }}</td>
            <td>
              <div class="flex gap-2">
                <button class="btn btn-ghost btn-sm">Edit</button>
                <button class="btn btn-ghost btn-sm text-error">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const filterQuery = ref('');
const dateFilter = ref<'all' | 'upcoming' | 'past'>('upcoming');

// Placeholder data structure
const events = ref<{ id: string; name: string; date: string; venue: string; status: string }[]>([]);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="heading-section">Manage Events</h2>
        <p class="text-base-content/60 mt-1 text-sm">View, edit, and manage events.</p>
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
        Add Event
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col gap-4 md:flex-row md:items-end">
      <div class="form-control flex-1 md:max-w-md">
        <input
          v-model="filterQuery"
          type="text"
          class="input-primary"
          placeholder="Filter events..."
        />
      </div>

      <div class="flex gap-2">
        <button
          v-for="filter in ['all', 'upcoming', 'past']"
          :key="filter"
          :class="dateFilter === filter ? 'btn-toggle-active' : 'btn-toggle'"
          @click="dateFilter = filter as 'all' | 'upcoming' | 'past'"
        >
          {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
        </button>
      </div>
    </div>

    <!-- Events Table/List -->
    <div class="overflow-x-auto rounded-lg border border-base-300">
      <table class="table w-full">
        <thead class="bg-base-200">
          <tr>
            <th class="text-base-content">Event</th>
            <th class="text-base-content">Date</th>
            <th class="text-base-content">Venue</th>
            <th class="text-base-content">Status</th>
            <th class="text-base-content">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="events.length === 0">
            <td colspan="5" class="text-base-content/60 py-8 text-center">
              No events to display. Use the filters or add a new event.
            </td>
          </tr>
          <tr v-for="event in events" :key="event.id" class="hover:bg-base-200">
            <td>{{ event.name }}</td>
            <td>{{ event.date }}</td>
            <td>{{ event.venue }}</td>
            <td>
              <span
                :class="[
                  'badge badge-sm',
                  event.status === 'active' ? 'badge-success' : 'badge-warning',
                ]"
              >
                {{ event.status }}
              </span>
            </td>
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

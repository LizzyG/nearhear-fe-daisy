<script setup lang="ts">
import EventCard, { type NormalizedEvent } from '@/components/EventCard.vue';

defineProps<{
  events: NormalizedEvent[];
  showCalendarActions?: boolean;
  emptyMessage?: string;
}>();
</script>

<template>
  <div v-if="events.length > 0" class="overflow-hidden rounded-lg border border-base-300">
    <div
      v-for="(event, index) in events"
      :key="event.id"
      :class="[index % 2 === 0 ? 'bg-base-200' : 'bg-row-alt']"
    >
      <EventCard :event="event" :show-calendar-actions="showCalendarActions" />
    </div>
  </div>
  <div v-else class="py-8 text-center">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="text-base-content/30 mx-auto h-12 w-12"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
    <p class="text-base-content/70 mt-4">{{ emptyMessage || 'No events found.' }}</p>
  </div>
</template>

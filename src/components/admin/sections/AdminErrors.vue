<script setup lang="ts">
import { ref } from 'vue';

const severityFilter = ref<'all' | 'error' | 'warning' | 'info'>('all');

// Placeholder data structure
const errors = ref<
  { id: string; message: string; timestamp: string; severity: string; source: string }[]
>([]);

const clearErrors = () => {
  // TODO: Implement error clearing
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="heading-section">Error Logs</h2>
        <p class="text-base-content/60 mt-1 text-sm">
          View and manage application errors and warnings.
        </p>
      </div>

      <button class="btn-action-outline-error w-full md:w-auto" @click="clearErrors">
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
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
        Clear All
      </button>
    </div>

    <!-- Severity Filter -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="severity in ['all', 'error', 'warning', 'info']"
        :key="severity"
        :class="severityFilter === severity ? 'btn-toggle-active' : 'btn-toggle'"
        @click="severityFilter = severity as 'all' | 'error' | 'warning' | 'info'"
      >
        {{ severity.charAt(0).toUpperCase() + severity.slice(1) }}
      </button>
    </div>

    <!-- Errors List -->
    <div class="space-y-3">
      <div
        v-if="errors.length === 0"
        class="rounded-lg border border-base-300 bg-base-200 p-8 text-center"
      >
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
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-base-content/60 mt-3">
          No errors to display. Everything is running smoothly!
        </p>
      </div>

      <div
        v-for="error in errors"
        :key="error.id"
        :class="[
          'rounded-lg border p-4',
          error.severity === 'error'
            ? 'border-error/30 bg-error/5'
            : error.severity === 'warning'
              ? 'border-warning/30 bg-warning/5'
              : 'border-info/30 bg-info/5',
        ]"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span
                :class="[
                  'badge badge-sm',
                  error.severity === 'error'
                    ? 'badge-error'
                    : error.severity === 'warning'
                      ? 'badge-warning'
                      : 'badge-info',
                ]"
              >
                {{ error.severity }}
              </span>
              <span class="text-base-content/60 text-sm">{{ error.source }}</span>
            </div>
            <p class="mt-2 font-mono text-sm">{{ error.message }}</p>
            <p class="text-base-content/50 mt-1 text-xs">{{ error.timestamp }}</p>
          </div>
          <button class="btn btn-ghost btn-sm">Dismiss</button>
        </div>
      </div>
    </div>
  </div>
</template>

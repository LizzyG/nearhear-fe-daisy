<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

import { apiFetch } from '@/utils/api';
import { usePostHog } from '@/composables/usePostHog';

const STORAGE_KEY_DISMISSED = 'nearhear-mailing-dismissed';
const STORAGE_KEY_SUBSCRIBED = 'nearhear-mailing-subscribed';
const STORAGE_KEY_VISIT_COUNT = 'nearhear-visit-count';

// Config
const INITIAL_DELAY_MS = 15000; // 15 seconds before first popup
const DAYS_UNTIL_REMIND = 7; // Days before showing again after dismiss
const VISITS_UNTIL_REMIND = 5; // Or show after X visits if dismissed

const isOpen = ref(false);
const email = ref('');
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);
const submitSuccess = ref(false);

const posthog = usePostHog();

let timeoutId: ReturnType<typeof setTimeout> | null = null;

// Check if we should show the modal
const shouldShowModal = (): boolean => {
  // Never show if already subscribed
  if (localStorage.getItem(STORAGE_KEY_SUBSCRIBED) === 'true') {
    return false;
  }

  const dismissedAt = localStorage.getItem(STORAGE_KEY_DISMISSED);
  const visitCount = parseInt(localStorage.getItem(STORAGE_KEY_VISIT_COUNT) || '0', 10);

  // First time visitor - show after delay
  if (!dismissedAt) {
    return true;
  }

  // Check if enough time has passed since dismissal
  const dismissedTime = parseInt(dismissedAt, 10);
  const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

  if (daysSinceDismissed >= DAYS_UNTIL_REMIND) {
    return true;
  }

  // Check if they've visited enough times since dismissing
  if (visitCount >= VISITS_UNTIL_REMIND) {
    return true;
  }

  return false;
};

// Increment visit count
const incrementVisitCount = () => {
  const current = parseInt(localStorage.getItem(STORAGE_KEY_VISIT_COUNT) || '0', 10);
  localStorage.setItem(STORAGE_KEY_VISIT_COUNT, String(current + 1));
};

// Email validation
const isValidEmail = (value: string): boolean => {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const canSubmit = (): boolean => {
  return isValidEmail(email.value) && !isSubmitting.value;
};

const subscribe = async () => {
  if (!canSubmit()) return;

  isSubmitting.value = true;
  submitError.value = null;

  try {
    const params = new URLSearchParams({
      email: email.value,
      source: 'modal',
    });

    await apiFetch(`/media/mailingList/subscribe?${params.toString()}`);

    submitSuccess.value = true;
    localStorage.setItem(STORAGE_KEY_SUBSCRIBED, 'true');
    localStorage.removeItem(STORAGE_KEY_VISIT_COUNT);

    // track event
    posthog.capture('mailing_list_subscribed', { source: 'modal' });

    // Auto-close after success
    setTimeout(() => {
      closeModal();
    }, 2000);
  } catch (err) {
    console.error('Failed to subscribe:', err);
    submitError.value = err instanceof Error ? err.message : 'Failed to subscribe';
  } finally {
    isSubmitting.value = false;
  }
};

const closeModal = () => {
  isOpen.value = false;
  // Reset state for next time
  email.value = '';
  submitError.value = null;
  submitSuccess.value = false;
};

const dismissModal = () => {
  localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now()));
  localStorage.setItem(STORAGE_KEY_VISIT_COUNT, '0'); // Reset visit count on dismiss

  // track dismissal
  posthog.capture('mailing_modal_dismissed', { source: 'modal' });

  closeModal();
};

onMounted(() => {
  incrementVisitCount();

  if (shouldShowModal()) {
    timeoutId = setTimeout(() => {
      isOpen.value = true;
    }, INITIAL_DELAY_MS);
  }
});

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      @click.self="dismissModal"
    >
      <div
        class="relative w-full max-w-md animate-[fadeIn_0.2s_ease-out] rounded-2xl bg-base-100 p-6 shadow-2xl"
      >
        <!-- Close button -->
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-circle absolute right-3 top-3"
          aria-label="Close"
          @click="dismissModal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Success State -->
        <div v-if="submitSuccess" class="py-4 text-center">
          <div
            class="bg-success/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="h-8 w-8 text-success"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold">You're on the list!</h3>
          <p class="text-base-content/70 mt-2">Thanks for subscribing!</p>
        </div>

        <!-- Subscribe Form -->
        <div v-else class="text-center">
          <!-- Icon -->
          <div
            class="bg-primary/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-7 w-7 text-primary"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
              />
            </svg>
          </div>

          <h3 class="text-xl font-semibold">Stay in the loop</h3>
          <p class="text-base-content/70 mt-2">
            Get weekly updates on upcoming shows in your area. No spam, just music.
          </p>

          <form class="mt-6 space-y-3" @submit.prevent="subscribe">
            <input
              v-model="email"
              type="email"
              placeholder="Enter your email"
              class="input-primary w-full text-center"
              autocomplete="email"
            />

            <p class="text-base-content/60 text-sm">
              <strong>Note:</strong> Right now we're only doing weekly emails for Portland.
            </p>

            <!-- Error -->
            <p v-if="submitError" class="text-sm text-error">{{ submitError }}</p>

            <button type="submit" class="btn-action-solid w-full" :disabled="!canSubmit()">
              <span v-if="isSubmitting" class="loading loading-spinner loading-sm"></span>
              <span v-else>Subscribe</span>
            </button>
          </form>

          <button
            type="button"
            class="btn-action-outline mt-4 w-full"
            aria-label="Dismiss mailing list modal"
            @click="dismissModal"
          >
            No thanks, maybe later
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>

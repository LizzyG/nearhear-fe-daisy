<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

import PageHeader from '@/components/layout/PageHeader.vue';
import { apiFetch } from '@/utils/api';
import { useCity } from '@/composables/useCity';
import { usePostHog } from '@/composables/usePostHog';

const email = ref('');
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);
const submitSuccess = ref(false);

// Cities
const { supportedCities, fetchSupportedCities, makeCityKey } = useCity();
const selectedCityKeys = ref<string[]>([]);
const posthog = usePostHog();
const STORAGE_KEY_SUBSCRIBED = 'nearhear-mailing-subscribed';

const ensureDefaultCities = () => {
  if (selectedCityKeys.value.length > 0) return;
  const portland = supportedCities.value.find((c) => c.City.toLowerCase() === 'portland');
  if (portland) {
    selectedCityKeys.value = [makeCityKey(portland)];
  } else if (supportedCities.value.length > 0) {
    const first = supportedCities.value[0];
    if (first) {
      selectedCityKeys.value = [makeCityKey(first)];
    }
  }
};

onMounted(async () => {
  await fetchSupportedCities();
  ensureDefaultCities();
});

// Email validation
const isValidEmail = (value: string): boolean => {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const canSubmit = computed(() => {
  return isValidEmail(email.value) && !isSubmitting.value;
});

const subscribe = async () => {
  if (!canSubmit.value) return;

  isSubmitting.value = true;
  submitError.value = null;
  submitSuccess.value = false;

  try {
    // ensure cities
    ensureDefaultCities();

    const params = new URLSearchParams({
      email: email.value,
      source: 'page',
    });

    if (selectedCityKeys.value.length > 0) {
      params.set('cities', selectedCityKeys.value.join(','));
    }

    await apiFetch(`/media/mailingList/subscribe?${params.toString()}`);

    submitSuccess.value = true;
    email.value = '';

    // mark as subscribed so modal doesn't show later
    localStorage.setItem(STORAGE_KEY_SUBSCRIBED, 'true');

    posthog.capture('mailing_list_subscribed', { source: 'page', cities: selectedCityKeys.value });
  } catch (err) {
    console.error('Failed to subscribe:', err);
    submitError.value = err instanceof Error ? err.message : 'Failed to subscribe';
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  submitSuccess.value = false;
  submitError.value = null;
  email.value = '';
};
</script>

<template>
  <section>
    <PageHeader title="Mailing List" />

    <div class="mx-auto mt-8 max-w-lg text-center">
      <!-- Success State -->
      <div v-if="submitSuccess" class="space-y-6">
        <div class="flex justify-center">
          <div class="bg-success/20 flex h-16 w-16 items-center justify-center rounded-full">
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
        </div>
        <div>
          <h2 class="text-xl font-semibold">You're on the list!</h2>
          <p class="text-base-content/70 mt-2">
            Thanks for subscribing. We'll keep you updated on the latest shows and features.
          </p>
        </div>
        <button type="button" class="btn-action-outline" @click="resetForm">
          Subscribe another email
        </button>
      </div>

      <!-- Subscribe Form -->
      <div v-else class="space-y-6">
        <p class="text-base-content/70 text-lg">
          Get weekly updates on upcoming shows in your area. No spam, just music.
        </p>

        <form class="space-y-4" @submit.prevent="subscribe">
          <div class="form-control">
            <input
              v-model="email"
              type="email"
              placeholder="Enter your email address"
              class="input-primary text-center"
              autocomplete="email"
            />
          </div>

          <!-- City selection -->
          <div v-if="supportedCities.length" class="text-left">
            <p class="text-base-content/60 mb-2 text-sm">
              Select the cities you want weekly updates for.
            </p>
            <p class="app-city-note">
              <strong>Note:</strong> right now we're only doing weekly emails for Portland.
            </p>

            <div class="mb-2 mt-3 grid max-h-36 grid-cols-2 gap-2 overflow-auto">
              <label
                v-for="city in supportedCities"
                :key="city.City + city.StateAbbrev"
                class="checkbox-app-label"
              >
                <input
                  v-model="selectedCityKeys"
                  type="checkbox"
                  :value="makeCityKey(city)"
                  class="checkbox-app"
                />
                <span class="text-sm">{{ city.City }}, {{ city.StateAbbrev }}</span>
              </label>
            </div>
            <p v-if="!selectedCityKeys.length" class="text-base-content/50 mt-1 text-sm">
              We'll default to Portland if you don't pick any.
            </p>
          </div>

          <!-- Error Message -->
          <div v-if="submitError" class="alert alert-error">
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
            <span>{{ submitError }}</span>
          </div>

          <button type="submit" class="btn-action-solid w-full" :disabled="!canSubmit">
            <span v-if="isSubmitting" class="loading loading-spinner loading-sm"></span>
            <span v-else>Subscribe</span>
          </button>
        </form>

        <p class="text-base-content/50 text-sm">We respect your privacy. Unsubscribe anytime.</p>
      </div>
    </div>
  </section>
</template>

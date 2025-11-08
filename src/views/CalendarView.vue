<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import PageHeader from '../components/layout/PageHeader.vue';
interface SupportedCity {
  City: string;
  State: string;
  StateAbbrev: string;
  CountryAbbrev: string;
  TzName: string;
}

const supportedCities = ref<SupportedCity[]>([]);
const selectedCityKey = ref<string | null>(null);
const isLoadingCities = ref(false);
const cityLoadError = ref<string | null>(null);

const cityEndpoint = 'https://nearhear.app/media/getSupportedCities';

const makeCityKey = (city: SupportedCity) => `${city.City}-${city.StateAbbrev}`;

const fetchSupportedCities = async () => {
  isLoadingCities.value = true;
  cityLoadError.value = null;

  try {
    const response = await fetch(cityEndpoint, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to load cities (status ${response.status})`);
    }

    const payload = (await response.json()) as SupportedCity[];

    supportedCities.value = payload;

    if (!payload.length) {
      selectedCityKey.value = null;
      return;
    }

    const hasPreviousSelection = selectedCityKey.value
      ? payload.some((city) => makeCityKey(city) === selectedCityKey.value)
      : false;

    if (!hasPreviousSelection) {
      const [firstCity] = payload;
      selectedCityKey.value = payload.length === 1 && firstCity ? makeCityKey(firstCity) : null;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Something went wrong while loading cities.';
    cityLoadError.value = message;
    supportedCities.value = [];
  } finally {
    isLoadingCities.value = false;
  }
};

onMounted(fetchSupportedCities);

const selectedCity = computed(() =>
  supportedCities.value.find((city) => makeCityKey(city) === selectedCityKey.value) ?? null,
);

const handleCityFilterReset = (event: Event) => {
  const form = event.target;

  if (form instanceof HTMLFormElement) {
    form.reset();
  }

  selectedCityKey.value = null;
};

const isCitySelected = (city: SupportedCity) => makeCityKey(city) === selectedCityKey.value;
const cityLabelClasses = (city: SupportedCity) =>
  isCitySelected(city)
    ? 'btn-active bg-brand-primary text-primary-content border border-primary shadow-md shadow-primary/25 hover:bg-primary hover:border-primary '
    : 'btn-outline border-neutral/40 text-neutral bg-base-100 hover:border-primary/40 hover:text-primary hover:bg-base-200';
</script>

<template>
  <section>
    <PageHeader title="Calendar" />

    <div class="mt-6">
      <p v-if="isLoadingCities" class="text-sm text-base-content/70">Loading supported cities…</p>
      <p v-else-if="cityLoadError" class="text-sm text-error">{{ cityLoadError }}</p>
      <form
        v-else-if="supportedCities.length"
        class="filter flex flex-wrap items-center gap-2"
        @reset.prevent="handleCityFilterReset"
      >
        <button
          v-if="selectedCityKey"
          class="btn btn-sm"
          type="reset"
          aria-label="Clear selected city"
        >
          ×
        </button>
        <label
          v-for="city in supportedCities"
          :key="makeCityKey(city)"
          class="btn btn-sm gap-2"
          :class="cityLabelClasses(city)"
          :aria-pressed="isCitySelected(city)"
        >
          <input
            class="sr-only"
            type="radio"
            name="supported-city"
            :value="makeCityKey(city)"
            :aria-label="city.City"
            v-model="selectedCityKey"
          />
          <span class="font-semibold">{{ city.City }}</span>
        </label>
      </form>
      <p v-else class="text-sm text-base-content/70">No supported cities available yet.</p>
    </div>

    <div class="mt-4 text-sm text-base-content/70">
      <template v-if="selectedCity">
        Showing events for
        <span class="font-semibold">{{ selectedCity.City }}, {{ selectedCity.State }}</span>
      </template>
      <template v-else>Select a city to see events.</template>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

import ArtistSearch from '@/components/ArtistSearch.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { useAuth } from '@/composables/useAuth';
import type { ArtistInfo } from '@/types/artist';
import type { SupportedCity, AgeRange, AddEventRequest, EventArtistInput } from '@/types/event';
import { apiFetch } from '@/utils/api';

const { userId } = useAuth();

// Form state
const eventDate = ref('');
const eventTime = ref('');
const selectedCity = ref<SupportedCity | null>(null);
const venueName = ref('');
const eventUrl = ref('');
const imageUrl = ref('');
const ageRange = ref<AgeRange>(0);
const isFree = ref(false);
const priceLow = ref<number | null>(null);
const priceHigh = ref<number | null>(null);

// Artists state - support multiple
const artists = ref<ArtistInfo[]>([]);
const currentArtistRef = ref<InstanceType<typeof ArtistSearch>>();
const showArtistSearch = ref(false);

// City dropdown state
const supportedCities = ref<SupportedCity[]>([]);
const isLoadingCities = ref(false);
const cityLoadError = ref<string | null>(null);

// Form submission state
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);
const submitSuccess = ref(false);

// Age range options
const ageRangeOptions = [
  { value: 0, label: 'All Ages' },
  { value: 1, label: '18+' },
  { value: 2, label: '21+' },
];

// Validation
const isValidUrl = (url: string): boolean => {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const validationErrors = computed(() => ({
  date: !eventDate.value ? 'Date is required' : null,
  time: !eventTime.value ? 'Time is required' : null,
  city: !selectedCity.value ? 'City is required' : null,
  venue: !venueName.value.trim() ? 'Venue is required' : null,
  eventUrl: !eventUrl.value.trim()
    ? 'Event link is required'
    : !isValidUrl(eventUrl.value)
      ? 'Must be a valid URL'
      : null,
  artists: artists.value.length === 0 ? 'At least one artist is required' : null,
  imageUrl: imageUrl.value && !isValidUrl(imageUrl.value) ? 'Must be a valid URL' : null,
  price:
    !isFree.value &&
    priceLow.value !== null &&
    priceHigh.value !== null &&
    priceLow.value > priceHigh.value
      ? 'Low price cannot exceed high price'
      : null,
}));

const hasValidationErrors = computed(() => {
  return Object.values(validationErrors.value).some((error) => error !== null);
});

const canSubmit = computed(() => {
  return !hasValidationErrors.value && !isSubmitting.value;
});

// Load supported cities
const loadCities = async () => {
  isLoadingCities.value = true;
  cityLoadError.value = null;

  try {
    const cities = await apiFetch<SupportedCity[]>('/media/getSupportedCities');
    supportedCities.value = cities || [];
  } catch (err) {
    console.error('Failed to load cities:', err);
    cityLoadError.value = err instanceof Error ? err.message : 'Failed to load cities';
  } finally {
    isLoadingCities.value = false;
  }
};

onMounted(() => {
  void loadCities();
});

// City selection
const handleCityChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const cityKey = target.value;
  selectedCity.value =
    supportedCities.value.find((c) => `${c.City}-${c.StateAbbrev}` === cityKey) || null;
};

// Artist management
const handleArtistSelected = (artist: ArtistInfo) => {
  // Check if artist already added
  const exists = artists.value.some(
    (a) =>
      a.ArtistName.toLowerCase() === artist.ArtistName.toLowerCase() ||
      (a.SpotifyArtistId && a.SpotifyArtistId === artist.SpotifyArtistId),
  );

  if (!exists) {
    artists.value.push(artist);
  }
  showArtistSearch.value = false;
};

const removeArtist = (index: number) => {
  artists.value.splice(index, 1);
};

// Extract Instagram handle from URL if needed
const extractInstagramHandle = (artist: ArtistInfo): string => {
  if (artist.InstagramHandle) return artist.InstagramHandle;
  if (artist.InstagramURL) {
    const match = artist.InstagramURL.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
    return match ? match[1] : '';
  }
  return '';
};

// Form submission
const submitEvent = async () => {
  if (!canSubmit.value || !selectedCity.value) return;

  isSubmitting.value = true;
  submitError.value = null;
  submitSuccess.value = false;

  try {
    // Combine date and time into ISO string
    const dateTimeString = `${eventDate.value}T${eventTime.value}:00`;
    const dateTime = new Date(dateTimeString);

    // Build artist input array
    const artistInputs: EventArtistInput[] = artists.value.map((artist) => ({
      ArtistName: artist.ArtistName,
      SpotifyArtistId: artist.SpotifyArtistId || undefined,
      BandcampUrl: artist.BandcampURL || undefined,
      InstagramHandle: extractInstagramHandle(artist) || undefined,
    }));

    const requestBody: AddEventRequest = {
      UserId: userId.value || '',
      Date: dateTime.toISOString(),
      City: selectedCity.value.City,
      State: selectedCity.value.StateAbbrev,
      VenueName: venueName.value.trim(),
      EventUrl: eventUrl.value.trim(),
      Artists: artistInputs,
      ImageUrl: imageUrl.value.trim() || undefined,
      AgeRange: ageRange.value,
      IsFree: isFree.value,
      PriceLow: isFree.value ? undefined : (priceLow.value ?? undefined),
      PriceHigh: isFree.value ? undefined : (priceHigh.value ?? undefined),
    };

    await apiFetch('/media/addEventFromUser', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    submitSuccess.value = true;
  } catch (err) {
    console.error('Failed to submit event:', err);
    submitError.value = err instanceof Error ? err.message : 'Failed to add event';
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  eventDate.value = '';
  eventTime.value = '';
  selectedCity.value = null;
  venueName.value = '';
  eventUrl.value = '';
  imageUrl.value = '';
  ageRange.value = 0;
  isFree.value = false;
  priceLow.value = null;
  priceHigh.value = null;
  artists.value = [];
  submitSuccess.value = false;
  submitError.value = null;
};
</script>

<template>
  <section>
    <PageHeader title="Add Event" />

    <div class="mx-auto mt-8 max-w-xl">
      <p class="text-base-content/70 mb-6">
        Help us grow our database by adding events you know about. Fill in the event details below.
      </p>

      <!-- Success Message -->
      <div v-if="submitSuccess" class="mb-6">
        <div class="alert alert-success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 class="font-bold">Event Submitted!</h3>
            <p class="text-sm">
              Thank you for contributing. The event will be reviewed and added to our database.
            </p>
          </div>
        </div>
        <button type="button" class="btn-action-solid mt-4" @click="resetForm">
          Add Another Event
        </button>
      </div>

      <!-- Event Form -->
      <form v-else class="space-y-6" @submit.prevent="submitEvent">
        <!-- Date & Time Row -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Date -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium"> Date <span class="text-error">*</span> </span>
            </label>
            <input
              v-model="eventDate"
              type="date"
              :class="['input-primary', validationErrors.date && eventDate === '' && 'input-error']"
            />
          </div>

          <!-- Time -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium"> Time <span class="text-error">*</span> </span>
            </label>
            <input
              v-model="eventTime"
              type="time"
              :class="['input-primary', validationErrors.time && eventTime === '' && 'input-error']"
            />
          </div>
        </div>

        <!-- City -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium"> City <span class="text-error">*</span> </span>
          </label>
          <select
            :value="selectedCity ? `${selectedCity.City}-${selectedCity.StateAbbrev}` : ''"
            :class="['select-primary', !selectedCity && 'text-base-content/50']"
            :disabled="isLoadingCities"
            @change="handleCityChange"
          >
            <option value="" disabled>
              {{ isLoadingCities ? 'Loading cities...' : 'Select a city' }}
            </option>
            <option
              v-for="city in supportedCities"
              :key="`${city.City}-${city.StateAbbrev}`"
              :value="`${city.City}-${city.StateAbbrev}`"
            >
              {{ city.City }}, {{ city.StateAbbrev }}
            </option>
          </select>
          <p v-if="cityLoadError" class="mt-1 text-xs text-error">{{ cityLoadError }}</p>
        </div>

        <!-- Venue -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium"> Venue <span class="text-error">*</span> </span>
          </label>
          <input
            v-model="venueName"
            type="text"
            placeholder="Enter venue name..."
            :class="['input-primary', validationErrors.venue && !venueName.trim() && 'input-error']"
          />
        </div>

        <!-- Event Link -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">
              Event Link <span class="text-error">*</span>
            </span>
          </label>
          <input
            v-model="eventUrl"
            type="url"
            placeholder="https://..."
            :class="['input-primary', validationErrors.eventUrl && 'input-error']"
          />
          <p v-if="validationErrors.eventUrl && eventUrl" class="mt-1 text-xs text-error">
            {{ validationErrors.eventUrl }}
          </p>
        </div>

        <!-- Artists Section -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium"> Artists <span class="text-error">*</span> </span>
            <span class="label-text-alt text-base-content/60"> {{ artists.length }} added </span>
          </label>

          <!-- Added Artists List -->
          <div v-if="artists.length > 0" class="mb-3 space-y-2">
            <div
              v-for="(artist, index) in artists"
              :key="artist.SpotifyArtistId || artist.ArtistName"
              class="flex items-center justify-between rounded-lg border border-base-300 bg-base-100 px-3 py-2"
            >
              <div class="flex items-center gap-2">
                <div v-if="artist.ImageUrl" class="avatar">
                  <div class="h-8 w-8 rounded-full">
                    <img :src="artist.ImageUrl" :alt="artist.ArtistName" />
                  </div>
                </div>
                <div
                  v-else
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-base-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="h-4 w-4"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
                <span class="font-medium">{{ artist.ArtistName }}</span>
              </div>
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-circle text-error"
                title="Remove artist"
                @click="removeArtist(index)"
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
            </div>
          </div>

          <!-- Add Artist Button / Search -->
          <div v-if="!showArtistSearch">
            <button
              type="button"
              class="btn-action-outline flex items-center gap-2"
              @click="showArtistSearch = true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-4 w-4"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Artist
            </button>
          </div>

          <!-- Artist Search Component -->
          <div v-else class="rounded-lg border border-base-300 bg-base-100 p-4">
            <div class="mb-3 flex items-center justify-between">
              <span class="text-sm font-medium">Search for an artist</span>
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-circle"
                @click="showArtistSearch = false"
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
            </div>
            <ArtistSearch ref="currentArtistRef" @artist-selected="handleArtistSelected" />
          </div>
        </div>

        <!-- Divider -->
        <div class="text-base-content/50 divider text-sm">Optional Details</div>

        <!-- Image URL -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Image URL</span>
            <span class="label-text-alt text-base-content/60">optional</span>
          </label>
          <input
            v-model="imageUrl"
            type="url"
            placeholder="https://..."
            :class="['input-primary', validationErrors.imageUrl && 'input-error']"
          />
          <p v-if="validationErrors.imageUrl" class="mt-1 text-xs text-error">
            {{ validationErrors.imageUrl }}
          </p>
        </div>

        <!-- Age Range -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Age Restriction</span>
            <span class="label-text-alt text-base-content/60">optional</span>
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in ageRangeOptions"
              :key="option.value"
              type="button"
              :class="ageRange === option.value ? 'btn-toggle-active' : 'btn-toggle'"
              @click="ageRange = option.value as AgeRange"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <!-- Price Section -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Pricing</span>
            <span class="label-text-alt text-base-content/60">optional</span>
          </label>

          <!-- Free Toggle -->
          <label class="flex cursor-pointer items-center gap-3">
            <input v-model="isFree" type="checkbox" class="checkbox checkbox-primary" />
            <span class="text-sm">This is a free event</span>
          </label>

          <!-- Price Range (hidden if free) -->
          <div v-if="!isFree" class="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label class="label py-1">
                <span class="label-text text-sm">Price Low ($)</span>
              </label>
              <input
                v-model.number="priceLow"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="input-primary"
              />
            </div>
            <div>
              <label class="label py-1">
                <span class="label-text text-sm">Price High ($)</span>
              </label>
              <input
                v-model.number="priceHigh"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="input-primary"
              />
            </div>
          </div>
          <p v-if="validationErrors.price" class="mt-1 text-xs text-error">
            {{ validationErrors.price }}
          </p>
        </div>

        <!-- Submit Error -->
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

        <!-- Submit Button -->
        <div class="flex justify-end pt-4">
          <button type="submit" class="btn-action-solid" :disabled="!canSubmit">
            <span v-if="isSubmitting" class="loading loading-spinner loading-sm"></span>
            <span v-else>Submit Event</span>
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

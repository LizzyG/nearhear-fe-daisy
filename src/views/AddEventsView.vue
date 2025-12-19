<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

import ArtistSearch from '@/components/ArtistSearch.vue';
import VenueSearch from '@/components/VenueSearch.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import type { ArtistInfo } from '@/types/artist';
import type { SupportedCity, AgeRange, FullShow, ShowArtistInfo, Venue } from '@/types/event';
import { apiFetch } from '@/utils/api';

// Minimum date (today) for the date picker
const todayDate = computed(() => {
  const today = new Date();
  return today.toISOString().split('T')[0];
});

// Calendar modal state
const isCalendarOpen = ref(false);

const openCalendar = () => {
  isCalendarOpen.value = true;
};

const closeCalendar = () => {
  isCalendarOpen.value = false;
};

// Form state
const eventDate = ref('');
const eventTime = ref('');

// Format date for display
const formattedDate = computed(() => {
  if (!eventDate.value) return '';
  try {
    const [year, month, day] = eventDate.value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  } catch {
    return eventDate.value;
  }
});

// Handle calendar date selection
type CalendarDateElement = HTMLElement & { value?: string };

const handleDateChange = (event: Event) => {
  const target = event.currentTarget as CalendarDateElement | null;
  if (!target?.value) return;

  // Validate it's not in the past
  if (target.value < todayDate.value) {
    return;
  }

  eventDate.value = target.value;
  closeCalendar();
};
const selectedCity = ref<SupportedCity | null>(null);
const eventUrl = ref('');
const imageUrl = ref('');
const ageRange = ref<AgeRange>(3);
const isFree = ref(false);
const priceLow = ref<number | null>(null);
const priceHigh = ref<number | null>(null);

// Venue state
const venueSearchRef = ref<InstanceType<typeof VenueSearch>>();
const selectedVenue = ref<Venue | null>(null);

// Artists state - support multiple
const artists = ref<ArtistInfo[]>([]);
const currentArtistRef = ref<InstanceType<typeof ArtistSearch>>();
const currentArtist = ref<ArtistInfo | null>(null);
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
  { value: 3, label: 'Unknown' },
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
  venue: !selectedVenue.value ? 'Venue is required' : null,
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
  // For manual artists (no ArtistId and no SpotifyArtistId), don't auto-add yet
  // Let the user fill in details first
  const isManualArtist = !artist.ArtistId && !artist.SpotifyArtistId;

  if (isManualArtist) {
    // Just update currentArtist, keep the form visible
    // User will click a button to add the artist when ready
    return;
  }

  // For existing artists from database/Spotify, add immediately
  const exists = artists.value.some(
    (a) =>
      a.ArtistName.toLowerCase() === artist.ArtistName.toLowerCase() ||
      (a.SpotifyArtistId && a.SpotifyArtistId === artist.SpotifyArtistId),
  );

  if (!exists) {
    artists.value.push(artist);
  }

  // Clear the current artist and hide search
  currentArtist.value = null;
  showArtistSearch.value = false;
};

const removeArtist = (index: number) => {
  artists.value.splice(index, 1);
};

// Check if we should show the "Add to Event" button
const showAddToEventButton = computed(() => {
  if (!currentArtist.value) return false;
  if (!currentArtistRef.value) return false;

  // Only show for manual artists (no ID from database/Spotify)
  const isManualArtist = !currentArtist.value.ArtistId && !currentArtist.value.SpotifyArtistId;
  if (!isManualArtist) return false;

  // Check if validation passes
  const hasErrors = currentArtistRef.value.hasValidationErrors;
  return !hasErrors;
});

// Add current artist to the event (for manual artists)
const addCurrentArtist = () => {
  if (!currentArtist.value) return;

  // Get the final artist info from the search component
  const artistData = currentArtistRef.value?.getFinalArtistInfo();
  if (!artistData) return;

  // Check if artist already added
  const exists = artists.value.some(
    (a) =>
      a.ArtistName.toLowerCase() === artistData.ArtistName.toLowerCase() ||
      (a.SpotifyArtistId && a.SpotifyArtistId === artistData.SpotifyArtistId),
  );

  if (!exists) {
    artists.value.push(artistData);
  }

  // Clear the current artist and hide search
  currentArtist.value = null;
  showArtistSearch.value = false;
};

// Close artist search and clear state
const closeArtistSearch = () => {
  currentArtist.value = null;
  showArtistSearch.value = false;
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

// Extract Bandcamp slug from URL if needed
const extractBandcampSlug = (artist: ArtistInfo): string => {
  if (artist.BandcampArtistSlug) return artist.BandcampArtistSlug;
  if (artist.BandcampURL) {
    const match = artist.BandcampURL.match(/https?:\/\/([a-zA-Z0-9-]+)\.bandcamp\.com/i);
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

    // Get venue data from VenueSearch component
    const venueData = venueSearchRef.value?.getFinalVenueInfo();
    if (!venueData) {
      throw new Error('Venue information is required');
    }

    // Build artist array in ShowArtistInfo format
    const showArtists: ShowArtistInfo[] = artists.value.map((artist) => ({
      ArtistName: artist.ArtistName,
      SpotifyArtistId: artist.SpotifyArtistId || undefined,
      InstagramHandle: extractInstagramHandle(artist) || undefined,
      BandcampArtistSlug: extractBandcampSlug(artist) || undefined,
      BandcampURL: artist.BandcampURL || undefined,
      Genres: artist.Genres || undefined,
    }));

    // Build FullShow object
    const fullShow: FullShow = {
      Date: dateTime.toISOString(),
      PriceLow: isFree.value ? 0 : (priceLow.value ?? 0),
      PriceHigh: isFree.value ? 0 : (priceHigh.value ?? 0),
      AgeRange: ageRange.value,
      Venue: venueData,
      Urls: [eventUrl.value.trim()],
      ImgUrl: imageUrl.value.trim() || '',
      Artists: showArtists,
      Status: 'pending',
    };

    await apiFetch('/media/upsertUserEvent', {
      method: 'POST',
      body: JSON.stringify(fullShow),
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
  selectedVenue.value = null;
  eventUrl.value = '';
  imageUrl.value = '';
  ageRange.value = 3;
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
            <div class="relative">
              <input
                type="text"
                readonly
                class="input-primary cursor-pointer pr-10"
                :class="[validationErrors.date && eventDate === '' && 'input-error']"
                :value="formattedDate"
                placeholder="Select date"
                @click="openCalendar"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="text-base-content/50 pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </div>
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
          <VenueSearch
            ref="venueSearchRef"
            v-model="selectedVenue"
            :city="selectedCity"
          />
          <p v-if="validationErrors.venue && !selectedVenue" class="mt-1 text-xs text-error">
            {{ validationErrors.venue }}
          </p>
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
                @click="closeArtistSearch"
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
            <ArtistSearch
              ref="currentArtistRef"
              v-model="currentArtist"
              @artist-selected="handleArtistSelected"
            />

            <!-- Add to Event Button (for manual artists) -->
            <div v-if="showAddToEventButton" class="mt-4 flex justify-end">
              <button type="button" class="btn-action-solid" @click="addCurrentArtist">
                Add to Event
              </button>
            </div>
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

    <!-- Calendar Modal -->
    <div :class="['modal', isCalendarOpen && 'modal-open']">
      <div class="modal-box max-w-fit border border-base-300 bg-base-200 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-semibold">Select Date</h3>
          <button type="button" class="btn btn-ghost btn-sm btn-circle" @click="closeCalendar">
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
        </div>
        <div class="overflow-visible">
          <calendar-date
            :value="eventDate"
            :min="todayDate"
            :first-day-of-week="0"
            @change="handleDateChange"
          >
            <calendar-month></calendar-month>
          </calendar-date>
        </div>
      </div>
      <div class="modal-backdrop" @click="closeCalendar"></div>
    </div>
  </section>
</template>

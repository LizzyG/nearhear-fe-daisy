<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import EventsList from '@/components/EventsList.vue';
import type { NormalizedEvent, EventArtist } from '@/components/EventCard.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { useAuth } from '@/composables/useAuth';
import { useCity } from '@/composables/useCity';
import { apiFetch } from '@/utils/api';

const route = useRoute();
const { isLoggedIn, isAuthError, userId, loginWithSpotify, logout } = useAuth();
const { selectedCity, fetchSupportedCities } = useCity();

// Liked events data
interface LikedEventResponse {
  EventId: number;
  Venue: string;
  Date: string;
  LocalDate: string;
  City: {
    City: string;
    State: string;
    StateAbbrev: string;
    CountryAbbrev: string;
    TzName: string;
  };
  AgeRange: number;
  PriceLow: number;
  PriceHigh: number;
  ArtistName: string;
  SpotifyGenres: string[] | null;
  BroadGenres: string[] | null;
  PreviewUrls: string[] | null;
  InfoUrl: string;
  FestName: string;
  // Bandcamp fields that might be present
  BandcampAlbumId?: number;
  BandcampArtistSlug?: string;
}

const likedEvents = ref<NormalizedEvent[]>([]);
const isLoadingEvents = ref(false);
const eventsError = ref<string | null>(null);

// Convert API response to normalized format
const normalizeEvent = (event: LikedEventResponse): NormalizedEvent => {
  const artist: EventArtist = {
    name: event.ArtistName,
    genres: [...(event.SpotifyGenres || []), ...(event.BroadGenres || [])],
    previewUrls: event.PreviewUrls || undefined,
    bandcampAlbumId: event.BandcampAlbumId,
    bandcampArtistSlug: event.BandcampArtistSlug,
  };

  return {
    id: event.EventId,
    venue: event.Venue,
    date: event.Date,
    localDate: event.LocalDate,
    priceLow: event.PriceLow,
    priceHigh: event.PriceHigh,
    ageRange: event.AgeRange,
    artists: [artist],
    infoUrl: event.InfoUrl,
    timeZone: event.City.TzName,
  };
};

const fetchLikedEvents = async () => {
  console.log('[ProfileView] fetchLikedEvents called');
  console.log('[ProfileView] isLoggedIn:', isLoggedIn.value);
  console.log('[ProfileView] selectedCity:', selectedCity.value);

  if (!isLoggedIn.value || !selectedCity.value) {
    console.log('[ProfileView] Early return - missing isLoggedIn or selectedCity');
    return;
  }

  isLoadingEvents.value = true;
  eventsError.value = null;

  try {
    const payload = {
      City: selectedCity.value.City,
      State: selectedCity.value.State,
      StateAbbrev: selectedCity.value.StateAbbrev,
      CountryAbbrev: selectedCity.value.CountryAbbrev,
      TzName: selectedCity.value.TzName,
    };

    const data = await apiFetch<LikedEventResponse[]>('/media/getEventsForLiked', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Group events by EventId to combine artists
    const eventMap = new Map<number, NormalizedEvent>();

    for (const event of data || []) {
      const existing = eventMap.get(event.EventId);
      if (existing) {
        // Add artist to existing event
        const newArtist = normalizeEvent(event).artists[0];
        if (newArtist) {
          existing.artists.push(newArtist);
        }
      } else {
        eventMap.set(event.EventId, normalizeEvent(event));
      }
    }

    likedEvents.value = Array.from(eventMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  } catch (err) {
    console.error('Failed to fetch liked events:', err);
    eventsError.value = err instanceof Error ? err.message : 'Failed to load your shows';
  } finally {
    isLoadingEvents.value = false;
  }
};

const handleLogin = () => {
  loginWithSpotify(route.fullPath);
};

const handleLogout = async () => {
  await logout();
  likedEvents.value = [];
};

// Watch for login state changes
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    void fetchLikedEvents();
  }
});

// Watch for city changes
watch(selectedCity, () => {
  if (isLoggedIn.value) {
    void fetchLikedEvents();
  }
});

onMounted(async () => {
  console.log('[ProfileView] onMounted - starting');
  console.log('[ProfileView] isLoggedIn:', isLoggedIn.value);
  console.log('[ProfileView] selectedCity before fetch:', selectedCity.value);

  await fetchSupportedCities();

  console.log('[ProfileView] selectedCity after fetch:', selectedCity.value);
  console.log('[ProfileView] About to call fetchLikedEvents, isLoggedIn:', isLoggedIn.value);

  if (isLoggedIn.value) {
    void fetchLikedEvents();
  } else {
    console.log('[ProfileView] Not logged in, skipping fetchLikedEvents');
  }
});
</script>

<template>
  <section>
    <PageHeader title="Profile" />

    <div class="mt-8">
      <!-- Logged In State -->
      <div v-if="isLoggedIn" class="space-y-8">
        <!-- User Info Card -->
        <div class="max-w-xl">
          <div class="card border border-base-300 bg-base-100 shadow-sm">
            <div class="card-body">
              <div class="flex items-center gap-4">
                <!-- Spotify Logo -->
                <div class="bg-spotify/10 flex h-14 w-14 items-center justify-center rounded-full">
                  <svg viewBox="0 0 24 24" class="text-spotify h-8 w-8" fill="currentColor">
                    <path
                      d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                    />
                  </svg>
                </div>

                <div class="flex-1">
                  <h2 class="text-lg font-semibold text-base-content">Connected to Spotify</h2>
                  <p class="text-base-content/70 text-sm">
                    User ID: <span class="font-mono">{{ userId }}</span>
                  </p>
                </div>

                <!-- Connected Badge -->
                <div class="badge badge-success gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="h-3.5 w-3.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  Connected
                </div>
              </div>

              <!-- Logout Button -->
              <button type="button" class="btn-action-outline-error mt-4" @click="handleLogout">
                Disconnect from Spotify
              </button>
            </div>
          </div>
        </div>

        <!-- Your Shows Section -->
        <div>
          <h2 class="mb-4 flex items-center gap-2 text-xl font-bold text-base-content">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-6 w-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
            Your Shows
            <span v-if="likedEvents.length > 0" class="badge badge-primary">
              {{ likedEvents.length }}
            </span>
          </h2>

          <p class="text-base-content/70 mb-4 text-sm">
            Shows you've saved in {{ selectedCity?.City || 'your city' }}
          </p>

          <!-- Loading State -->
          <div v-if="isLoadingEvents" class="py-8 text-center">
            <span class="loading loading-spinner loading-md"></span>
            <p class="text-base-content/70 mt-2 text-sm">Loading your shows...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="eventsError" class="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 shrink-0 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{{ eventsError }}</span>
          </div>

          <!-- Events List -->
          <EventsList
            v-else
            :events="likedEvents"
            :show-calendar-actions="true"
            empty-message="No saved shows yet. Browse the Calendar and save shows you're interested in!"
          />
        </div>
      </div>

      <!-- Not Logged In State -->
      <div v-else class="max-w-xl space-y-6">
        <!-- Auth Error Message -->
        <div v-if="isAuthError" class="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 class="font-bold">Authentication Error</h3>
            <p class="text-sm">There was a problem connecting to Spotify. Please try again.</p>
          </div>
        </div>

        <!-- Login Card -->
        <div class="card border border-base-300 bg-base-100 shadow-sm">
          <div class="card-body items-center text-center">
            <!-- Spotify Logo -->
            <div class="bg-spotify/10 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
              <svg viewBox="0 0 24 24" class="text-spotify h-12 w-12" fill="currentColor">
                <path
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                />
              </svg>
            </div>

            <h2 class="text-xl font-semibold text-base-content">Connect with Spotify</h2>
            <p class="text-base-content/70 mt-2 max-w-sm text-sm">
              Link your Spotify account to unlock personalized features like saving shows and
              getting music recommendations.
            </p>

            <!-- Login Button -->
            <button
              type="button"
              class="bg-spotify hover:bg-spotify-hover btn mt-6 gap-2 rounded-full px-8 text-white"
              @click="handleLogin"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor">
                <path
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                />
              </svg>
              Connect with Spotify
            </button>
          </div>
        </div>

        <!-- Benefits Section -->
        <div class="card border border-base-300 bg-base-200">
          <div class="card-body">
            <h3 class="mb-3 font-semibold text-base-content">Why connect?</h3>
            <ul class="text-base-content/80 space-y-3 text-sm">
              <li class="flex items-start gap-3">
                <div
                  class="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="h-4 w-4 text-primary"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="font-medium text-base-content">Save Your Favorite Shows</p>
                  <p class="text-base-content/60 text-xs">
                    Keep track of upcoming concerts you don't want to miss
                  </p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <div
                  class="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="h-4 w-4 text-primary"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="font-medium text-base-content">Personalized Playlists</p>
                  <p class="text-base-content/60 text-xs">
                    Get curated playlists based on your music preferences
                  </p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <div
                  class="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="h-4 w-4 text-primary"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="font-medium text-base-content">Smart Recommendations</p>
                  <p class="text-base-content/60 text-xs">
                    Discover shows featuring artists similar to ones you love
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Privacy Note -->
        <p class="text-base-content/50 text-center text-xs">
          We only access your Spotify profile and listening data to provide personalized
          recommendations. We never post anything on your behalf.
        </p>
      </div>
    </div>
  </section>
</template>

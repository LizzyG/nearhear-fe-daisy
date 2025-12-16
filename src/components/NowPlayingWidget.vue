<script setup lang="ts">
import { ref, onBeforeMount, onBeforeUnmount, computed } from 'vue';

import { useAuth } from '@/composables/useAuth';
import { useCity } from '@/composables/useCity';
import { useIsApp } from '@/composables/useIsApp';
import { apiFetch } from '@/utils/api';

// Types
interface NowPlayingData {
  trackUri: string;
  trackName: string;
  artistUri: string;
  artistName: string;
  playlistUri: string;
  albumArtURL: string;
  albumName?: string;
  playlistName?: string;
}

interface ArtistEvent {
  EventId: number | string;
  Date: string;
  Venue: string;
  ArtistNames: string[];
}

interface GetArtistEventsRequest {
  City: {
    City: string;
    StateAbbrev: string;
  };
  ArtistUri: string;
  PlaylistUri: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: Window & {
  NowPlaying?: {
    components: unknown;
    UpdateNowPlaying: (data: NowPlayingData) => void;
  };
  webkit?: {
    messageHandlers?: {
      bridge?: {
        postMessage: (message: { request: string }) => void;
      };
    };
  };
};

// Composables
const { isApp } = useIsApp();
const { isLoggedIn } = useAuth();
const { selectedCity } = useCity();

// State
const isExpanded = ref(false);
const nowPlayingData = ref<NowPlayingData | null>(null);
const events = ref<ArtistEvent[]>([]);
const isLoadingEvents = ref(false);

// Computed
const hasNowPlaying = computed(() => nowPlayingData.value !== null);

// Methods
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const formatShortDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  } catch {
    return dateString;
  }
};

const fetchArtistEvents = async () => {
  if (!nowPlayingData.value || !selectedCity.value) {
    events.value = [];
    return;
  }

  isLoadingEvents.value = true;

  try {
    const payload: GetArtistEventsRequest = {
      City: {
        City: selectedCity.value.City,
        StateAbbrev: selectedCity.value.StateAbbrev,
      },
      ArtistUri: nowPlayingData.value.artistUri,
      PlaylistUri: nowPlayingData.value.playlistUri,
    };

    const result = await apiFetch<ArtistEvent[]>('/media/getArtistEvents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    events.value = result || [];
  } catch (error) {
    console.error('Failed to fetch artist events:', error);
    events.value = [];
  } finally {
    isLoadingEvents.value = false;
  }
};

const UpdateNowPlaying = (data: NowPlayingData) => {
  nowPlayingData.value = data;
  void fetchArtistEvents();
};

const requestNowPlaying = () => {
  if (window.webkit?.messageHandlers?.bridge) {
    window.webkit.messageHandlers.bridge.postMessage({ request: 'getNowPlaying' });
  }
};

// Lifecycle
onBeforeMount(() => {
  // Register the bridge interface for iOS communication
  window.NowPlaying = {
    components: undefined,
    UpdateNowPlaying: (data: NowPlayingData) => UpdateNowPlaying(data),
  };

  // Request current now playing data from iOS
  requestNowPlaying();
});

onBeforeUnmount(() => {
  // Clean up window reference
  if (window.NowPlaying) {
    delete (window as Partial<typeof window>).NowPlaying;
  }
});
</script>

<template>
  <!-- Only show on iOS app -->
  <div v-if="isApp" class="fixed bottom-24 right-4 z-50 md:bottom-8">
    <!-- Collapsed State: Floating Button -->
    <button
      v-if="!isExpanded"
      type="button"
      class="btn btn-primary btn-circle shadow-lg"
      :class="{ 'animate-pulse': hasNowPlaying }"
      title="Now Playing"
      @click="toggleExpanded"
    >
      <!-- Music Note Icon -->
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
          d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
        />
      </svg>
    </button>

    <!-- Expanded State: Widget Panel -->
    <div
      v-else
      class="card w-80 border border-base-300 bg-base-100 shadow-xl transition-all duration-300"
    >
      <div class="card-body p-4">
        <!-- Header with close button -->
        <div class="mb-2 flex items-center justify-between">
          <h3 class="heading-card flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5 text-primary"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
              />
            </svg>
            Now Playing
          </h3>
          <button type="button" class="btn btn-ghost btn-sm btn-square" @click="toggleExpanded">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content when there's now playing data -->
        <div v-if="hasNowPlaying && nowPlayingData" class="space-y-4">
          <!-- Track Info -->
          <div class="flex gap-3">
            <img
              v-if="nowPlayingData.albumArtURL"
              :src="nowPlayingData.albumArtURL"
              :alt="`${nowPlayingData.albumName || 'Album'} cover`"
              class="h-16 w-16 rounded-lg object-cover shadow-md"
            />
            <div class="flex-1 space-y-1 overflow-hidden">
              <p class="truncate font-semibold text-base-content">
                {{ nowPlayingData.artistName }}
              </p>
              <p class="text-base-content/70 truncate text-sm">
                {{ nowPlayingData.trackName }}
              </p>
              <p v-if="nowPlayingData.albumName" class="text-base-content/50 truncate text-xs">
                {{ nowPlayingData.albumName }}
              </p>
              <p v-if="nowPlayingData.playlistName" class="text-spotify truncate text-xs">
                {{ nowPlayingData.playlistName }}
              </p>
            </div>
          </div>

          <!-- Divider -->
          <div class="divider my-2"></div>

          <!-- Upcoming Shows -->
          <div>
            <h4 class="mb-2 text-sm font-semibold text-base-content">
              Upcoming shows for {{ nowPlayingData.artistName }}
            </h4>

            <div v-if="isLoadingEvents" class="py-4 text-center">
              <span class="loading loading-spinner loading-sm text-primary"></span>
            </div>

            <div v-else-if="events.length > 0" class="max-h-40 space-y-2 overflow-y-auto">
              <div
                v-for="event in events"
                :key="event.EventId"
                class="rounded-lg bg-base-200 p-2 text-sm"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-base-content">{{ event.Venue }}</p>
                    <p
                      v-if="event.ArtistNames && event.ArtistNames.length > 0"
                      class="text-base-content/70 truncate text-xs"
                    >
                      {{ event.ArtistNames.join(', ') }}
                    </p>
                  </div>
                  <span class="badge badge-primary badge-sm whitespace-nowrap">
                    {{ formatShortDate(event.Date) }}
                  </span>
                </div>
              </div>
            </div>

            <p v-else class="text-base-content/60 py-2 text-center text-sm">
              No upcoming shows found in {{ selectedCity?.City || 'your city' }}
            </p>
          </div>
        </div>

        <!-- Content when no now playing data -->
        <div v-else class="space-y-4 py-2">
          <!-- Not logged in message -->
          <div v-if="!isLoggedIn" class="bg-spotify/10 rounded-lg p-3">
            <p class="text-sm text-base-content">
              <span class="text-spotify font-semibold">Link your Spotify account</span>
              to see upcoming shows for the artists you're listening to.
            </p>
          </div>

          <!-- Logged in but no data -->
          <div v-else>
            <p class="text-base-content/70 text-sm">
              Upcoming shows for the artist you're listening to will appear here.
            </p>
          </div>

          <!-- Playlist tip -->
          <div class="border-primary/30 bg-primary/5 rounded-lg border p-3">
            <p class="text-sm text-base-content">
              <span class="font-semibold text-primary">Pro tip:</span>
              Listening to NearHear playlists makes this feature even more useful!
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

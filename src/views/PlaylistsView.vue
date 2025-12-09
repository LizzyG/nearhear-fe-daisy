<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import PageHeader from '@/components/layout/PageHeader.vue';

import { resolveApiPath } from '@/config/api';

// Types
interface City {
  City: string;
  State: string;
  StateAbbrev: string;
  CountryAbbrev: string;
  TzName: string;
}

interface PlaylistFilter {
  City: City;
  StartDate: string;
  EndDate: string;
  SpotifyGenres: string[] | null;
  BroadGenres: string[] | null;
  Venues: string[] | null;
  Festivals: string[] | null;
  TheseFestivals: boolean;
  MinShows: number;
  TotalVenues: number;
  FilterMode: string;
}

interface Playlist {
  PlaylistId: number;
  PlaylistName: string;
  StartDate: string;
  EndDate: string;
  City: City;
  Filter: PlaylistFilter;
  SpotifyPlaylistId: string;
  PlaylistLink: string;
  Description: string;
  MaxTracks: number;
  IsPublic: boolean;
}

interface PlaylistEvent {
  EventId: number;
  ArtistName: string;
  ArtistId: string;
  TrackIds: string[] | null;
  PreviewUrls: string[];
  Url: string;
  Venue: string;
  LocalDate: string;
  Date: string;
}

interface PlaylistDetails extends Playlist {
  Events: PlaylistEvent[];
}

// State
const featuredPlaylists = ref<Playlist[]>([]);
const isLoadingPlaylists = ref(false);
const playlistsError = ref<string | null>(null);

const selectedPlaylist = ref<Playlist | null>(null);
const playlistDetails = ref<PlaylistDetails | null>(null);
const isLoadingDetails = ref(false);
const detailsError = ref<string | null>(null);
const isDetailsModalOpen = ref(false);

// Search/filter state
const searchQuery = ref('');

// Endpoints
const featuredPlaylistsEndpoint = resolveApiPath('/media/getFeaturedPlaylists');
const playlistDetailsEndpoint = resolveApiPath('/media/getPlaylistDetails');

// Helper functions
const formatDate = (dateString: string, timeZone?: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return dateString;
  }
};

const formatDateRange = (startDate: string, endDate: string, timeZone?: string) => {
  const start = formatDate(startDate, timeZone);
  const end = formatDate(endDate, timeZone);
  if (start === end) return start;
  return `${start} → ${end}`;
};

const getPlaylistTypeLabel = (playlist: Playlist): string => {
  const filterMode = playlist.Filter?.FilterMode || '';

  if (filterMode === 'venue') {
    const venues = playlist.Filter?.Venues;
    if (venues && venues.length === 1) {
      return `Venue: ${venues[0]}`;
    }
    return 'By Venue';
  }

  if (filterMode === 'genre') {
    const broadGenres = playlist.Filter?.BroadGenres;
    if (broadGenres && broadGenres.length > 0) {
      return broadGenres[0] || 'By Genre';
    }
    return 'By Genre';
  }

  // Check if it's a "Tonight" or "This Week" type playlist
  if (playlist.PlaylistName.toLowerCase().includes('tonight')) {
    return 'Tonight';
  }
  if (playlist.PlaylistName.toLowerCase().includes('this week')) {
    return 'This Week';
  }

  return 'Featured';
};

const getPlaylistTypeColor = (playlist: Playlist): string => {
  const filterMode = playlist.Filter?.FilterMode || '';

  if (filterMode === 'venue') return 'badge-secondary';
  if (filterMode === 'genre') return 'badge-primary';
  if (playlist.PlaylistName.toLowerCase().includes('tonight')) return 'badge-accent';
  if (playlist.PlaylistName.toLowerCase().includes('this week')) return 'badge-accent';

  return 'badge-neutral';
};

// Computed: group playlists by type
const groupedPlaylists = computed(() => {
  const filtered = searchQuery.value.trim()
    ? featuredPlaylists.value.filter(
        (p) =>
          p.PlaylistName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          p.City.City.toLowerCase().includes(searchQuery.value.toLowerCase()),
      )
    : featuredPlaylists.value;

  // Group by city for now
  const groups: Record<string, Playlist[]> = {};

  for (const playlist of filtered) {
    const cityKey = `${playlist.City.City}, ${playlist.City.StateAbbrev}`;
    if (!groups[cityKey]) {
      groups[cityKey] = [];
    }
    groups[cityKey].push(playlist);
  }

  // Sort playlists within each group: "Tonight" first, then "This Week", then by name
  for (const key of Object.keys(groups)) {
    const group = groups[key];
    if (!group) continue;
    group.sort((a, b) => {
      const aName = a.PlaylistName.toLowerCase();
      const bName = b.PlaylistName.toLowerCase();

      // Priority: Tonight > This Week > Genre > Venue > Other
      const getPriority = (name: string) => {
        if (name.includes('tonight')) return 0;
        if (name.includes('this week')) return 1;
        return 2;
      };

      const aPriority = getPriority(aName);
      const bPriority = getPriority(bName);

      if (aPriority !== bPriority) return aPriority - bPriority;
      return aName.localeCompare(bName);
    });
  }

  return groups;
});

// API functions
const fetchFeaturedPlaylists = async () => {
  isLoadingPlaylists.value = true;
  playlistsError.value = null;

  try {
    const response = await fetch(featuredPlaylistsEndpoint);

    if (!response.ok) {
      throw new Error(`Failed to load playlists (status ${response.status})`);
    }

    const data = (await response.json()) as Playlist[];
    featuredPlaylists.value = data;
  } catch (error) {
    playlistsError.value =
      error instanceof Error ? error.message : 'Something went wrong while loading playlists.';
    featuredPlaylists.value = [];
  } finally {
    isLoadingPlaylists.value = false;
  }
};

const fetchPlaylistDetails = async (playlist: Playlist) => {
  selectedPlaylist.value = playlist;
  isDetailsModalOpen.value = true;
  isLoadingDetails.value = true;
  detailsError.value = null;
  playlistDetails.value = null;

  try {
    // Get user ID from cookie if available (for future auth)
    const userId =
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('spotify_user_id='))
        ?.split('=')[1] || '';

    const response = await fetch(playlistDetailsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Accept: '*/*',
      },
      body: JSON.stringify({
        UserId: userId,
        PlaylistId: playlist.PlaylistId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to load playlist details (status ${response.status})`);
    }

    const data = (await response.json()) as PlaylistDetails;
    playlistDetails.value = data;
  } catch (error) {
    detailsError.value =
      error instanceof Error
        ? error.message
        : 'Something went wrong while loading playlist details.';
  } finally {
    isLoadingDetails.value = false;
  }
};

const closeDetailsModal = () => {
  isDetailsModalOpen.value = false;
  selectedPlaylist.value = null;
  playlistDetails.value = null;
  detailsError.value = null;
};

const openSpotifyPlaylist = (playlist: Playlist) => {
  if (playlist.PlaylistLink) {
    window.open(playlist.PlaylistLink, '_blank', 'noopener,noreferrer');
  }
};

// Format event date/time
const formatEventDateTime = (dateString: string, timeZone?: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return dateString;
  }
};

// Group events by date
const groupedEvents = computed(() => {
  if (!playlistDetails.value?.Events) return {};

  const groups: Record<string, PlaylistEvent[]> = {};

  for (const event of playlistDetails.value.Events) {
    const dateKey = event.LocalDate || event.Date.split('T')[0] || '';
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
  }

  // Sort events within each group by time
  for (const key of Object.keys(groups)) {
    const group = groups[key];
    if (!group) continue;
    group.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
  }

  return groups;
});

const formatGroupDate = (dateKey: string, timeZone?: string) => {
  try {
    const [year, month, day] = dateKey.split('-').map(Number);
    if (!year || !month || !day) return dateKey;
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return dateKey;
  }
};

onMounted(() => {
  void fetchFeaturedPlaylists();
});
</script>

<template>
  <section>
    <PageHeader title="Playlists" />

    <!-- Filter Bar -->
    <div class="mt-6">
      <div class="card border border-base-300 bg-base-200 shadow-sm">
        <div class="card-body p-4">
          <div class="flex flex-col gap-4 md:flex-row md:items-center">
            <!-- Search Input -->
            <div class="relative w-full md:flex-1">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search playlists..."
                class="input-primary h-10 pl-10 pr-4"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="text-base-content/50 pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </div>

            <!-- Playlist count -->
            <div class="text-base-content/70 text-sm">
              <span v-if="!isLoadingPlaylists && featuredPlaylists.length > 0">
                {{ featuredPlaylists.length }} playlists available
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="playlistsError" class="mt-8">
      <div class="alert alert-error">
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
        <span>{{ playlistsError }}</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoadingPlaylists" class="mt-8">
      <div class="flex items-center gap-3">
        <span class="loading loading-spinner loading-md text-primary"></span>
        <span class="text-base-content/70">Loading playlists…</span>
      </div>
    </div>

    <!-- Playlists Grid -->
    <div v-else-if="Object.keys(groupedPlaylists).length > 0" class="mt-8 space-y-8">
      <div v-for="(playlists, cityKey) in groupedPlaylists" :key="cityKey">
        <!-- City Header -->
        <div class="mb-4 flex items-center gap-3">
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
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          <h2 class="text-xl font-semibold text-base-content">{{ cityKey }}</h2>
        </div>

        <!-- Playlist Cards Grid -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="playlist in playlists"
            :key="playlist.PlaylistId"
            class="hover:border-primary/50 group card cursor-pointer border border-base-300 bg-base-100 shadow-sm transition-all hover:shadow-md"
            @click="fetchPlaylistDetails(playlist)"
          >
            <div class="card-body p-4">
              <!-- Playlist Header -->
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <h3
                    class="line-clamp-2 font-semibold text-base-content transition-colors group-hover:text-primary"
                  >
                    {{ playlist.PlaylistName }}
                  </h3>
                  <p class="text-base-content/70 mt-1 text-sm">
                    {{
                      formatDateRange(playlist.StartDate, playlist.EndDate, playlist.City.TzName)
                    }}
                  </p>
                </div>

                <!-- Spotify Button -->
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-circle text-spotify hover:bg-spotify/10"
                  title="Open in Spotify"
                  @click.stop="openSpotifyPlaylist(playlist)"
                >
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor">
                    <path
                      d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                    />
                  </svg>
                </button>
              </div>

              <!-- Playlist Type Badge -->
              <div class="mt-3 flex flex-wrap gap-2">
                <span :class="['badge badge-sm', getPlaylistTypeColor(playlist)]">
                  {{ getPlaylistTypeLabel(playlist) }}
                </span>
                <span v-if="playlist.IsPublic" class="badge badge-outline badge-sm"> Public </span>
              </div>

              <!-- Description if available -->
              <p v-if="playlist.Description" class="text-base-content/60 mt-2 line-clamp-2 text-sm">
                {{ playlist.Description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="mt-8">
      <div class="py-12 text-center">
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
            d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
          />
        </svg>
        <p class="text-base-content/70 mt-4">No playlists found.</p>
      </div>
    </div>

    <!-- Playlist Details Modal -->
    <div :class="['modal', isDetailsModalOpen && 'modal-open']">
      <div
        class="modal-box max-h-[90vh] w-full max-w-4xl border border-base-300 bg-base-100 shadow-lg"
      >
        <!-- Modal Header -->
        <div class="flex items-start justify-between border-b border-base-300 pb-4">
          <div v-if="selectedPlaylist" class="flex-1 pr-4">
            <h2 class="text-xl font-semibold text-base-content">
              {{ selectedPlaylist.PlaylistName }}
            </h2>
            <p class="text-base-content/70 mt-1 text-sm">
              {{
                formatDateRange(
                  selectedPlaylist.StartDate,
                  selectedPlaylist.EndDate,
                  selectedPlaylist.City.TzName,
                )
              }}
              · {{ selectedPlaylist.City.City }}, {{ selectedPlaylist.City.StateAbbrev }}
            </p>

            <!-- Open in Spotify button -->
            <a
              v-if="selectedPlaylist.PlaylistLink"
              :href="selectedPlaylist.PlaylistLink"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-3 inline-flex items-center gap-2 rounded-full bg-spotify px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-spotify-hover"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                <path
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                />
              </svg>
              Open in Spotify
            </a>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-square shrink-0"
            @click="closeDetailsModal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2.5"
              stroke="currentColor"
              class="h-6 w-6"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Modal Content -->
        <div class="max-h-[calc(90vh-180px)] overflow-y-auto py-4">
          <!-- Loading State -->
          <div v-if="isLoadingDetails" class="flex items-center justify-center py-8">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>

          <!-- Error State -->
          <div v-else-if="detailsError" class="alert alert-error">
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
            <span>{{ detailsError }}</span>
          </div>

          <!-- Events List -->
          <div
            v-else-if="playlistDetails && Object.keys(groupedEvents).length > 0"
            class="space-y-6"
          >
            <div v-for="(events, dateKey) in groupedEvents" :key="dateKey">
              <!-- Date Header -->
              <h3 class="text-base-content/70 mb-3 text-sm font-semibold uppercase tracking-wide">
                {{ formatGroupDate(dateKey, playlistDetails.City.TzName) }}
              </h3>

              <!-- Events for this date -->
              <div class="overflow-hidden rounded-lg border border-base-300">
                <div
                  v-for="(event, index) in events"
                  :key="`${event.EventId}-${event.ArtistName}`"
                  :class="['p-4', index % 2 === 0 ? 'bg-base-200' : 'bg-row-alt']"
                >
                  <div class="flex flex-col gap-3 md:flex-row md:items-center">
                    <!-- Artist Info -->
                    <div class="min-w-0 flex-1">
                      <h4 class="font-medium text-base-content">{{ event.ArtistName }}</h4>
                      <div class="text-base-content/70 mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        <span class="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="h-3.5 w-3.5"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                            />
                          </svg>
                          {{ event.Venue }}
                        </span>
                        <span class="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="h-3.5 w-3.5"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {{ formatEventDateTime(event.Date, playlistDetails.City.TzName) }}
                        </span>
                      </div>
                    </div>

                    <!-- Event Link -->
                    <a
                      v-if="event.Url"
                      :href="event.Url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="hover:bg-primary/10 btn btn-ghost btn-sm shrink-0 text-primary"
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
                          d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                        />
                      </svg>
                      <span class="hidden sm:inline">Tickets</span>
                    </a>
                  </div>

                  <!-- Audio Preview (if available) -->
                  <div
                    v-if="event.PreviewUrls && event.PreviewUrls.length > 0 && event.PreviewUrls[0]"
                    class="mt-3"
                  >
                    <audio
                      :src="event.PreviewUrls[0]"
                      controls
                      preload="none"
                      class="audio-player h-8 w-full"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty Events State -->
          <div
            v-else-if="
              playlistDetails && (!playlistDetails.Events || playlistDetails.Events.length === 0)
            "
            class="py-8 text-center"
          >
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
                d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
              />
            </svg>
            <p class="text-base-content/70 mt-4">No events in this playlist yet.</p>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="border-t border-base-300 pt-4">
          <button type="button" class="btn-action-outline w-full" @click="closeDetailsModal">
            Close
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="closeDetailsModal"></div>
    </div>
  </section>
</template>

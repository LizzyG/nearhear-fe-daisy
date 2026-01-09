<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '@/utils/api';
import LazyEmbed from '@/components/LazyEmbed.vue';
import type {
  LookupArtistEntry,
  GetLookupArtistsResponse,
  UpdateEventArtistRequest,
  SplitArtist,
  SpotifySearchResult,
} from '@/types/adminLookup';

// State
const isLoading = ref(false);
const error = ref<string | null>(null);
const lookupArtists = ref<LookupArtistEntry[]>([]);
const totalCount = ref(0);
const currentOffset = ref(0);
const limit = ref(50);

// Filter options
const cityId = ref(1); // Default to Portland
const daysBack = ref(7);

// Available cities (hardcoded for now, could be fetched from API)
const cities = [
  { id: 1, name: 'Portland' },
  { id: 2, name: 'Seattle' },
  { id: 3, name: 'Austin' },
];

// Expanded row state
const expandedRows = ref<Set<number>>(new Set());

// Spotify search state (per row)
const spotifySearching = ref<Record<number, boolean>>({});
const spotifyResults = ref<Record<number, SpotifySearchResult[]>>({});
const spotifySearchQuery = ref<Record<number, string>>({});

// Update form state (per row)
const updateForms = ref<
  Record<
    number,
    {
      artistName: string;
      spotifyId: string;
      bandcampSlug: string;
    }
  >
>({});

// Split form state (per row)
const splitMode = ref<Record<number, boolean>>({});
const splitArtists = ref<Record<number, SplitArtist[]>>({});

// Saving state
const savingRows = ref<Set<number>>(new Set());

// Computed
const hasMore = computed(() => currentOffset.value + limit.value < totalCount.value);
const hasPrevious = computed(() => currentOffset.value > 0);

// Methods
const fetchLookupArtists = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await apiFetch<GetLookupArtistsResponse>('/admin/getLookupArtists', {
      method: 'POST',
      body: JSON.stringify({
        cityId: cityId.value,
        limit: limit.value,
        offset: currentOffset.value,
        daysBack: daysBack.value,
      }),
    });

    lookupArtists.value = response.artists || [];
    totalCount.value = response.totalCount || 0;
    error.value = null; // Clear any previous errors on success

    // Initialize update forms for each artist
    lookupArtists.value.forEach((artist) => {
      if (!updateForms.value[artist.eventArtistId]) {
        updateForms.value[artist.eventArtistId] = {
          artistName: artist.artistName,
          spotifyId: '',
          bandcampSlug: '',
          instagramHandle: '',
        };
      }
      // Initialize spotify search query with artist name
      if (!spotifySearchQuery.value[artist.eventArtistId]) {
        spotifySearchQuery.value[artist.eventArtistId] = artist.artistName;
      }
    });
  } catch (err) {
    console.error('Error fetching lookup artists:', err);
    const errMsg = err instanceof Error ? err.message : 'Failed to fetch artists';
    if (errMsg.includes('401')) {
      error.value = 'Not authorized. Please log in as admin first.';
    } else {
      error.value = errMsg;
    }
  } finally {
    isLoading.value = false;
  }
};

const toggleRow = (eventArtistId: number) => {
  if (expandedRows.value.has(eventArtistId)) {
    expandedRows.value.delete(eventArtistId);
  } else {
    expandedRows.value.add(eventArtistId);
  }
};

const searchSpotify = async (eventArtistId: number) => {
  const query = spotifySearchQuery.value[eventArtistId];
  if (!query?.trim()) return;

  spotifySearching.value[eventArtistId] = true;

  try {
    const params = new URLSearchParams({ name: query.trim() });
    const results = await apiFetch<SpotifySearchResult[]>(`/media/searchSpotify?${params}`);
    spotifyResults.value[eventArtistId] = results || [];
  } catch (err) {
    console.error('Spotify search failed:', err);
  } finally {
    spotifySearching.value[eventArtistId] = false;
  }
};

const selectSpotifyResult = (eventArtistId: number, result: SpotifySearchResult) => {
  const form = updateForms.value[eventArtistId];
  if (form) {
    form.artistName = result.ArtistName;
    form.spotifyId = result.SpotifyArtistId || '';
  }
  // Clear search results after selection
  spotifyResults.value[eventArtistId] = [];
};

const saveArtist = async (artist: LookupArtistEntry) => {
  const form = updateForms.value[artist.eventArtistId];
  if (!form) return;

  if (!form.artistName.trim() && !form.spotifyId.trim() && !form.bandcampSlug.trim() && !form.instagramHandle.trim()) {
    alert('Please provide at least an artist name, Spotify ID, Bandcamp URL, or Instagram handle');
    return;
  }

  savingRows.value.add(artist.eventArtistId);

  try {
    const req: UpdateEventArtistRequest = {
      eventArtistId: artist.eventArtistId,
      artistName: form.artistName.trim(),
      spotifyId: form.spotifyId.trim(),
      bandcampSlug: form.bandcampSlug.trim(),
      instagramHandle: form.instagramHandle.trim(),
    };

    await apiFetch('/admin/updateEventArtist', {
      method: 'POST',
      body: JSON.stringify(req),
    });

    // Remove from list on success
    lookupArtists.value = lookupArtists.value.filter(
      (a) => a.eventArtistId !== artist.eventArtistId,
    );
    totalCount.value--;
  } catch (err) {
    console.error('Save failed:', err);
    alert(err instanceof Error ? err.message : 'Save failed');
  } finally {
    savingRows.value.delete(artist.eventArtistId);
  }
};

const initializeSplit = (eventArtistId: number, artistName: string) => {
  splitMode.value[eventArtistId] = true;
  // Start with 2 empty artists, pre-filling the first with current name
  splitArtists.value[eventArtistId] = [
    { name: artistName, spotifyId: '', bandcampSlug: '', instagramHandle: '' },
    { name: '', spotifyId: '', bandcampSlug: '', instagramHandle: '' },
  ];
};

const addSplitArtist = (eventArtistId: number) => {
  const artists = splitArtists.value[eventArtistId] || [];
  if (artists.length < 4) {
    artists.push({ name: '', spotifyId: '', bandcampSlug: '', instagramHandle: '' });
    splitArtists.value[eventArtistId] = [...artists];
  }
};

const removeSplitArtist = (eventArtistId: number, index: number) => {
  const artists = splitArtists.value[eventArtistId] || [];
  if (artists.length > 1) {
    artists.splice(index, 1);
    splitArtists.value[eventArtistId] = [...artists];
  }
};

const saveSplit = async (artist: LookupArtistEntry) => {
  const artists = splitArtists.value[artist.eventArtistId];
  if (!artists || artists.length === 0) return;

  // Filter out empty entries
  const validArtists = artists.filter((a) => a.name.trim());
  if (validArtists.length === 0) {
    alert('Please provide at least one artist name');
    return;
  }

  savingRows.value.add(artist.eventArtistId);

  try {
    await apiFetch('/admin/splitEventArtist', {
      method: 'POST',
      body: JSON.stringify({
        eventArtistId: artist.eventArtistId,
        artists: validArtists,
      }),
    });

    // Remove from list and reset split mode
    lookupArtists.value = lookupArtists.value.filter(
      (a) => a.eventArtistId !== artist.eventArtistId,
    );
    splitMode.value[artist.eventArtistId] = false;
    totalCount.value--;
  } catch (err) {
    console.error('Split failed:', err);
    alert(err instanceof Error ? err.message : 'Split failed');
  } finally {
    savingRows.value.delete(artist.eventArtistId);
  }
};

const cancelSplit = (eventArtistId: number) => {
  splitMode.value[eventArtistId] = false;
  delete splitArtists.value[eventArtistId];
};

const ignoreArtist = async (artist: LookupArtistEntry) => {
  if (!confirm(`Ignore "${artist.artistName}"? This will add it to the ignore list.`)) {
    return;
  }

  savingRows.value.add(artist.eventArtistId);

  try {
    await apiFetch('/admin/markArtistIgnore', {
      method: 'POST',
      body: JSON.stringify({
        eventArtistId: artist.eventArtistId,
        reason: 'manual_ignore',
      }),
    });

    // Remove from list
    lookupArtists.value = lookupArtists.value.filter(
      (a) => a.eventArtistId !== artist.eventArtistId,
    );
    totalCount.value--;
  } catch (err) {
    console.error('Ignore failed:', err);
    alert(err instanceof Error ? err.message : 'Ignore failed');
  } finally {
    savingRows.value.delete(artist.eventArtistId);
  }
};

const nextPage = () => {
  if (hasMore.value) {
    currentOffset.value += limit.value;
    fetchLookupArtists();
  }
};

const prevPage = () => {
  if (hasPrevious.value) {
    currentOffset.value = Math.max(0, currentOffset.value - limit.value);
    fetchLookupArtists();
  }
};

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const getSpotifyEmbedUrl = (spotifyId: string) => {
  if (!spotifyId) return '';
  return `https://open.spotify.com/embed/artist/${spotifyId}?utm_source=generator&theme=0&compact=true`;
};

// Get color class based on popularity score
const getPopularityColor = (popularity: number): string => {
  if (popularity >= 70) return 'text-success';
  if (popularity >= 50) return 'text-info';
  if (popularity >= 30) return 'text-warning';
  return 'text-base-content/70';
};

// Initialize on mount
onMounted(() => {
  fetchLookupArtists();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="heading-section">Artist Lookups</h2>
      <p class="text-base-content/60 mt-1 text-sm">
        Artists without Spotify or Bandcamp info that need manual lookup. These won't appear in the
        app until resolved.
      </p>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-4">
      <div class="form-control w-40">
        <label class="label" for="city-select">
          <span class="label-text font-medium">City</span>
        </label>
        <select id="city-select" v-model="cityId" class="select-primary" @change="fetchLookupArtists">
          <option v-for="city in cities" :key="city.id" :value="city.id">
            {{ city.name }}
          </option>
        </select>
      </div>

      <div class="form-control w-32">
        <label class="label" for="days-back">
          <span class="label-text font-medium">Days Back</span>
        </label>
        <select id="days-back" v-model="daysBack" class="select-primary" @change="fetchLookupArtists">
          <option :value="3">3 days</option>
          <option :value="7">7 days</option>
          <option :value="14">14 days</option>
          <option :value="30">30 days</option>
        </select>
      </div>

      <button class="btn-action-solid" :disabled="isLoading" @click="fetchLookupArtists">
        <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
        <span v-else>Refresh</span>
      </button>
    </div>

    <!-- Stats -->
    <div v-if="!isLoading" class="text-base-content/70 text-sm">
      Showing {{ lookupArtists.length }} of {{ totalCount }} artists needing lookup
    </div>

    <!-- Error -->
    <div v-if="error" class="alert alert-error">
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
      <span>{{ error }}</span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Empty State (only show if no error) -->
    <div
      v-else-if="lookupArtists.length === 0 && !error"
      class="rounded-lg border border-base-300 bg-base-200 p-8 text-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="text-success mx-auto h-12 w-12"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-base-content/70 mt-3">All caught up! No artists need lookup right now.</p>
    </div>

    <!-- Artist List -->
    <div v-else class="space-y-3">
      <div
        v-for="artist in lookupArtists"
        :key="artist.eventArtistId"
        class="rounded-lg border border-base-300 bg-base-100 overflow-hidden"
      >
        <!-- Row Header (always visible) -->
        <div
          class="flex cursor-pointer items-center gap-4 p-4 hover:bg-base-200"
          @click="toggleRow(artist.eventArtistId)"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold truncate">{{ artist.artistName }}</span>
              <span
                v-if="artist.knownArtists?.length"
                class="badge badge-outline badge-sm shrink-0"
                :title="'Also on bill: ' + artist.knownArtists.join(', ')"
              >
                +{{ artist.knownArtists.length }} known
              </span>
            </div>
            <div class="text-base-content/60 text-sm truncate">
              {{ artist.venue }} · {{ formatDate(artist.date) }}
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <a
              v-if="artist.url"
              :href="artist.url"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-ghost btn-sm btn-circle"
              title="View event page"
              @click.stop
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
            </a>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              :class="[
                'h-5 w-5 transition-transform',
                expandedRows.has(artist.eventArtistId) ? 'rotate-180' : '',
              ]"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        <!-- Expanded Content -->
        <div
          v-if="expandedRows.has(artist.eventArtistId)"
          class="border-t border-base-300 bg-base-200 p-4 space-y-4"
        >
          <!-- Split Mode -->
          <template v-if="splitMode[artist.eventArtistId]">
            <div class="space-y-3">
              <div class="text-sm font-medium">Split into multiple artists:</div>
              <div
                v-for="(splitArtist, idx) in splitArtists[artist.eventArtistId]"
                :key="idx"
                class="flex items-start gap-2 p-3 rounded-lg bg-base-100 border border-base-300"
              >
                <div class="flex-1 space-y-2">
                  <input
                    v-model="splitArtist.name"
                    type="text"
                    placeholder="Artist name"
                    class="input-primary-sm w-full"
                  />
                  <div class="flex gap-2">
                    <input
                      v-model="splitArtist.spotifyId"
                      type="text"
                      placeholder="Spotify ID"
                      class="input-primary-sm flex-1"
                    />
                    <input
                      v-model="splitArtist.bandcampSlug"
                      type="text"
                      placeholder="Bandcamp"
                      class="input-primary-sm flex-1"
                    />
                    <input
                      v-model="splitArtist.instagramHandle"
                      type="text"
                      placeholder="Instagram"
                      class="input-primary-sm flex-1"
                    />
                  </div>
                </div>
                <button
                  v-if="(splitArtists[artist.eventArtistId]?.length || 0) > 1"
                  class="btn btn-ghost btn-sm btn-circle"
                  @click="removeSplitArtist(artist.eventArtistId, idx)"
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
              <div class="flex gap-2">
                <button
                  v-if="(splitArtists[artist.eventArtistId]?.length || 0) < 4"
                  class="btn btn-ghost btn-sm"
                  @click="addSplitArtist(artist.eventArtistId)"
                >
                  + Add Artist
                </button>
              </div>
              <div class="flex gap-2 pt-2">
                <button
                  class="btn-action-solid"
                  :disabled="savingRows.has(artist.eventArtistId)"
                  @click="saveSplit(artist)"
                >
                  <span v-if="savingRows.has(artist.eventArtistId)" class="loading loading-spinner loading-sm"></span>
                  <span v-else>Save Split</span>
                </button>
                <button class="btn-action-outline" @click="cancelSplit(artist.eventArtistId)">
                  Cancel
                </button>
              </div>
            </div>
          </template>

          <!-- Normal Edit Mode -->
          <template v-else>
            <!-- Known Artists with Genres (at top for context) -->
            <div v-if="artist.knownArtists?.length" class="mb-3 pb-3 border-b border-base-300">
              <div class="flex flex-wrap gap-x-4 gap-y-2">
                <div
                  v-for="known in artist.knownArtists"
                  :key="known.name"
                  class="flex items-center gap-2"
                >
                  <span class="font-medium text-sm">{{ known.name }}</span>
                  <div v-if="known.genres?.length" class="flex flex-wrap gap-1">
                    <span
                      v-for="genre in known.genres.slice(0, 3)"
                      :key="genre"
                      class="badge badge-xs bg-base-300 text-base-content/70 border-0"
                    >
                      {{ genre }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Compact Search Bar with All Platform Buttons -->
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="spotifySearchQuery[artist.eventArtistId]"
                type="text"
                placeholder="Search..."
                class="input-primary-sm w-48"
                @keyup.enter="searchSpotify(artist.eventArtistId)"
              />
              <button
                class="btn btn-sm gap-1 bg-spotify/10 hover:bg-spotify/20 text-spotify border-spotify/30"
                :disabled="spotifySearching[artist.eventArtistId]"
                @click="searchSpotify(artist.eventArtistId)"
                title="Search Spotify"
              >
                <span v-if="spotifySearching[artist.eventArtistId]" class="loading loading-spinner loading-xs"></span>
                <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </button>
              <a
                :href="`https://bandcamp.com/search?q=${encodeURIComponent(spotifySearchQuery[artist.eventArtistId] || artist.artistName)}`"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-sm gap-1 bg-bandcamp/10 hover:bg-bandcamp/20 text-bandcamp border-bandcamp/30"
                title="Search Bandcamp"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                  <path d="M0 18.75l7.437-13.5H24l-7.438 13.5z" />
                </svg>
              </a>
              <a
                :href="`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(spotifySearchQuery[artist.eventArtistId] || artist.artistName)}`"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-sm gap-1 bg-instagram/10 hover:bg-instagram/20 text-instagram border-instagram/30"
                title="Search Instagram"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                :href="`https://www.google.com/search?q=${encodeURIComponent((spotifySearchQuery[artist.eventArtistId] || artist.artistName) + ' band music')}`"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-sm btn-ghost gap-1"
                title="Google search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </a>
            </div>

            <!-- Spotify Results -->
            <div
              v-if="spotifyResults[artist.eventArtistId]?.length"
              class="mt-3 rounded-lg border border-spotify/30 bg-spotify/5 max-h-80 overflow-y-auto"
            >
              <button
                v-for="result in spotifyResults[artist.eventArtistId]"
                :key="result.SpotifyArtistId"
                type="button"
                class="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-spotify/10 transition-colors border-b border-spotify/10 last:border-b-0"
                @click="selectSpotifyResult(artist.eventArtistId, result)"
              >
                <!-- Artist Image -->
                <div v-if="result.ImageUrl" class="avatar shrink-0">
                  <div class="h-14 w-14 rounded-lg">
                    <img :src="result.ImageUrl" :alt="result.ArtistName" class="object-cover" />
                  </div>
                </div>
                <div v-else class="bg-spotify/20 flex h-14 w-14 items-center justify-center rounded-lg shrink-0">
                  <svg viewBox="0 0 24 24" class="text-spotify h-7 w-7" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
                
                <!-- Artist Info -->
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-base truncate">{{ result.ArtistName }}</p>
                  <div v-if="result.Genres?.length" class="flex flex-wrap gap-1 mt-1">
                    <span
                      v-for="genre in result.Genres.slice(0, 4)"
                      :key="genre"
                      class="badge badge-sm bg-spotify/20 text-spotify border-0"
                    >
                      {{ genre }}
                    </span>
                    <span v-if="result.Genres.length > 4" class="text-xs text-base-content/50">
                      +{{ result.Genres.length - 4 }}
                    </span>
                  </div>
                </div>
                
                <!-- Popularity -->
                <div
                  v-if="result.Popularity !== undefined"
                  class="text-center shrink-0"
                  :title="`Spotify popularity: ${result.Popularity}/100`"
                >
                  <span class="text-lg font-bold" :class="getPopularityColor(result.Popularity)">
                    {{ result.Popularity }}
                  </span>
                </div>
              </button>
            </div>

            <!-- Manual Entry Form -->
            <div class="mt-3 pt-3 border-t border-base-300">
              <div class="grid gap-3 grid-cols-4">
                <div class="form-control">
                  <label class="label py-0.5">
                    <span class="label-text text-xs">Artist Name</span>
                  </label>
                  <input
                    v-model="updateForms[artist.eventArtistId].artistName"
                    type="text"
                    placeholder="Artist name"
                    class="input-primary-sm"
                  />
                </div>
                <div class="form-control">
                  <label class="label py-0.5">
                    <span class="label-text text-xs">Spotify ID/URL</span>
                  </label>
                  <input
                    v-model="updateForms[artist.eventArtistId].spotifyId"
                    type="text"
                    placeholder="Spotify ID or URL"
                    class="input-primary-sm"
                  />
                </div>
                <div class="form-control">
                  <label class="label py-0.5">
                    <span class="label-text text-xs">Bandcamp</span>
                  </label>
                  <input
                    v-model="updateForms[artist.eventArtistId].bandcampSlug"
                    type="text"
                    placeholder="artistname.bandcamp.com"
                    class="input-primary-sm"
                  />
                </div>
                <div class="form-control">
                  <label class="label py-0.5">
                    <span class="label-text text-xs">Instagram</span>
                  </label>
                  <input
                    v-model="updateForms[artist.eventArtistId].instagramHandle"
                    type="text"
                    placeholder="@handle or URL"
                    class="input-primary-sm"
                  />
                </div>
              </div>

              <!-- Preview Spotify Embed if ID is set -->
              <div v-if="updateForms[artist.eventArtistId]?.spotifyId" class="mt-2">
                <LazyEmbed
                  :src="getSpotifyEmbedUrl(updateForms[artist.eventArtistId].spotifyId)"
                  :width="280"
                  :height="80"
                  class="rounded-md"
                />
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-base-300">
              <button
                class="btn-action-solid"
                :disabled="savingRows.has(artist.eventArtistId)"
                @click="saveArtist(artist)"
              >
                <span v-if="savingRows.has(artist.eventArtistId)" class="loading loading-spinner loading-sm"></span>
                <span v-else>Save</span>
              </button>
              <button
                class="btn-action-outline"
                @click="initializeSplit(artist.eventArtistId, artist.artistName)"
              >
                Split
              </button>
              <button
                class="btn btn-ghost btn-sm text-error hover:bg-error/10"
                @click="ignoreArtist(artist)"
              >
                Ignore
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalCount > limit" class="flex items-center justify-between">
      <button class="btn-action-outline" :disabled="!hasPrevious" @click="prevPage">
        ← Previous
      </button>
      <span class="text-base-content/60 text-sm">
        {{ currentOffset + 1 }}-{{ Math.min(currentOffset + limit, totalCount) }} of
        {{ totalCount }}
      </span>
      <button class="btn-action-outline" :disabled="!hasMore" @click="nextPage">Next →</button>
    </div>
  </div>
</template>

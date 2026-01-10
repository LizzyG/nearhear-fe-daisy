<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import LazyEmbed from '@/components/LazyEmbed.vue';
import SpotifyPreviewPlayer from '@/components/SpotifyPreviewPlayer.vue';
import type { ArtistInfo } from '@/types/artist';
import { apiFetch } from '@/utils/api';

// Helper to check if BandcampData has valid albums
const hasBandcampAlbums = (artist: ArtistInfo): boolean => {
  return !!(artist.BandcampData?.albums && artist.BandcampData.albums.length > 0);
};

// Get first album ID for embed
const getFirstBandcampAlbumId = (artist: ArtistInfo): number | null => {
  if (artist.BandcampData?.albums && artist.BandcampData.albums.length > 0) {
    const firstAlbum = artist.BandcampData.albums[0];
    return firstAlbum?.album_id ?? null;
  }
  return null;
};

// Extract Instagram handle from URL
const getInstagramHandle = (artist: ArtistInfo): string | null => {
  if (artist.InstagramHandle) return artist.InstagramHandle;
  if (artist.InstagramURL) {
    const match = artist.InstagramURL.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
    return match?.[1] ?? null;
  }
  return null;
};

// Get Spotify artist ID from either the field or by extracting from URL
const getSpotifyArtistId = (artist: ArtistInfo): string | null => {
  if (artist.SpotifyArtistId) return artist.SpotifyArtistId;
  if (artist.SpotifyURL) {
    const match = artist.SpotifyURL.match(/artist\/([a-zA-Z0-9]+)/i);
    return match?.[1] ?? null;
  }
  return null;
};

const props = defineProps<{
  modelValue?: ArtistInfo | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: ArtistInfo | null): void;
  (e: 'artistSelected', artist: ArtistInfo): void;
}>();

// Search inputs
const artistName = ref('');
const spotifyLink = ref('');
const bandcampLink = ref('');

// State
const isSearching = ref(false);
const searchError = ref<string | null>(null);
const searchResults = ref<ArtistInfo[]>([]);
const selectedArtist = ref<ArtistInfo | null>(null);
const showResults = ref(false);

// Spotify search state
const isSearchingSpotify = ref(false);
const spotifySearchResults = ref<ArtistInfo[]>([]);
const showSpotifyResults = ref(false);

// Track if selected artist is from our database (update) vs new (add)
const isExistingArtist = ref(false);

// Manual entry fields (when info is missing)
const manualInstagramURL = ref('');
const manualSpotifyURL = ref('');
const manualBandcampURL = ref('');

// Debounce timer
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// Check if we have enough info to search
const canSearch = computed(() => {
  return (
    artistName.value.trim().length >= 2 ||
    spotifyLink.value.trim().length > 0 ||
    bandcampLink.value.trim().length > 0
  );
});

// Check what info is missing from selected artist
const missingInfo = computed(() => {
  if (!selectedArtist.value) return { spotify: true, bandcamp: true, instagram: true };
  return {
    spotify: !selectedArtist.value.SpotifyURL && !selectedArtist.value.SpotifyArtistId,
    bandcamp: !selectedArtist.value.BandcampURL && !selectedArtist.value.BandcampArtistSlug,
    instagram: !selectedArtist.value.InstagramURL,
  };
});

const hasMissingInfo = computed(() => {
  return missingInfo.value.spotify || missingInfo.value.bandcamp || missingInfo.value.instagram;
});

// Check if user has actually added new information for existing artists
const hasAddedNewInfo = computed(() => {
  // For manual artists, this doesn't apply - they're creating new data
  if (!isExistingArtist.value) return true;

  // For existing artists, check if they've filled in any manual fields
  return !!(manualSpotifyURL.value || manualBandcampURL.value || manualInstagramURL.value);
});

// Check if artist is missing streaming URLs (won't appear on app without these)
const isMissingStreamingUrls = computed(() => {
  if (!selectedArtist.value) return false;
  // Only show warning for manually added artists (not from database)
  if (isExistingArtist.value) return false;
  // Check if missing both Spotify AND Bandcamp
  const hasSpotify =
    selectedArtist.value.SpotifyURL ||
    selectedArtist.value.SpotifyArtistId ||
    manualSpotifyURL.value;
  const hasBandcamp =
    selectedArtist.value.BandcampURL ||
    selectedArtist.value.BandcampArtistSlug ||
    manualBandcampURL.value;
  return !hasSpotify && !hasBandcamp;
});

// Normalize URL by adding https:// if missing
const normalizeURL = (url: string): string => {
  if (!url) return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

// URL validation patterns (check normalized URL)
const isValidSpotifyURL = (url: string): boolean => {
  if (!url) return true; // Empty is valid (optional field)
  const normalized = normalizeURL(url);
  return /^https?:\/\/(open\.)?spotify\.com\/artist\/[a-zA-Z0-9]+/i.test(normalized);
};

const isValidBandcampURL = (url: string): boolean => {
  if (!url) return true;
  const normalized = normalizeURL(url);
  return /^https?:\/\/[a-zA-Z0-9-]+\.bandcamp\.com/i.test(normalized);
};

const isValidInstagramURL = (url: string): boolean => {
  if (!url) return true;
  const normalized = normalizeURL(url);
  return /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+/i.test(normalized);
};

// Validation state for manual entries
const validationErrors = computed(() => ({
  artistName:
    !isExistingArtist.value && !selectedArtist.value?.ArtistName?.trim()
      ? 'Artist name is required'
      : null,
  spotify:
    manualSpotifyURL.value && !isValidSpotifyURL(manualSpotifyURL.value)
      ? 'Must be a valid Spotify artist URL (e.g., https://open.spotify.com/artist/...)'
      : null,
  bandcamp:
    manualBandcampURL.value && !isValidBandcampURL(manualBandcampURL.value)
      ? 'Must be a valid Bandcamp URL (e.g., https://artistname.bandcamp.com)'
      : null,
  instagram:
    manualInstagramURL.value && !isValidInstagramURL(manualInstagramURL.value)
      ? 'Must be a valid Instagram URL (e.g., https://instagram.com/artisthandle)'
      : null,
}));

const hasValidationErrors = computed(() => {
  return (
    !!validationErrors.value.artistName ||
    !!validationErrors.value.spotify ||
    !!validationErrors.value.bandcamp ||
    !!validationErrors.value.instagram
  );
});

// Build the final artist info combining selected + manual entries
const getFinalArtistInfo = (): ArtistInfo | null => {
  if (!selectedArtist.value) return null;

  // Get the URL values, normalizing manual entries
  const spotifyURL =
    selectedArtist.value.SpotifyURL ||
    (manualSpotifyURL.value ? normalizeURL(manualSpotifyURL.value) : undefined);
  const bandcampURL =
    selectedArtist.value.BandcampURL ||
    (manualBandcampURL.value ? normalizeURL(manualBandcampURL.value) : undefined);
  const instagramURL =
    selectedArtist.value.InstagramURL ||
    (manualInstagramURL.value ? normalizeURL(manualInstagramURL.value) : undefined);

  return {
    ...selectedArtist.value,
    SpotifyURL: spotifyURL,
    BandcampURL: bandcampURL,
    InstagramURL: instagramURL,
  };
};

// Expose methods and state for parent components
defineExpose({
  getFinalArtistInfo,
  hasMissingInfo,
  hasValidationErrors,
  hasAddedNewInfo,
  isExistingArtist,
});

// Search for artist
const searchArtist = async () => {
  if (!canSearch.value) return;

  isSearching.value = true;
  searchError.value = null;
  searchResults.value = [];

  try {
    const params = new URLSearchParams();

    if (artistName.value.trim()) {
      params.append('name', artistName.value.trim());
    }
    if (spotifyLink.value.trim()) {
      params.append('spotify', spotifyLink.value.trim());
    }
    if (bandcampLink.value.trim()) {
      params.append('bandcamp', bandcampLink.value.trim());
    }

    const results = await apiFetch<ArtistInfo[]>(`/media/getArtistByName?${params.toString()}`);

    searchResults.value = results || [];
    showResults.value = true;

    // If only one result, auto-select it (from database = true)
    if (results && results.length === 1 && results[0]) {
      selectArtist(results[0], true);
    }
  } catch (err) {
    console.error('Artist search failed:', err);
    searchError.value = err instanceof Error ? err.message : 'Search failed';
  } finally {
    isSearching.value = false;
  }
};

// Search Spotify for artist
const searchSpotify = async () => {
  if (!artistName.value.trim()) return;

  isSearchingSpotify.value = true;
  searchError.value = null;
  spotifySearchResults.value = [];

  try {
    const params = new URLSearchParams();
    params.append('name', artistName.value.trim());

    const results = await apiFetch<ArtistInfo[]>(`/media/searchSpotify?${params.toString()}`);

    spotifySearchResults.value = results || [];
    showSpotifyResults.value = true;
    showResults.value = false; // Hide the original results

    // If only one result, auto-select it (from Spotify = false)
    if (results && results.length === 1 && results[0]) {
      selectArtist(results[0], false);
    }
  } catch (err) {
    console.error('Spotify search failed:', err);
    searchError.value = err instanceof Error ? err.message : 'Spotify search failed';
  } finally {
    isSearchingSpotify.value = false;
  }
};

// Debounced search trigger
const triggerSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (!canSearch.value) {
    searchResults.value = [];
    showResults.value = false;
    return;
  }

  searchTimeout = setTimeout(() => {
    void searchArtist();
  }, 500);
};

// Select an artist from results
// fromDatabase: true if selected from our database (getArtistByName), false if from Spotify search
const selectArtist = (artist: ArtistInfo, fromDatabase: boolean = false) => {
  selectedArtist.value = artist;
  isExistingArtist.value = fromDatabase;
  showResults.value = false;
  showSpotifyResults.value = false;

  // Pre-populate manual fields if info exists
  if (artist.SpotifyURL) manualSpotifyURL.value = artist.SpotifyURL;
  if (artist.BandcampURL) manualBandcampURL.value = artist.BandcampURL;
  if (artist.InstagramURL) manualInstagramURL.value = artist.InstagramURL;

  emit('artistSelected', artist);
  emit('update:modelValue', artist);
};

// Create new artist from manual entry
const createManualArtist = () => {
  // Allow manual entry even without artist name (they can fill it in after)
  const newArtist: ArtistInfo = {
    ArtistName: artistName.value.trim() || '', // Allow empty, user will fill it in
    SpotifyURL: spotifyLink.value.trim() || manualSpotifyURL.value || undefined,
    BandcampURL: bandcampLink.value.trim() || manualBandcampURL.value || undefined,
    InstagramURL: manualInstagramURL.value || undefined,
  };

  selectedArtist.value = newArtist;
  isExistingArtist.value = false; // Manual entry is always a new artist

  // Pre-populate manual fields with search values if they exist
  if (spotifyLink.value.trim()) {
    manualSpotifyURL.value = spotifyLink.value.trim();
  }
  if (bandcampLink.value.trim()) {
    manualBandcampURL.value = bandcampLink.value.trim();
  }

  emit('artistSelected', newArtist);
  emit('update:modelValue', newArtist);
};

// Clear selection and reset
const clearSelection = () => {
  selectedArtist.value = null;
  isExistingArtist.value = false;
  artistName.value = '';
  spotifyLink.value = '';
  bandcampLink.value = '';
  searchResults.value = [];
  showResults.value = false;
  spotifySearchResults.value = [];
  showSpotifyResults.value = false;
  manualInstagramURL.value = '';
  manualSpotifyURL.value = '';
  manualBandcampURL.value = '';
  emit('update:modelValue', null);
};

// Watch for input changes to trigger search
watch([artistName, spotifyLink, bandcampLink], () => {
  if (selectedArtist.value) {
    // Clear selection if user changes input
    clearSelection();
  }
  triggerSearch();
});

// Sync with v-model
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && newVal !== selectedArtist.value) {
      selectedArtist.value = newVal;
      artistName.value = newVal.ArtistName;
    } else if (!newVal && selectedArtist.value) {
      // Parent cleared the model, reset the component
      clearSelection();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="space-y-4">
    <!-- Search Inputs - Hide when artist is selected -->
    <div v-if="!selectedArtist" class="space-y-3">
      <!-- Artist Name -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Artist Name</span>
        </label>
        <input
          v-model="artistName"
          type="text"
          placeholder="Enter artist name..."
          class="input-primary"
        />
      </div>

      <!-- Spotify Link -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Spotify Link</span>
          <span class="label-text-alt text-base-content/60">optional</span>
        </label>
        <input
          v-model="spotifyLink"
          type="url"
          placeholder="https://open.spotify.com/artist/..."
          class="input-primary"
        />
      </div>

      <!-- Bandcamp Link -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Bandcamp Link</span>
          <span class="label-text-alt text-base-content/60">optional</span>
        </label>
        <input
          v-model="bandcampLink"
          type="url"
          placeholder="https://artistname.bandcamp.com"
          class="input-primary"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isSearching && !selectedArtist" class="flex items-center gap-2 py-2">
      <span class="loading loading-spinner loading-sm"></span>
      <span class="text-base-content/70 text-sm">Searching for artist...</span>
    </div>

    <!-- Search Error -->
    <div v-if="searchError && !selectedArtist" class="alert alert-error">
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
      <span>{{ searchError }}</span>
    </div>

    <!-- Spotify Search Loading -->
    <div v-if="isSearchingSpotify && !selectedArtist" class="flex items-center gap-2 py-2">
      <span class="text-spotify loading loading-spinner loading-sm"></span>
      <span class="text-base-content/70 text-sm">Searching Spotify...</span>
    </div>

    <!-- Search Results (multiple matches) -->
    <div
      v-if="showResults && searchResults.length > 1 && !showSpotifyResults && !selectedArtist"
      class="rounded-lg border border-base-300 bg-base-100"
    >
      <div class="border-b border-base-300 px-4 py-2">
        <span class="text-sm font-medium">Multiple artists found - select one:</span>
      </div>
      <div class="max-h-60 overflow-y-auto">
        <button
          v-for="(artist, index) in searchResults"
          :key="index"
          type="button"
          class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-base-200"
          @click="selectArtist(artist, true)"
        >
          <div v-if="artist.ImageUrl" class="avatar">
            <div class="h-10 w-10 rounded-full">
              <img :src="artist.ImageUrl" :alt="artist.ArtistName" />
            </div>
          </div>
          <div v-else class="flex h-10 w-10 items-center justify-center rounded-full bg-base-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-medium">{{ artist.ArtistName }}</p>
            <p v-if="artist.Genres?.length" class="text-base-content/60 text-xs">
              {{ artist.Genres.slice(0, 3).join(', ') }}
            </p>
          </div>
          <div class="flex items-center gap-3 text-xs" @click.stop>
            <a
              v-if="artist.SpotifyURL"
              :href="artist.SpotifyURL"
              target="_blank"
              rel="noopener noreferrer"
              class="text-spotify flex items-center gap-1 hover:underline"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
                <path
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                />
              </svg>
              Spotify
            </a>
            <a
              v-if="artist.BandcampURL"
              :href="artist.BandcampURL"
              target="_blank"
              rel="noopener noreferrer"
              class="text-bandcamp flex items-center gap-1 hover:underline"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
                <path d="M0 18.75l7.437-13.5H24l-7.438 13.5z" />
              </svg>
              Bandcamp
            </a>
            <a
              v-if="artist.InstagramURL"
              :href="artist.InstagramURL"
              target="_blank"
              rel="noopener noreferrer"
              class="text-instagram flex items-center gap-1 hover:underline"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
                <path
                  d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                />
              </svg>
              Instagram
            </a>
          </div>
        </button>
      </div>
      <!-- None of these option -->
      <div class="border-t border-base-300 px-4 py-3">
        <button
          type="button"
          class="flex items-center gap-2 text-sm text-primary hover:underline"
          :disabled="isSearchingSpotify"
          @click="searchSpotify"
        >
          <svg viewBox="0 0 24 24" class="text-spotify h-4 w-4" fill="currentColor">
            <path
              d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
            />
          </svg>
          <span v-if="isSearchingSpotify">Searching Spotify...</span>
          <span v-else>None of these? Search Spotify instead</span>
        </button>
      </div>
    </div>

    <!-- No Results - Prompt Spotify Search or Manual Entry -->
    <div
      v-if="
        showResults &&
        searchResults.length === 0 &&
        !isSearching &&
        !showSpotifyResults &&
        !selectedArtist &&
        canSearch
      "
      class="border-warning/50 bg-warning/10 rounded-lg border p-4"
    >
      <p class="mb-3 text-sm">
        <strong>No artist found in our database.</strong>
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="btn-action-solid"
          :disabled="isSearchingSpotify"
          @click="searchSpotify"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path
              d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
            />
          </svg>
          <span v-if="isSearchingSpotify">Searching...</span>
          <span v-else>Search Spotify</span>
        </button>
        <button type="button" class="btn-action-outline" @click="createManualArtist">
          Add manually
        </button>
      </div>
    </div>

    <!-- Spotify Search Results -->
    <div
      v-if="showSpotifyResults && spotifySearchResults.length > 0 && !selectedArtist"
      class="border-spotify/30 bg-spotify/5 rounded-lg border"
    >
      <div class="border-spotify/30 flex items-center gap-2 border-b px-4 py-2">
        <svg viewBox="0 0 24 24" class="text-spotify h-4 w-4" fill="currentColor">
          <path
            d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
          />
        </svg>
        <span class="text-sm font-medium">Spotify Results</span>
      </div>
      <div class="max-h-60 overflow-y-auto">
        <button
          v-for="(artist, index) in spotifySearchResults"
          :key="index"
          type="button"
          class="hover:bg-spotify/10 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
          @click="selectArtist(artist, false)"
        >
          <div v-if="artist.ImageUrl" class="avatar">
            <div class="h-10 w-10 rounded-full">
              <img :src="artist.ImageUrl" :alt="artist.ArtistName" />
            </div>
          </div>
          <div v-else class="bg-spotify/20 flex h-10 w-10 items-center justify-center rounded-full">
            <svg viewBox="0 0 24 24" class="text-spotify h-5 w-5" fill="currentColor">
              <path
                d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
              />
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-medium">{{ artist.ArtistName }}</p>
            <p v-if="artist.Genres?.length" class="text-base-content/60 text-xs">
              {{ artist.Genres.slice(0, 3).join(', ') }}
            </p>
          </div>
        </button>
      </div>
      <!-- Manual add option at bottom -->
      <div class="border-spotify/30 border-t px-4 py-3">
        <button
          type="button"
          class="text-base-content/70 text-sm hover:text-base-content"
          @click="createManualArtist"
        >
          Still not found? <span class="underline">Add "{{ artistName }}" manually</span>
        </button>
      </div>
    </div>

    <!-- Spotify Search - No Results -->
    <div
      v-if="
        showSpotifyResults &&
        spotifySearchResults.length === 0 &&
        !isSearchingSpotify &&
        !selectedArtist
      "
      class="border-warning/50 bg-warning/10 rounded-lg border p-4"
    >
      <p class="mb-3 text-sm">
        <strong>No results on Spotify either.</strong> You can add the artist manually:
      </p>
      <button type="button" class="btn-action-solid" @click="createManualArtist">
        <span v-if="artistName">Add "{{ artistName }}" as new artist</span>
        <span v-else>Add as new artist</span>
      </button>
    </div>

    <!-- Selected Artist Card -->
    <div v-if="selectedArtist" class="border-primary/30 bg-primary/5 rounded-lg border p-4">
      <div class="mb-3 flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div v-if="selectedArtist.ImageUrl" class="avatar">
            <div class="h-12 w-12 rounded-full">
              <img :src="selectedArtist.ImageUrl" :alt="selectedArtist.ArtistName" />
            </div>
          </div>
          <div v-else class="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-6 w-6 text-primary"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>
          <div class="flex-1">
            <!-- Show editable name for manually created artists -->
            <div v-if="!isExistingArtist">
              <input
                v-model="selectedArtist.ArtistName"
                type="text"
                placeholder="Enter artist name..."
                :class="['input-primary-sm w-full', validationErrors.artistName && 'input-error']"
              />
              <p v-if="validationErrors.artistName" class="mt-1 text-xs text-error">
                {{ validationErrors.artistName }}
              </p>
            </div>
            <!-- Show static name for existing artists from database/Spotify -->
            <h3 v-else class="font-semibold text-base-content">
              {{ selectedArtist.ArtistName || 'New Artist' }}
            </h3>
          </div>
        </div>
        <button
          type="button"
          title="Clear selection"
          class="btn btn-ghost btn-sm btn-circle"
          @click="clearSelection"
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

      <!-- Warning for manually added artists without streaming URLs -->
      <div
        v-if="isMissingStreamingUrls"
        class="border-warning/50 bg-warning/10 mb-4 flex items-start gap-2 rounded-lg border p-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="mt-0.5 h-5 w-5 shrink-0 text-warning"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <p class="text-sm text-warning-content">
          <strong>Note:</strong> Artists won't appear on NearHear until we have a Spotify or
          Bandcamp link. Add one below if you have it!
        </p>
      </div>

      <!-- Platform Links & Embeds -->
      <div class="mt-4 space-y-4">
        <!-- Spotify -->
        <div v-if="getSpotifyArtistId(selectedArtist)">
          <div class="mb-2 flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="text-spotify h-4 w-4" fill="currentColor">
              <path
                d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
              />
            </svg>
            <span class="text-sm font-medium">Spotify</span>
            <a
              v-if="selectedArtist.SpotifyURL"
              :href="selectedArtist.SpotifyURL"
              target="_blank"
              rel="noopener noreferrer"
              class="text-base-content/60 truncate text-xs hover:underline"
            >
              {{ selectedArtist.SpotifyURL }}
            </a>
          </div>
          <SpotifyPreviewPlayer
            :artist-name="selectedArtist.ArtistName"
            :spotify-artist-id="getSpotifyArtistId(selectedArtist) || ''"
            :preview-urls="[]"
            :width="280"
          />
        </div>

        <!-- Bandcamp -->
        <div v-if="selectedArtist.BandcampURL || selectedArtist.BandcampArtistSlug">
          <div class="mb-2 flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="text-bandcamp h-4 w-4" fill="currentColor">
              <path d="M0 18.75l7.437-13.5H24l-7.438 13.5z" />
            </svg>
            <span class="text-sm font-medium">Bandcamp</span>
            <a
              v-if="selectedArtist.BandcampURL"
              :href="selectedArtist.BandcampURL"
              target="_blank"
              rel="noopener noreferrer"
              class="text-base-content/60 truncate text-xs hover:underline"
            >
              {{ selectedArtist.BandcampArtistSlug || selectedArtist.BandcampURL }}
            </a>
          </div>
          <LazyEmbed
            v-if="hasBandcampAlbums(selectedArtist)"
            :src="`https://bandcamp.com/EmbeddedPlayer/album=${getFirstBandcampAlbumId(selectedArtist)}/size=small/bgcol=ffffff/linkcol=0687f5/tracklist=false/transparent=true/`"
            :width="280"
            :height="80"
            class="rounded-md border-0"
          />
          <p v-else-if="selectedArtist.BandcampArtistSlug" class="text-base-content/60 text-sm">
            {{ selectedArtist.BandcampArtistSlug }}.bandcamp.com
          </p>
        </div>

        <!-- Instagram -->
        <div v-if="selectedArtist.InstagramURL || selectedArtist.InstagramHandle">
          <div class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="text-instagram h-4 w-4" fill="currentColor">
              <path
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
              />
            </svg>
            <span class="text-sm font-medium">Instagram</span>
            <a
              :href="
                selectedArtist.InstagramURL ||
                `https://instagram.com/${selectedArtist.InstagramHandle}`
              "
              target="_blank"
              rel="noopener noreferrer"
              class="text-instagram text-sm hover:underline"
            >
              @{{ getInstagramHandle(selectedArtist) }}
            </a>
          </div>
        </div>
      </div>

      <!-- Missing Info Prompts / Manual Entry Fields -->
      <div
        v-if="hasMissingInfo || !isExistingArtist"
        class="border-base-300/50 mt-4 space-y-3 border-t pt-4"
      >
        <p class="text-base-content/70 text-sm">
          <span v-if="!isExistingArtist">Add artist details:</span>
          <span v-else>Some info is missing. Add what you know:</span>
        </p>

        <!-- Spotify Field - show if missing OR if manual artist -->
        <div v-if="missingInfo.spotify || !isExistingArtist" class="form-control">
          <label class="label py-1">
            <span class="label-text text-sm">Spotify Link</span>
          </label>
          <input
            v-model="manualSpotifyURL"
            type="url"
            placeholder="https://open.spotify.com/artist/..."
            :class="['input-primary-sm', validationErrors.spotify && 'input-error']"
          />
          <p v-if="validationErrors.spotify" class="mt-1 text-xs text-error">
            {{ validationErrors.spotify }}
          </p>
        </div>

        <!-- Bandcamp Field - show if missing OR if manual artist -->
        <div v-if="missingInfo.bandcamp || !isExistingArtist" class="form-control">
          <label class="label py-1">
            <span class="label-text text-sm">Bandcamp Link</span>
          </label>
          <input
            v-model="manualBandcampURL"
            type="url"
            placeholder="https://artistname.bandcamp.com"
            :class="['input-primary-sm', validationErrors.bandcamp && 'input-error']"
          />
          <p v-if="validationErrors.bandcamp" class="mt-1 text-xs text-error">
            {{ validationErrors.bandcamp }}
          </p>
        </div>

        <!-- Instagram Field - show if missing OR if manual artist -->
        <div v-if="missingInfo.instagram || !isExistingArtist" class="form-control">
          <label class="label py-1">
            <span class="label-text text-sm">Instagram Link</span>
          </label>
          <input
            v-model="manualInstagramURL"
            type="url"
            placeholder="https://instagram.com/artisthandle"
            :class="['input-primary-sm', validationErrors.instagram && 'input-error']"
          />
          <p v-if="validationErrors.instagram" class="mt-1 text-xs text-error">
            {{ validationErrors.instagram }}
          </p>
        </div>
      </div>

      <!-- Genres -->
      <div v-if="selectedArtist.Genres?.length" class="mt-3 flex flex-wrap gap-1">
        <span
          v-for="genre in selectedArtist.Genres.slice(0, 5)"
          :key="genre"
          class="badge badge-outline badge-sm"
        >
          {{ genre }}
        </span>
      </div>
    </div>
  </div>
</template>

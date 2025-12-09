<script setup lang="ts">
import { ref, computed } from 'vue';

import ArtistSearch from '@/components/ArtistSearch.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { useAuth } from '@/composables/useAuth';
import type { ArtistInfo } from '@/types/artist';
import { apiFetch } from '@/utils/api';

const { userId } = useAuth();

const artistSearchRef = ref<InstanceType<typeof ArtistSearch>>();
const selectedArtist = ref<ArtistInfo | null>(null);
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);
const submitSuccess = ref(false);

// Check if we should show the submit button
const showSubmitButton = computed(() => {
  if (!selectedArtist.value) return false;
  if (!artistSearchRef.value) return false;

  // Only show if there's missing info that user can fill in
  // AND no validation errors
  return artistSearchRef.value.hasMissingInfo && !artistSearchRef.value.hasValidationErrors;
});

const handleArtistSelected = (artist: ArtistInfo) => {
  selectedArtist.value = artist;
  submitSuccess.value = false;
  submitError.value = null;
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

// Request body type matching Go struct
interface AddArtistFromUserReq {
  UserId: string;
  ArtistName: string;
  SpotifyArtistId: string;
  BandcampUrl: string;
  InstagramHandle: string;
}

const submitArtist = async () => {
  if (!artistSearchRef.value) return;

  const artistData = artistSearchRef.value.getFinalArtistInfo();
  if (!artistData) return;

  isSubmitting.value = true;
  submitError.value = null;
  submitSuccess.value = false;

  try {
    const requestBody: AddArtistFromUserReq = {
      UserId: userId.value || '',
      ArtistName: artistData.ArtistName,
      SpotifyArtistId: artistData.SpotifyArtistId || '',
      BandcampUrl: artistData.BandcampURL || '',
      InstagramHandle: extractInstagramHandle(artistData),
    };

    await apiFetch('/media/upsertArtistFromUser', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    submitSuccess.value = true;
  } catch (err) {
    console.error('Failed to submit artist:', err);
    submitError.value = err instanceof Error ? err.message : 'Failed to add artist';
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  selectedArtist.value = null;
  submitSuccess.value = false;
  submitError.value = null;
};
</script>

<template>
  <section>
    <PageHeader title="Add Artist" />

    <div class="mx-auto mt-8 max-w-xl">
      <p class="text-base-content/70 mb-6">
        Help us grow our database by adding artists you know. Search for an existing artist or add a
        new one with their social links.
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
            <h3 class="font-bold">Artist Added!</h3>
            <p class="text-sm">
              Thank you for contributing. The artist will be reviewed and added to our database.
            </p>
          </div>
        </div>
        <button type="button" class="btn-action-solid mt-4" @click="resetForm">
          Add Another Artist
        </button>
      </div>

      <!-- Artist Search Form -->
      <div v-else class="space-y-6">
        <ArtistSearch
          ref="artistSearchRef"
          v-model="selectedArtist"
          @artist-selected="handleArtistSelected"
        />

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

        <!-- Submit Button - only show if there's missing info to submit -->
        <div v-if="showSubmitButton" class="flex justify-end">
          <button
            type="button"
            class="btn-action-solid"
            :disabled="isSubmitting"
            @click="submitArtist"
          >
            <span v-if="isSubmitting" class="loading loading-spinner loading-sm"></span>
            <span v-else>Submit Artist</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

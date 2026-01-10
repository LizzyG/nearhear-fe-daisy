<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue';

const props = defineProps<{
  artistName: string;
  spotifyArtistId: string;
  previewUrls: string[];
  width?: number;
}>();

// State
const audioRef = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const currentTrackIndex = ref(0);
const progress = ref(0);
const duration = ref(0);
const isLoading = ref(false);
const hasError = ref(false);
const shouldAutoPlay = ref(false); // Track if we should auto-play after loading new track

// Filter out empty/invalid preview URLs
const validPreviewUrls = computed(() => 
  props.previewUrls?.filter(url => url && url.trim() !== '') || []
);

const hasMultipleTracks = computed(() => validPreviewUrls.value.length > 1);

const currentTrackUrl = computed(() => 
  validPreviewUrls.value[currentTrackIndex.value] || null
);

const spotifyArtistUrl = computed(() => 
  `https://open.spotify.com/artist/${props.spotifyArtistId}`
);

const playerWidth = computed(() => props.width ? `${props.width}px` : '280px');

// Format time as mm:ss
const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Playback controls
const togglePlay = () => {
  if (!audioRef.value || !currentTrackUrl.value) return;
  
  if (isPlaying.value) {
    audioRef.value.pause();
  } else {
    // Pause any other playing audio on the page
    document.querySelectorAll('audio').forEach((audio) => {
      if (audio !== audioRef.value) {
        audio.pause();
      }
    });
    audioRef.value.play().catch(() => {
      hasError.value = true;
    });
  }
};

const nextTrack = () => {
  if (!hasMultipleTracks.value) return;
  // If currently playing, set flag to auto-play after new track loads
  shouldAutoPlay.value = isPlaying.value;
  currentTrackIndex.value = (currentTrackIndex.value + 1) % validPreviewUrls.value.length;
};

const prevTrack = () => {
  if (!hasMultipleTracks.value) return;
  // If currently playing, set flag to auto-play after new track loads
  shouldAutoPlay.value = isPlaying.value;
  currentTrackIndex.value = currentTrackIndex.value === 0 
    ? validPreviewUrls.value.length - 1 
    : currentTrackIndex.value - 1;
};

// Progress bar click to seek
const seekToPosition = (event: MouseEvent) => {
  if (!audioRef.value || !duration.value) return;
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickPosition = (event.clientX - rect.left) / rect.width;
  audioRef.value.currentTime = clickPosition * duration.value;
};

// Audio event handlers
const onTimeUpdate = () => {
  if (audioRef.value) {
    progress.value = audioRef.value.currentTime;
  }
};

const onLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration;
    isLoading.value = false;
  }
};

const onPlay = () => {
  isPlaying.value = true;
};

const onPause = () => {
  isPlaying.value = false;
};

const onEnded = () => {
  isPlaying.value = false;
  progress.value = 0;
  // Auto-advance to next track if available
  if (hasMultipleTracks.value) {
    shouldAutoPlay.value = true; // Auto-play after track loads
    currentTrackIndex.value = (currentTrackIndex.value + 1) % validPreviewUrls.value.length;
  }
};

const onWaiting = () => {
  isLoading.value = true;
};

const onCanPlay = () => {
  isLoading.value = false;
  // Auto-play if we were playing when track changed
  if (shouldAutoPlay.value && audioRef.value) {
    shouldAutoPlay.value = false;
    audioRef.value.play().catch(() => {
      hasError.value = true;
    });
  }
};

const onError = () => {
  hasError.value = true;
  isLoading.value = false;
};

// Reset state when track changes
watch(currentTrackUrl, () => {
  progress.value = 0;
  duration.value = 0;
  hasError.value = false;
  isLoading.value = true;
});

// Cleanup
onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause();
  }
});

// Progress percentage for progress bar
const progressPercent = computed(() => {
  if (!duration.value) return 0;
  return (progress.value / duration.value) * 100;
});
</script>

<template>
  <div 
    class="spotify-preview-player rounded-lg border border-spotify/30 bg-base-300 p-3"
    :style="{ width: playerWidth }"
  >
    <!-- Hidden audio element -->
    <audio
      v-if="currentTrackUrl"
      ref="audioRef"
      :src="currentTrackUrl"
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @waiting="onWaiting"
      @canplay="onCanPlay"
      @error="onError"
    />

    <!-- Error state -->
    <div v-if="hasError || !currentTrackUrl" class="flex flex-col items-center gap-2 py-1">
      <span class="text-base-content/60 text-xs">Preview unavailable</span>
      <a
        :href="spotifyArtistUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="text-spotify flex items-center gap-1 text-sm font-medium hover:underline"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        Listen on Spotify
      </a>
    </div>

    <!-- Player UI -->
    <div v-else class="flex flex-col gap-2">
      <!-- Controls row -->
      <div class="flex items-center gap-2">
        <!-- Track navigation (prev) -->
        <button
          v-if="hasMultipleTracks"
          type="button"
          class="text-base-content/60 hover:text-base-content btn btn-ghost btn-xs btn-circle"
          title="Previous track"
          @click="prevTrack"
        >
          <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <!-- Play/Pause button -->
        <button
          type="button"
          class="bg-spotify hover:bg-spotify-hover btn btn-circle btn-sm text-white"
          :title="isPlaying ? 'Pause' : 'Play'"
          :disabled="isLoading"
          @click="togglePlay"
        >
          <!-- Loading spinner -->
          <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
          <!-- Pause icon -->
          <svg v-else-if="isPlaying" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
          <!-- Play icon -->
          <svg v-else class="h-4 w-4 pl-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>

        <!-- Track navigation (next) -->
        <button
          v-if="hasMultipleTracks"
          type="button"
          class="text-base-content/60 hover:text-base-content btn btn-ghost btn-xs btn-circle"
          title="Next track"
          @click="nextTrack"
        >
          <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        <!-- Progress bar -->
        <div 
          class="flex flex-1 cursor-pointer items-center gap-2"
          @click="seekToPosition"
        >
          <div class="bg-base-content/20 relative h-1.5 flex-1 overflow-hidden rounded-full">
            <div 
              class="bg-spotify absolute left-0 top-0 h-full rounded-full transition-all duration-100"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>

        <!-- Time display -->
        <span class="text-base-content/60 min-w-[70px] text-right text-xs tabular-nums">
          {{ formatTime(progress) }} / {{ formatTime(duration) }}
        </span>
      </div>

      <!-- Track indicator and Spotify link -->
      <div class="flex items-center justify-between">
        <span v-if="hasMultipleTracks" class="text-base-content/50 text-xs">
          Track {{ currentTrackIndex + 1 }} of {{ validPreviewUrls.length }}
        </span>
        <span v-else class="text-base-content/50 text-xs">Preview</span>
        
        <a
          :href="spotifyArtistUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-spotify flex items-center gap-1 text-xs hover:underline"
        >
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          More on Spotify
        </a>
      </div>
    </div>
  </div>
</template>


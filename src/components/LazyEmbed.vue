<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  src: string;
  width?: string | number;
  height?: string | number;
  class?: string;
  fallbackText?: string;
  fallbackUrl?: string;
}>();

const containerRef = ref<HTMLElement | null>(null);
const isVisible = ref(false);
const hasError = ref(false);
const isLoaded = ref(false);
let observer: IntersectionObserver | null = null;
let loadTimeout: ReturnType<typeof setTimeout> | null = null;

// Extract service name from URL for friendly fallback
const serviceName = computed(() => {
  if (props.src.includes('spotify.com')) return 'Spotify';
  if (props.src.includes('bandcamp.com')) return 'Bandcamp';
  return 'this service';
});

// Generate a direct link to the content
const directLink = computed(() => {
  if (props.fallbackUrl) return props.fallbackUrl;
  
  // Extract Spotify artist ID and create direct link
  const spotifyMatch = props.src.match(/embed\/artist\/([a-zA-Z0-9]+)/);
  if (spotifyMatch) {
    return `https://open.spotify.com/artist/${spotifyMatch[1]}`;
  }
  
  // Extract Bandcamp album ID - harder to link directly, so just use bandcamp.com
  if (props.src.includes('bandcamp.com')) {
    return 'https://bandcamp.com';
  }
  
  return null;
});

const handleLoad = () => {
  isLoaded.value = true;
  if (loadTimeout) {
    clearTimeout(loadTimeout);
  }
};

const handleError = () => {
  hasError.value = true;
};

onMounted(() => {
  if (!containerRef.value) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true;
          // Set a timeout - if iframe doesn't load in 10s, show fallback
          loadTimeout = setTimeout(() => {
            if (!isLoaded.value) {
              hasError.value = true;
            }
          }, 10000);
          // Once visible, stop observing
          observer?.disconnect();
        }
      });
    },
    {
      rootMargin: '100px', // Start loading 100px before it comes into view
      threshold: 0,
    }
  );

  observer.observe(containerRef.value);
});

onUnmounted(() => {
  observer?.disconnect();
  if (loadTimeout) {
    clearTimeout(loadTimeout);
  }
});
</script>

<template>
  <div ref="containerRef">
    <!-- Loaded iframe -->
    <iframe
      v-if="isVisible && !hasError"
      :src="props.src"
      :width="props.width"
      :height="props.height"
      :class="props.class"
      frameborder="0"
      allowtransparency="true"
      allow="encrypted-media"
      loading="lazy"
      @load="handleLoad"
      @error="handleError"
    ></iframe>
    
    <!-- Error/fallback state -->
    <div
      v-else-if="hasError"
      :style="{
        width: typeof props.width === 'number' ? `${props.width}px` : props.width,
        height: typeof props.height === 'number' ? `${props.height}px` : props.height,
      }"
      :class="props.class"
      class="bg-base-200 rounded-md flex items-center justify-center p-3"
    >
      <a
        v-if="directLink"
        :href="directLink"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary hover:underline text-sm font-medium text-center"
      >
        {{ props.fallbackText || `Listen on ${serviceName} →` }}
      </a>
      <span v-else class="text-base-content/60 text-sm text-center">
        {{ props.fallbackText || `Preview unavailable` }}
      </span>
    </div>
    
    <!-- Loading placeholder -->
    <div
      v-else
      :style="{
        width: typeof props.width === 'number' ? `${props.width}px` : props.width,
        height: typeof props.height === 'number' ? `${props.height}px` : props.height,
      }"
      :class="props.class"
      class="bg-base-300 animate-pulse rounded-md"
    ></div>
  </div>
</template>


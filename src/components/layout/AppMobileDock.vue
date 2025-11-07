<script setup lang="ts">
import { useRoute } from 'vue-router';

import { primaryNavigation } from '../../router/routes';

const route = useRoute();

const isActive = (name: string) => route.name === name;
</script>

<template>
  <div
    class="dock dock-bottom inset-x-0 flex border-t border-surface-base300/70 bg-surface-base200/95 shadow-lg md:hidden"
  >
    <RouterLink
      v-for="link in primaryNavigation"
      :key="link.name"
      :to="link.to"
      class="dock-item flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-center text-[11px] uppercase tracking-wide transition-colors"
      :class="[
        isActive(link.name)
          ? 'dock-active'
          : 'text-content-onNeutral/80 hover:text-brand-primary/70'
      ]"
    >
      <img v-if="link.icon" :src="link.icon" :alt="`${link.label} icon`" class="h-5 w-5" />
      <span class="whitespace-normal break-words leading-snug">{{ link.label }}</span>
    </RouterLink>
  </div>
</template>


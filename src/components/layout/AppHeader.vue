<script setup lang="ts">
import { useRoute } from 'vue-router';

import { primaryNavigation } from '../../router/routes';
import logoUrl from '../../assets/nh-h-c.svg';

const route = useRoute();

const isActive = (name: string) => route.name === name;
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-surface-base300/70 bg-surface-base200/80 backdrop-blur"
  >
    <div class="container mx-auto px-4">
      <div class="flex items-center gap-4 py-3">
        <RouterLink to="/" aria-label="Home" class="flex items-center -my-2 pr-3">
          <img :src="logoUrl" alt="NearHear logo" class="h-16 w-auto" />
        </RouterLink>

        <nav class="ml-auto hidden lg:flex">
          <div class="flex items-center gap-4 text-sm font-medium uppercase tracking-wide">
            <RouterLink
              v-for="link in primaryNavigation"
              :key="link.name"
              :to="link.to"
              class="flex items-center gap-2 border-b-2 border-transparent px-1 pb-1 pt-2 transition-colors"
              :class="[
                isActive(link.name)
                  ? 'border-brand-primary text-brand-primary'
                  : 'text-content-onNeutral/80 hover:border-brand-primary/40 hover:text-brand-primary',
              ]"
            >
              <img v-if="link.icon" :src="link.icon" :alt="`${link.label} icon`" class="h-5 w-5" />
              <span class="font-medium leading-none">{{ link.label }}</span>
            </RouterLink>
          </div>
        </nav>

        <span class="hidden w-10 lg:block" />
      </div>
    </div>
  </header>
</template>

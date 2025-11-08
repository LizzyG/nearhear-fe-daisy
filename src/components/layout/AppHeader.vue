<script setup lang="ts">
import { useRoute } from 'vue-router';

import { primaryNavigation } from '../../router/routes';
import logoUrl from '../../assets/nh-h-c.svg';

const route = useRoute();

const isActive = (name: string) => route.name === name;

const navLinkClasses = (name: string) => {
  const base =
    'relative flex items-center gap-2 border-b-2 border-transparent px-1 pb-2 pt-2 transition-colors';

  if (isActive(name)) {
    return `${base} text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary after:content-['']`;
  }

  return `${base} text-base-content/70 hover:text-primary hover:border-primary/50`;
};
</script>

<template>
  <header class="border-base-300/60 bg-base-200/80 sticky top-0 z-40 border-b backdrop-blur">
    <div class="container mx-auto px-4">
      <div class="flex items-center gap-4 py-3">
        <RouterLink to="/" aria-label="Home" class="-my-2 flex items-center pr-3">
          <img :src="logoUrl" alt="NearHear logo" class="h-16 w-auto" />
        </RouterLink>

        <nav class="ml-auto hidden lg:flex">
          <div class="flex items-center gap-4 text-sm font-medium uppercase tracking-wide">
            <RouterLink
              v-for="link in primaryNavigation"
              :key="link.name"
              :to="link.to"
              :class="navLinkClasses(link.name)"
              :aria-current="isActive(link.name) ? 'page' : undefined"
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

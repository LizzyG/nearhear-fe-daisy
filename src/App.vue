<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';

import AppFooter from '@/components/layout/AppFooter.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppMobileDock from '@/components/layout/AppMobileDock.vue';
</script>

<template>
  <div class="flex min-h-screen flex-col bg-base-100 text-base-content">
    <!-- Desktop header (hidden on mobile) -->
    <AppHeader />
    <!-- Mobile header with logo only -->
    <div class="border-base-300/60 bg-base-200/80 sticky top-0 z-40 border-b backdrop-blur md:hidden">
      <div class="container mx-auto px-4">
        <div class="flex items-center gap-4 py-3">
          <RouterLink to="/" aria-label="Home" class="-my-2 flex items-center pr-3">
            <img src="@/assets/nh-h-c.svg" alt="NearHear logo" class="h-16 w-auto" />
          </RouterLink>
        </div>
      </div>
    </div>
    <main class="container flex-1 px-4 pb-20 pt-4 md:pb-10 md:pt-6">
      <RouterView />
    </main>
    <AppFooter />
    <AppMobileDock />
  </div>
</template>

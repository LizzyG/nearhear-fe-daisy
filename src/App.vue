<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppFooter from '@/components/layout/AppFooter.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppMobileDock from '@/components/layout/AppMobileDock.vue';
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface-base100 text-content-onNeutral">
    <AppHeader />
    <main class="container mx-auto w-full flex-1 px-4 pb-28 pt-10 md:pb-10">
      <RouterView />
    </main>
    <AppFooter />
    <AppMobileDock />
  </div>
</template>

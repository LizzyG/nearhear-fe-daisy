<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppFooter from '@/components/layout/AppFooter.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppMobileDock from '@/components/layout/AppMobileDock.vue';
</script>

<template>
  <div class="flex min-h-screen flex-col bg-base-100 text-base-content">
    <AppHeader />
    <main class="container flex-1 px-4 pb-28 pt-10 md:pb-10">
      <RouterView />
    </main>
    <AppFooter />
    <AppMobileDock />
  </div>
</template>

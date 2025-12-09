<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PageHeader',
  props: {
    title: {
      type: String,
      required: true,
    },
  },
});
</script>

<template>
  <header class="mb-8 mt-6 text-center">
    <h1 class="text-3xl font-medium tracking-tight text-primary md:text-4xl">
      {{ title }}
    </h1>
    <div class="mx-auto mt-3 h-1 w-16 rounded-full bg-primary"></div>
    <slot />
  </header>
</template>

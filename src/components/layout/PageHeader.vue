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
  <header class="mt-4 mb-4">
    <h1 class="text-3xl font-semibold text-base-content md:text-4xl">
      {{ title }}
    </h1>
    <slot />
  </header>
</template>

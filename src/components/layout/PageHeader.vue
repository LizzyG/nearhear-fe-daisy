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
  <header>
    <h1 class="text-3xl font-semibold text-content-onNeutral md:text-4xl">
      {{ title }}
    </h1>
    <slot />
  </header>
</template>

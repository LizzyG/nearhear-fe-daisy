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
  <header class="mb-4 mt-4">
    <h1 class="heading-page">{{ title }}</h1>
    <slot />
  </header>
</template>

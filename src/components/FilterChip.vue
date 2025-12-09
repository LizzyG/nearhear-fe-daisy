<script setup lang="ts">
defineProps<{
  label: string;
}>();

defineEmits<{
  remove: [];
}>();
</script>

<template>
  <button
    type="button"
    class="badge badge-primary badge-lg cursor-pointer gap-2"
    @click="$emit('remove')"
  >
    <span>{{ label }}</span>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="2"
      stroke="currentColor"
      class="h-4 w-4"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</template>


<script setup lang="ts">
defineProps<{
  label: string;
}>();

defineEmits<{
  remove: [];
}>();
</script>

<template>
  <div
    class="badge badge-primary badge-lg gap-2 cursor-pointer"
    @click="$emit('remove')"
  >
    <span>{{ label }}</span>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      class="inline-block w-4 h-4 stroke-current"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M6 18L18 6M6 6l12 12"
      ></path>
    </svg>
  </div>
</template>


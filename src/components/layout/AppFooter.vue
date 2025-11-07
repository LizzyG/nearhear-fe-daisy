<script setup lang="ts">
const footerLinks = [
  { label: 'FAQ', href: '#' },
  { label: 'About Us', href: '#' },
  { label: 'Mailing List', href: '#' },
];
</script>

<template>
  <footer class="border-t border-surface-base300/70 bg-surface-base200/70 ">
    <nav class="container mx-auto flex flex-wrap justify-center gap-8 px-4 py-1 text-center text-sm justify-evenly">
      <a
        v-for="link in footerLinks"
        :key="link.label"
        :href="link.href"
        class="link-hover text-content-onNeutral/80 transition-colors hover:text-brand-secondary"
      >
        {{ link.label }}
      </a>
    </nav>
  </footer>
</template>

<script setup lang="ts">
const footerLinks = [
  { label: 'FAQ', href: '#' },
  { label: 'About Us', href: '#' },
  { label: 'Mailing List', href: '#' },
];
</script>

<template>
  <footer class="hidden border-base-300/60 bg-base-200/70 border-t md:block">
    <nav class="container flex flex-wrap justify-evenly gap-8 px-4 py-3 text-center text-sm">
      <a
        v-for="link in footerLinks"
        :key="link.label"
        :href="link.href"
        class="text-base-content/80 link link-hover transition-colors hover:text-secondary"
      >
        {{ link.label }}
      </a>
    </nav>
  </footer>
</template>

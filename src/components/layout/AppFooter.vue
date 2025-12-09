<script setup lang="ts">
const footerLinks = [
  { label: 'FAQ', to: '/faq' },
  { label: 'About Us', to: '/about' },
  { label: 'Mailing List', to: '/mailing-list' },
];
</script>

<template>
  <footer class="sticky bottom-0 z-30 hidden border-t border-base-300 bg-base-200 md:block">
    <nav class="container flex flex-wrap justify-evenly gap-8 px-4 py-3 text-center text-sm">
      <RouterLink
        v-for="link in footerLinks"
        :key="link.label"
        :to="link.to"
        class="text-base-content/80 link link-hover transition-colors hover:text-secondary"
      >
        {{ link.label }}
      </RouterLink>
    </nav>
  </footer>
</template>

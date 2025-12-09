<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
</script>

<template>
  <section>
    <PageHeader title="About Us (Me)" />

    <div class="mx-auto mt-8 max-w-2xl">
      <!-- Main About Section -->
      <div class="prose prose-lg max-w-none">
        <p class="text-base-content/90 text-lg leading-relaxed">
          NearHear is me, Liz. I live in Portland and like going to shows and writing software. I
          made NearHear because I wanted it to exist. I don't make money doing this, so if you like
          it and have spare cash you can Venmo me to help with costs. Thoughts, questions, etc can
          be sent to
          <a href="mailto:feedback@nearhear.app" class="link-primary">feedback@nearhear.app</a>.
        </p>

        <p class="text-base-content/90 mt-6 text-lg leading-relaxed">
          Shout out to my husband, Dan, who has contributed a TON to this, from making the original
          front end, to brainstorming and being my number one user. He's the best.
        </p>
      </div>

      <!-- Action Cards -->
      <div class="mt-10 grid gap-4 sm:grid-cols-2">
        <!-- Venmo Card -->
        <a
          href="https://www.venmo.com/u/Elizabeth-Gabriel-38"
          target="_blank"
          rel="noopener noreferrer"
          class="group flex items-center gap-4 rounded-xl border border-base-300 bg-base-100 p-5 transition-all hover:border-primary hover:shadow-md"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[#008CFF]/10">
            <svg viewBox="0 0 24 24" class="h-6 w-6 text-[#008CFF]" fill="currentColor">
              <path
                d="M19.27 3c.94 1.56 1.37 3.16 1.37 5.2 0 6.48-5.53 14.9-10.02 20.8H3.04L.09 4.78l7.6-.7 1.84 14.74c1.71-2.79 3.84-7.18 3.84-10.17 0-1.94-.33-3.26-.94-4.35L19.27 3z"
              />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-base-content group-hover:text-primary">Support NearHear</h3>
            <p class="text-sm text-base-content/60">Buy me a coffee via Venmo</p>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-5 w-5 text-base-content/40 transition-transform group-hover:translate-x-1 group-hover:text-primary"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </a>

        <!-- Email Card -->
        <a
          href="mailto:feedback@nearhear.app"
          class="group flex items-center gap-4 rounded-xl border border-base-300 bg-base-100 p-5 transition-all hover:border-primary hover:shadow-md"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-6 w-6 text-primary"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-base-content group-hover:text-primary">Get in Touch</h3>
            <p class="text-sm text-base-content/60">feedback@nearhear.app</p>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-5 w-5 text-base-content/40 transition-transform group-hover:translate-x-1 group-hover:text-primary"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </a>
      </div>

      <!-- Heart -->
      <div class="mt-12 text-center">
        <span class="text-4xl">💜</span>
      </div>
    </div>
  </section>
</template>


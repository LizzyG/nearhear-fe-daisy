<script setup lang="ts">
import { useRoute } from 'vue-router';

import { desktopNavItems } from '../../navigation/menu';
import logoUrl from '../../assets/nh-h-c.svg';
import userIcon from '../../assets/icons/user.svg';
import plusIcon from '../../assets/icons/plus.svg';

const route = useRoute();

const isActive = (name: string) => route.name === name;

const navLinkClasses = (name: string) => {
  const base =
    'btn btn-ghost rounded-b-none rounded-t-xl h-12 px-4 normal-case text-sm font-medium tracking-wide gap-2 border-b-2 border-transparent';

  if (isActive(name)) {
    return `${base} btn-active text-primary border-primary bg-base-100`;
  }

  return `${base} text-base-content/70 hover:text-primary hover:bg-base-100/60`;
};
</script>

<template>
  <header class="bg-base-200 sticky top-0 z-40 border-b border-base-300 shadow-md hidden md:block">
    <div class="container mx-auto px-3">
      <div class="navbar py-2 min-h-[4.5rem]">
        <div class="flex-1">
          <RouterLink to="/" aria-label="Home" class="flex items-center pr-2">
            <img :src="logoUrl" alt="NearHear logo" class="h-16 w-auto" />
          </RouterLink>
        </div>

        <!-- Main navigation items -->
        <nav class="flex-none">
          <div class="flex items-end gap-1">
            <RouterLink
              v-for="link in desktopNavItems"
              :key="link.name"
              :to="link.path"
              :class="navLinkClasses(link.name)"
              :aria-current="isActive(link.name) ? 'page' : undefined"
            >
              <img v-if="link.icon" :src="link.icon" :alt="`${link.label} icon`" class="h-5 w-5" />
              <span class="font-medium leading-none">{{ link.label }}</span>
            </RouterLink>

            <!-- Add Events -->
            <RouterLink
              to="/add-events"
              :class="navLinkClasses('add-events')"
              :aria-current="isActive('add-events') ? 'page' : undefined"
            >
              <img :src="plusIcon" alt="Add Events icon" class="h-5 w-5" />
              <span class="font-medium leading-none">Add Events</span>
            </RouterLink>

            <!-- Profile -->
            <RouterLink
              to="/profile"
              :class="navLinkClasses('profile')"
              :aria-current="isActive('profile') ? 'page' : undefined"
            >
              <img :src="userIcon" alt="Profile icon" class="h-5 w-5" />
              <span class="font-medium leading-none">Profile</span>
            </RouterLink>
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>

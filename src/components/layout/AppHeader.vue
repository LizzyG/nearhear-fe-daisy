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
    'relative flex items-center gap-2 border-b-2 border-transparent px-1 pb-2 pt-2 transition-colors';

  if (isActive(name)) {
    return `${base} text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary after:content-['']`;
  }

  return `${base} text-base-content/70 hover:text-primary hover:border-primary/50`;
};
</script>

<template>
  <header class="border-base-300/60 bg-base-200/80 sticky top-0 z-40 border-b backdrop-blur hidden md:block">
    <div class="container mx-auto px-4">
      <div class="navbar">
        <div class="flex-1">
          <RouterLink to="/" aria-label="Home" class="-my-2 flex items-center pr-3">
            <img :src="logoUrl" alt="NearHear logo" class="h-16 w-auto" />
          </RouterLink>
        </div>

        <!-- Main navigation items -->
        <nav class="flex-none">
          <div class="flex items-center gap-4 text-sm font-medium uppercase tracking-wide">
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

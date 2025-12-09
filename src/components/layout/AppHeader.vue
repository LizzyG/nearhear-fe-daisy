<script setup lang="ts">
import { useRoute } from 'vue-router';

import { desktopNavItems, addMenuItems, addIcon } from '../../navigation/menu';
import logoUrl from '../../assets/nh-h-c.svg';
import userIcon from '../../assets/icons/user.svg';

const route = useRoute();

const isActive = (name: string) => route.name === name;
const isAddActive = () => addMenuItems.some((item) => route.name === item.name);
</script>

<template>
  <header class="sticky top-0 z-40 hidden border-b border-base-300 bg-base-200 shadow-md md:block">
    <div class="container mx-auto px-3">
      <div class="navbar min-h-[4.5rem] py-2">
        <div class="flex-1">
          <RouterLink to="/" aria-label="Home" class="flex items-center pr-2">
            <img :src="logoUrl" alt="NearHear logo" class="h-16 w-auto" />
          </RouterLink>
        </div>

        <!-- Main navigation items -->
        <nav class="flex-none">
          <div role="tablist" class="tabs tabs-border">
            <RouterLink
              v-for="link in desktopNavItems"
              :key="link.name"
              :to="link.path"
              role="tab"
              :class="['tab h-12 gap-2', isActive(link.name) && 'tab-active']"
              :aria-current="isActive(link.name) ? 'page' : undefined"
            >
              <img v-if="link.icon" :src="link.icon" :alt="`${link.label} icon`" class="h-5 w-5" />
              <span class="font-medium">{{ link.label }}</span>
            </RouterLink>

            <!-- Add Dropdown -->
            <div class="dropdown dropdown-end">
              <div
                tabindex="0"
                role="tab"
                :class="[
                  'tab h-12 cursor-pointer gap-2 text-primary hover:text-secondary',
                  isAddActive() && 'tab-active',
                ]"
              >
                <img :src="addIcon" alt="Add icon" class="h-5 w-5" />
                <span class="font-medium">Add</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="h-3 w-3"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </div>
              <ul
                tabindex="0"
                class="dropdown-content menu z-50 mt-2 w-44 rounded-lg border border-base-300 bg-base-100 p-2 shadow-lg"
              >
                <li v-for="item in addMenuItems" :key="item.name">
                  <RouterLink :to="item.path" :class="[isActive(item.name) && 'active']">
                    {{ item.label }}
                  </RouterLink>
                </li>
              </ul>
            </div>

            <!-- Profile -->
            <RouterLink
              to="/profile"
              role="tab"
              :class="['tab h-12 gap-2', isActive('profile') && 'tab-active']"
              :aria-current="isActive('profile') ? 'page' : undefined"
            >
              <img :src="userIcon" alt="Profile icon" class="h-5 w-5" />
              <span class="font-medium">Profile</span>
            </RouterLink>
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>

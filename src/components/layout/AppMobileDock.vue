<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { mobileBottomNavItems, moreMenuItems } from '../../navigation/menu';

const route = useRoute();
const router = useRouter();

const isDrawerOpen = ref(false);

const isActive = (name: string) => route.name === name;

const toggleDrawer = () => {
  isDrawerOpen.value = !isDrawerOpen.value;
};

const closeDrawer = () => {
  isDrawerOpen.value = false;
};

const handleMoreMenuItemClick = (item: { path?: string; action?: () => void }) => {
  if (item.path) {
    router.push(item.path);
  } else if (item.action) {
    item.action();
  }
  closeDrawer();
};
</script>

<template>
  <!-- Mobile Bottom Navigation -->
  <div
    class="dock dock-bottom inset-x-0 flex border-t border-base-300/70 bg-base-200/95 shadow-lg md:hidden"
  >
    <!-- Main 4 navigation items -->
    <RouterLink
      v-for="link in mobileBottomNavItems"
      :key="link.name"
      :to="link.path"
      class="dock-item flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-center text-[11px] uppercase tracking-wide transition-colors"
      :class="[
        isActive(link.name)
          ? 'dock-active text-primary'
          : 'text-base-content/80 hover:text-primary/70'
      ]"
    >
      <img v-if="link.icon" :src="link.icon" :alt="`${link.label} icon`" class="h-5 w-5" />
      <span class="whitespace-normal break-words leading-snug">{{ link.label }}</span>
    </RouterLink>

    <!-- More button -->
    <button
      type="button"
      class="dock-item flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-center text-[11px] uppercase tracking-wide transition-colors text-base-content/80 hover:text-primary/70"
      :class="{ 'dock-active text-primary': isDrawerOpen }"
      @click="toggleDrawer"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="h-5 w-5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
      <span class="whitespace-normal break-words leading-snug">More</span>
    </button>
  </div>

  <!-- Drawer for More menu -->
  <div class="drawer drawer-end md:hidden">
    <input
      id="more-drawer"
      v-model="isDrawerOpen"
      type="checkbox"
      class="drawer-toggle"
    />
    <div class="drawer-side z-50">
      <label
        for="more-drawer"
        class="drawer-overlay"
        @click="closeDrawer"
      ></label>
      <div class="min-h-full w-screen bg-base-200 p-4 text-base-content">
        <!-- Close button in top right -->
        <div class="flex justify-end mb-4">
          <button
            type="button"
            class="btn btn-ghost btn-square"
            @click="closeDrawer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="h-6 w-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <!-- Menu items -->
        <ul class="menu text-lg">
          <li
            v-for="item in moreMenuItems"
            :key="item.name"
          >
            <a
              v-if="item.path"
              class="py-4 text-lg"
              @click.prevent="handleMoreMenuItemClick(item)"
            >
              {{ item.label }}
            </a>
            <button
              v-else-if="item.action"
              type="button"
              class="py-4 text-lg text-left w-full"
              @click="handleMoreMenuItemClick(item)"
            >
              {{ item.label }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>



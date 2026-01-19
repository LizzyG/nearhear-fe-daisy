<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { mobileBottomNavItems, moreMenuItems, addMenuItems, addIcon } from '../../navigation/menu';
import { useIsApp } from '../../composables/useIsApp';

const { isApp } = useIsApp();

const route = useRoute();
const router = useRouter();

const isDrawerOpen = ref(false);
const isAddMenuOpen = ref(false);

const isActive = (name: string) => route.name === name;
const isAddActive = () => addMenuItems.some((item) => route.name === item.name);

const toggleDrawer = () => {
  isDrawerOpen.value = !isDrawerOpen.value;
  isAddMenuOpen.value = false;
};

const closeDrawer = () => {
  isDrawerOpen.value = false;
};

const toggleAddMenu = () => {
  isAddMenuOpen.value = !isAddMenuOpen.value;
};

const handleAddMenuClick = (path: string) => {
  void router.push(path);
  isAddMenuOpen.value = false;
};

const handleMoreMenuItemClick = (item: { path?: string; action?: () => void }) => {
  if (item.path) {
    void router.push(item.path);
  } else if (item.action) {
    item.action();
  }
  closeDrawer();
};
</script>

<template>
  <!-- Add Menu Popup -->
  <Teleport to="body">
    <div v-if="isAddMenuOpen" class="fixed inset-0 z-[60] md:hidden" @click="isAddMenuOpen = false">
      <div
        class="absolute left-1/2 w-48 -translate-x-1/2 rounded-t-lg border border-b-0 border-base-300 bg-base-100 shadow-xl"
        :style="{ bottom: isApp ? '5.25rem' : '3.75rem' }"
        @click.stop
      >
        <ul class="menu p-2">
          <li v-for="item in addMenuItems" :key="item.name">
            <button
              type="button"
              class="py-3"
              :class="[isActive(item.name) && 'active']"
              @click="handleAddMenuClick(item.path)"
            >
              {{ item.label }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </Teleport>

  <!-- Mobile Bottom Navigation -->
  <div class="fixed inset-x-0 bottom-0 z-40">
    <nav class="dock dock-bottom border-base-300/70 bg-base-200/95 inset-x-0 flex border-t shadow-lg md:hidden">
      <!-- Main navigation items -->
      <RouterLink
        v-for="link in mobileBottomNavItems"
        :key="link.name"
        :to="link.path"
        class="dock-item flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-center text-[11px] uppercase tracking-wide transition-colors"
        :class="[
          isActive(link.name)
            ? 'dock-active text-primary'
            : 'text-base-content/80 hover:text-primary/70',
        ]"
      >
        <img v-if="link.icon" :src="link.icon" :alt="`${link.label} icon`" class="h-5 w-5" />
        <span class="whitespace-normal break-words leading-snug">{{ link.label }}</span>
      </RouterLink>

      <!-- Add button -->
      <button
        type="button"
        class="dock-item flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-center text-[11px] uppercase tracking-wide transition-colors"
        :class="[
          isAddActive() || isAddMenuOpen
            ? 'dock-active text-primary'
            : 'text-base-content/80 hover:text-primary/70',
        ]"
        @click="toggleAddMenu"
      >
        <img :src="addIcon" alt="Add icon" class="h-5 w-5" />
        <span class="whitespace-normal break-words leading-snug">Add</span>
      </button>

      <!-- More button -->
      <button
        type="button"
        class="dock-item text-base-content/80 hover:text-primary/70 flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-center text-[11px] uppercase tracking-wide transition-colors"
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
    </nav>
    <!-- iOS safe area spacer retains background without shifting dock content -->
    <div v-if="isApp" class="h-8 bg-base-200/95 border-t border-base-300/70"></div>
  </div>

  <!-- Drawer for More menu -->
  <div class="drawer drawer-end md:hidden">
    <input id="more-drawer" v-model="isDrawerOpen" type="checkbox" class="drawer-toggle" />
    <div class="drawer-side z-50">
      <label for="more-drawer" class="drawer-overlay" @click="closeDrawer"></label>
      <div class="min-h-full w-screen bg-base-200 p-4 text-base-content">
        <!-- Close button in top right -->
        <div class="mb-4 flex justify-end">
          <button type="button" class="btn btn-ghost btn-square" @click="closeDrawer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="h-6 w-6"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <!-- Menu items -->
        <ul class="menu text-lg">
          <li v-for="item in moreMenuItems" :key="item.name">
            <a v-if="item.path" class="py-4 text-lg" @click.prevent="handleMoreMenuItemClick(item)">
              {{ item.label }}
            </a>
            <button
              v-else-if="item.action"
              type="button"
              class="w-full py-4 text-left text-lg"
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

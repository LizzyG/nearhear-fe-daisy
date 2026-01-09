<script setup lang="ts">
import { ref } from 'vue';

const filterQuery = ref('');

// Placeholder data structure
const users = ref<{ id: string; email: string; createdAt: string; isActive: boolean }[]>([]);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="heading-section">Manage Users</h2>
        <p class="text-base-content/60 mt-1 text-sm">View and manage user accounts.</p>
      </div>

      <button class="btn-action-solid w-full md:w-auto">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="mr-2 h-4 w-4"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add User
      </button>
    </div>

    <!-- Filter -->
    <div class="form-control max-w-md">
      <input
        v-model="filterQuery"
        type="text"
        class="input-primary"
        placeholder="Filter users by email..."
      />
    </div>

    <!-- Users Table -->
    <div class="overflow-x-auto rounded-lg border border-base-300">
      <table class="table w-full">
        <thead class="bg-base-200">
          <tr>
            <th class="text-base-content">Email</th>
            <th class="text-base-content">Created</th>
            <th class="text-base-content">Status</th>
            <th class="text-base-content">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="users.length === 0">
            <td colspan="4" class="text-base-content/60 py-8 text-center">No users to display.</td>
          </tr>
          <tr v-for="user in users" :key="user.id" class="hover:bg-base-200">
            <td>{{ user.email }}</td>
            <td>{{ user.createdAt }}</td>
            <td>
              <span :class="['badge badge-sm', user.isActive ? 'badge-success' : 'badge-error']">
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td>
              <div class="flex gap-2">
                <button class="btn btn-ghost btn-sm">Edit</button>
                <button class="btn btn-ghost btn-sm text-error">Disable</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>



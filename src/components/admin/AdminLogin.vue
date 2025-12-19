<script setup lang="ts">
import { ref } from 'vue';

import { useAdminAuth } from '@/composables/useAdminAuth';

const emit = defineEmits<{
  success: [];
  cancel: [];
}>();

const { login } = useAdminAuth();

const username = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMessage = ref('');

const handleSubmit = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = 'Please enter both username and password';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  const result = await login(username.value, password.value);

  isLoading.value = false;

  if (result.success) {
    emit('success');
  } else {
    errorMessage.value = result.error || 'Login failed';
  }
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <div class="w-full max-w-md">
      <div class="card border border-base-300 bg-base-100 shadow-lg">
        <div class="card-body p-8">
          <!-- Header -->
          <div class="mb-6 text-center">
            <div class="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-8 w-8 text-primary"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h2 class="heading-section">Admin Login</h2>
            <p class="text-base-content/60 mt-2 text-sm">
              Enter your credentials to access the admin panel
            </p>
          </div>

          <!-- Error Alert -->
          <div v-if="errorMessage" class="alert alert-error mb-4" role="alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5 shrink-0"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Login Form -->
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div class="form-control">
              <label class="label" for="admin-username">
                <span class="label-text font-medium">Username</span>
              </label>
              <input
                id="admin-username"
                v-model="username"
                type="text"
                class="input-primary"
                placeholder="Enter username"
                autocomplete="username"
                :disabled="isLoading"
                required
              />
            </div>

            <div class="form-control">
              <label class="label" for="admin-password">
                <span class="label-text font-medium">Password</span>
              </label>
              <input
                id="admin-password"
                v-model="password"
                type="password"
                class="input-primary"
                placeholder="Enter password"
                autocomplete="current-password"
                :disabled="isLoading"
                required
              />
            </div>

            <div class="flex gap-3 pt-4">
              <button
                type="button"
                class="btn-action-outline flex-1"
                :disabled="isLoading"
                @click="handleCancel"
              >
                Cancel
              </button>
              <button type="submit" class="btn-action-solid flex-1" :disabled="isLoading">
                <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
                <span v-else>Sign In</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>


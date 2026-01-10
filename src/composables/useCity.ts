import { ref, computed } from 'vue';
import { apiFetch } from '@/utils/api';

export interface City {
  City: string;
  State: string;
  StateAbbrev: string;
  CountryAbbrev: string;
  TzName: string;
}

const STORAGE_KEY = 'nearhear-selected-city';

const supportedCities = ref<City[]>([]);
const selectedCityKey = ref<string | null>(localStorage.getItem(STORAGE_KEY));
const isLoading = ref(false);
const error = ref<string | null>(null);

// Key format must match CalendarView.vue: City-StateAbbrev
const makeCityKey = (city: City): string => {
  return `${city.City}-${city.StateAbbrev}`;
};

const parseCityKey = (key: string): { city: string; state: string } | null => {
  const parts = key.split('-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { city: parts[0], state: parts[1] };
};

const selectedCity = computed(() => {
  if (!selectedCityKey.value) {
    return null;
  }
  return supportedCities.value.find((city) => makeCityKey(city) === selectedCityKey.value) ?? null;
});

const fetchSupportedCities = async (): Promise<void> => {
  console.log('[useCity] fetchSupportedCities called');
  console.log('[useCity] Current supportedCities length:', supportedCities.value.length);
  console.log('[useCity] Current selectedCityKey:', selectedCityKey.value);

  if (supportedCities.value.length > 0) {
    console.log('[useCity] Cities already loaded, returning early');
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const data = await apiFetch<City[]>('/media/getSupportedCities');

    console.log('[useCity] Fetched cities:', data);
    supportedCities.value = data || [];

    // If no selection yet, default to Portland or first city
    if (!selectedCityKey.value && supportedCities.value.length > 0) {
      console.log('[useCity] No city selected, defaulting...');
      const portland = supportedCities.value.find((c) => c.City.toLowerCase() === 'portland');
      if (portland) {
        console.log('[useCity] Selecting Portland');
        selectCity(portland);
      } else if (supportedCities.value[0]) {
        console.log('[useCity] Selecting first city');
        selectCity(supportedCities.value[0]);
      }
    }

    console.log('[useCity] After fetch - selectedCityKey:', selectedCityKey.value);
    console.log('[useCity] After fetch - selectedCity computed:', selectedCity.value);
  } catch (err) {
    console.error('Failed to fetch supported cities:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load cities';
  } finally {
    isLoading.value = false;
  }
};

const selectCity = (city: City): void => {
  const key = makeCityKey(city);
  selectedCityKey.value = key;
  localStorage.setItem(STORAGE_KEY, key);
};

const clearCity = (): void => {
  selectedCityKey.value = null;
  localStorage.removeItem(STORAGE_KEY);
};

export function useCity() {
  return {
    supportedCities,
    selectedCity,
    selectedCityKey,
    isLoading,
    error,
    makeCityKey,
    parseCityKey,
    fetchSupportedCities,
    selectCity,
    clearCity,
  };
}

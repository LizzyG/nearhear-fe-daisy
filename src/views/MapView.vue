<script setup lang="ts">
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';

// Fix for Leaflet marker icon issue with bundlers
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error - Leaflet typing issue with _getIconUrl
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

import PageHeader from '@/components/layout/PageHeader.vue';
import { resolveApiPath } from '@/config/api';

// Types
interface City {
  City: string;
  State: string;
  StateAbbrev: string;
  CountryAbbrev: string;
  TzName: string;
}

interface VenueCity {
  City: string;
  State: string;
  StateAbbrev: string;
  CountryAbbrev: string;
  TzName: string;
}

interface Venue {
  Name: string;
  GoogleName: string;
  Status: string;
  StreetNumber: string;
  Street: string;
  CityStr: string;
  Zip: string;
  ZipSuffix: string;
  State: string;
  Address: string;
  Neighborhood: string;
  Latitude: number;
  Longitude: number;
  GoogleId: string;
  Website: string;
  InstagramHandle: string;
  MapsUrl: string;
  City: VenueCity;
}

// City coordinates for centering map
const cityCoordinates: Record<string, [number, number]> = {
  Portland: [45.5008089, -122.6545459],
  Seattle: [47.6062, -122.3321],
  'San Francisco': [37.7749, -122.4194],
  'Los Angeles': [34.0522, -118.2437],
  Denver: [39.7392, -104.9903],
  Austin: [30.2672, -97.7431],
  Nashville: [36.1627, -86.7816],
  Chicago: [41.8781, -87.6298],
  'New York': [40.7128, -74.006],
  Boston: [42.3601, -71.0589],
};

// State
const supportedCities = ref<City[]>([]);
const STORAGE_KEY = 'nearhear-selected-city';
const selectedCityKey = ref<string | null>(localStorage.getItem(STORAGE_KEY));

const venues = ref<Venue[]>([]);
const isLoadingCities = ref(false);
const isLoadingVenues = ref(false);
const citiesError = ref<string | null>(null);
const venuesError = ref<string | null>(null);

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let markersLayer: L.LayerGroup | null = null;

// Search query for filtering venues
const searchQuery = ref('');

// Endpoints
const citiesEndpoint = resolveApiPath('/media/getSupportedCities');

const makeCityKey = (city: City) => `${city.City}-${city.StateAbbrev}`;

const selectedCity = computed(() => {
  if (!selectedCityKey.value) return null;
  return supportedCities.value.find((city) => makeCityKey(city) === selectedCityKey.value) ?? null;
});

// Filtered venues based on search
const filteredVenues = computed(() => {
  if (!searchQuery.value.trim()) return venues.value;
  const query = searchQuery.value.toLowerCase();
  return venues.value.filter(
    (venue) =>
      venue.Name.toLowerCase().includes(query) ||
      venue.Neighborhood?.toLowerCase().includes(query) ||
      venue.Address?.toLowerCase().includes(query),
  );
});

// Get popup content for venue marker
const getPopupContent = (venue: Venue): string => {
  // Link to calendar page with venue filter
  const calendarUrl = `/calendar?venue=${encodeURIComponent(venue.Name)}`;

  let content = `<div class="venue-popup">
    <a href="${calendarUrl}" class="venue-name">${venue.Name}</a>`;

  if (venue.Address) {
    content += `<div class="venue-address">${venue.Address}</div>`;
  }

  if (venue.Neighborhood) {
    content += `<div class="venue-neighborhood">${venue.Neighborhood}</div>`;
  }

  content += `<div class="venue-links">`;

  if (venue.InstagramHandle) {
    content += `<a href="https://instagram.com/${venue.InstagramHandle}" target="_blank" rel="noopener noreferrer">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
      Instagram
    </a>`;
  }

  if (venue.Website) {
    content += `<a href="${venue.Website}" target="_blank" rel="noopener noreferrer">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
      Website
    </a>`;
  }

  if (venue.MapsUrl) {
    content += `<a href="${venue.MapsUrl}" target="_blank" rel="noopener noreferrer">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      Directions
    </a>`;
  }

  content += `</div></div>`;

  return content;
};

// Initialize map
const initMap = () => {
  if (!mapContainer.value || map) return;

  const cityName = selectedCity.value?.City || 'Portland';
  const coords = cityCoordinates[cityName] || cityCoordinates['Portland'];

  map = L.map(mapContainer.value).setView(coords, 13);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
};

// Update markers on map
const updateMarkers = () => {
  if (!map || !markersLayer) return;

  // Clear existing markers
  markersLayer.clearLayers();

  // Add markers for filtered venues
  filteredVenues.value.forEach((venue) => {
    if (venue.Latitude && venue.Longitude) {
      const marker = L.marker([venue.Latitude, venue.Longitude]);
      marker.bindPopup(getPopupContent(venue), {
        maxWidth: 300,
        className: 'custom-popup',
      });
      markersLayer?.addLayer(marker);
    }
  });

  // Invalidate map size to ensure proper rendering
  setTimeout(() => {
    map?.invalidateSize();
  }, 100);
};

// Center map on city
const centerMapOnCity = () => {
  if (!map) return;

  const cityName = selectedCity.value?.City || 'Portland';
  const coords = cityCoordinates[cityName] || cityCoordinates['Portland'];
  map.setView(coords, 13);
};

// Fetch supported cities
const fetchSupportedCities = async () => {
  isLoadingCities.value = true;
  citiesError.value = null;

  try {
    const response = await fetch(citiesEndpoint);
    if (!response.ok) {
      throw new Error(`Failed to load cities (status ${response.status})`);
    }

    const data = (await response.json()) as City[];
    supportedCities.value = data;

    // Check if stored city exists
    const storedCityKey = localStorage.getItem(STORAGE_KEY);
    const hasStoredSelection = storedCityKey
      ? data.some((city) => makeCityKey(city) === storedCityKey)
      : false;

    if (hasStoredSelection && storedCityKey) {
      selectedCityKey.value = storedCityKey;
    } else {
      // Default to Portland
      const portland = data.find((city) => city.City.toLowerCase() === 'portland');
      if (portland) {
        const portlandKey = makeCityKey(portland);
        selectedCityKey.value = portlandKey;
        localStorage.setItem(STORAGE_KEY, portlandKey);
      } else if (data.length > 0 && data[0]) {
        const firstCityKey = makeCityKey(data[0]);
        selectedCityKey.value = firstCityKey;
        localStorage.setItem(STORAGE_KEY, firstCityKey);
      }
    }
  } catch (error) {
    citiesError.value = error instanceof Error ? error.message : 'Failed to load cities';
    supportedCities.value = [];
  } finally {
    isLoadingCities.value = false;
  }
};

// Fetch venues for selected city
const fetchVenues = async () => {
  if (!selectedCity.value) {
    venues.value = [];
    return;
  }

  isLoadingVenues.value = true;
  venuesError.value = null;

  try {
    const venuesEndpoint = resolveApiPath(
      `/media/getMapVenues?city=${encodeURIComponent(selectedCity.value.City)}`,
    );
    const response = await fetch(venuesEndpoint);

    if (!response.ok) {
      throw new Error(`Failed to load venues (status ${response.status})`);
    }

    const data = (await response.json()) as Venue[];
    venues.value = data;

    // Update map markers
    updateMarkers();
  } catch (error) {
    venuesError.value = error instanceof Error ? error.message : 'Failed to load venues';
    venues.value = [];
  } finally {
    isLoadingVenues.value = false;
  }
};

// Handle city selection change
const handleCityChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const cityKey = target.value;
  selectedCityKey.value = cityKey || null;

  if (cityKey) {
    localStorage.setItem(STORAGE_KEY, cityKey);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }

  centerMapOnCity();
  void fetchVenues();
};

// Focus on a venue on the map
const focusVenue = (venue: Venue) => {
  if (!map || !venue.Latitude || !venue.Longitude) return;

  map.setView([venue.Latitude, venue.Longitude], 16);

  // Find and open the marker popup
  markersLayer?.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      const latLng = layer.getLatLng();
      if (latLng.lat === venue.Latitude && latLng.lng === venue.Longitude) {
        layer.openPopup();
      }
    }
  });
};

// Watch for search query changes to update markers
watch(filteredVenues, () => {
  updateMarkers();
});

// Watch for city changes
watch(selectedCity, () => {
  if (selectedCity.value) {
    centerMapOnCity();
    void fetchVenues();
  }
});

onMounted(async () => {
  await fetchSupportedCities();
  initMap();
  if (selectedCity.value) {
    await fetchVenues();
  }
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <section class="flex flex-col">
    <PageHeader title="Venue Map" />

    <!-- Controls Bar -->
    <div class="mt-6">
      <div class="card border border-base-300 bg-base-200 shadow-sm">
        <div class="card-body p-4">
          <div class="flex flex-col gap-4 md:flex-row md:items-center">
            <!-- City Dropdown -->
            <div
              v-if="supportedCities.length"
              class="form-control w-full md:w-auto md:min-w-[180px]"
            >
              <select
                :value="selectedCityKey || ''"
                class="select-primary h-10"
                @change="handleCityChange"
              >
                <option value="" disabled>Select a city</option>
                <option
                  v-for="city in supportedCities"
                  :key="makeCityKey(city)"
                  :value="makeCityKey(city)"
                >
                  {{ city.City }}, {{ city.StateAbbrev }}
                </option>
              </select>
            </div>

            <!-- Search Input -->
            <div class="relative w-full md:flex-1">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search venues..."
                class="input-primary h-10 pl-10 pr-4"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="text-base-content/50 pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </div>

            <!-- Venue count -->
            <div class="text-base-content/70 text-sm">
              <span v-if="!isLoadingVenues && venues.length > 0">
                {{ filteredVenues.length }} of {{ venues.length }} venues
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error States -->
    <div v-if="citiesError || venuesError" class="mt-4">
      <div class="alert alert-error">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 shrink-0 stroke-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{{ citiesError || venuesError }}</span>
      </div>
    </div>

    <!-- Main Content: Map + Venue List -->
    <div class="mt-4 flex flex-col gap-4 lg:flex-row">
      <!-- Map Container - fixed height to prevent resizing -->
      <div
        class="relative h-[400px] overflow-hidden rounded-lg border border-base-300 lg:h-[calc(100vh-280px)] lg:flex-1"
      >
        <div
          v-if="isLoadingVenues"
          class="bg-base-100/80 absolute inset-0 z-[1000] flex items-center justify-center"
        >
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
        <div ref="mapContainer" class="absolute inset-0"></div>
      </div>

      <!-- Venue List Sidebar -->
      <div class="w-full shrink-0 lg:w-80">
        <div
          class="card h-[300px] overflow-hidden border border-base-300 bg-base-100 lg:h-[calc(100vh-280px)]"
        >
          <div class="card-body p-0">
            <div class="border-b border-base-300 px-4 py-3">
              <h3 class="font-semibold text-base-content">Venues</h3>
            </div>

            <div v-if="isLoadingVenues" class="flex items-center justify-center py-8">
              <span class="loading loading-spinner loading-md text-primary"></span>
            </div>

            <div v-else-if="filteredVenues.length === 0" class="py-8 text-center">
              <p class="text-base-content/70 text-sm">No venues found</p>
            </div>

            <ul v-else class="menu max-h-full overflow-y-auto p-2">
              <li v-for="venue in filteredVenues" :key="venue.GoogleId || venue.Name">
                <button
                  type="button"
                  class="flex flex-col items-start gap-0.5 text-left"
                  @click="focusVenue(venue)"
                >
                  <span class="font-medium text-base-content">{{ venue.Name }}</span>
                  <span v-if="venue.Neighborhood" class="text-base-content/60 text-xs">
                    {{ venue.Neighborhood }}
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/* Custom Leaflet popup styling */
.custom-popup .leaflet-popup-content-wrapper {
  border-radius: 0.5rem;
  padding: 0;
}

.custom-popup .leaflet-popup-content {
  margin: 0;
  min-width: 200px;
}

.venue-popup {
  padding: 0.75rem;
}

.venue-popup .venue-name {
  display: block;
  font-weight: 600;
  font-size: 1rem;
  color: oklch(var(--p));
  text-decoration: none;
  margin-bottom: 0.5rem;
}

.venue-popup .venue-name:hover {
  text-decoration: underline;
}

.venue-popup .venue-address {
  font-size: 0.875rem;
  color: oklch(var(--bc) / 0.7);
  margin-bottom: 0.25rem;
}

.venue-popup .venue-neighborhood {
  font-size: 0.75rem;
  color: oklch(var(--bc) / 0.5);
  margin-bottom: 0.5rem;
}

.venue-popup .venue-links {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid oklch(var(--bc) / 0.1);
}

.venue-popup .venue-links a {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: oklch(var(--p));
  text-decoration: none;
}

.venue-popup .venue-links a:hover {
  text-decoration: underline;
}

.venue-popup .venue-links svg {
  flex-shrink: 0;
}

/* Fix Leaflet default icon issue */
.leaflet-default-icon-path {
  background-image: url(https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png);
}
</style>

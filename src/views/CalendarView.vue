<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import PageHeader from '../components/layout/PageHeader.vue';

import { resolveApiPath } from '@/config/api';
interface SupportedCity {
  City: string;
  State: string;
  StateAbbrev: string;
  CountryAbbrev: string;
  TzName: string;
}

type AgeRange = 0 | 1 | 2; // Over21, Over18, AllAges

interface City {
  // Add city fields if needed
  [key: string]: unknown;
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
  City: City;
}

interface BandcampTrack {
  ID: number;
  Slug: string;
  Name: string;
}

interface BandcampAlbum {
  Name: string;
  Slug: string;
  ID: number;
  Tracks: BandcampTrack[];
}

interface BandcampData {
  ArtistName: string;
  Albums: BandcampAlbum[];
}

interface ArtistMatchInfo {
  [key: string]: unknown;
}

interface ArtistInfo {
  ArtistId: number;
  ArtistName: string;
  SpotifyArtistId: string;
  TopTrackIds: string[];
  PreviewUrls: string[];
  Popularity: number;
  Genres: string[];
  NumMatches: number;
  PossibleMatches: ArtistMatchInfo[];
  Aliases: string[];
  InstagramHandle: string;
  BandcampArtistSlug: string;
  BandcampData: BandcampData;
}

interface Festival {
  Id: number;
  Name: string;
  Website: string;
  StartDate: string;
  EndDate: string;
}

interface FullShow {
  Date: string;
  PriceLow: number;
  PriceHigh: number;
  AgeRange: AgeRange;
  Venue: Venue;
  Urls: string[];
  ImgUrl: string;
  Artists: ArtistInfo[];
  Festival: Festival;
  Status: string;
}

const supportedCities = ref<SupportedCity[]>([]);
const selectedCityKey = ref<string | null>(null);
const formatIsoDate = (value: Date) => value.toISOString().slice(0, 10);
const today = new Date();
const startDate = ref<string>(formatIsoDate(today));
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const endDate = ref<string>(formatIsoDate(tomorrow));
const todayIso = formatIsoDate(today);
const selectedCity = computed(() => {
  if (!selectedCityKey.value) {
    return null;
  }

  return supportedCities.value.find((city) => makeCityKey(city) === selectedCityKey.value) ?? null;
});
const isLoadingCities = ref(false);
const cityLoadError = ref<string | null>(null);
const isCalendarOpen = ref(false);
const activeField = ref<'start' | 'end' | null>(null);
const pickerRoot = ref<HTMLElement | null>(null);

const cityEndpoint = resolveApiPath('/media/getSupportedCities');

const makeCityKey = (city: SupportedCity) => `${city.City}-${city.StateAbbrev}`;

const formatDate = (value: string) => {
  if (!value) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const eventsEndpoint = resolveApiPath('/media/getEventsByShow');

const getTimezoneOffsetMinutes = (date: Date, timeZone: string) => {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const lookup = parts.reduce<Record<string, number>>((acc, part) => {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
      acc[part.type] = Number(part.value);
    }
    if (part.type === 'hour' || part.type === 'minute' || part.type === 'second') {
      acc[part.type] = Number(part.value);
    }
    return acc;
  }, {});

  const asUtc = Date.UTC(
    lookup.year ?? date.getUTCFullYear(),
    (lookup.month ?? date.getUTCMonth() + 1) - 1,
    lookup.day ?? date.getUTCDate(),
    lookup.hour ?? date.getUTCHours(),
    lookup.minute ?? date.getUTCMinutes(),
    lookup.second ?? date.getUTCSeconds(),
  );

  return (asUtc - date.getTime()) / 60000;
};

const toZonedISOString = (isoDate: string, timeZone: string) => {
  const parts = isoDate.split('-').map(Number);
  if (parts.length < 3) {
    return new Date(isoDate).toISOString();
  }

  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (year === undefined || month === undefined || day === undefined) {
    return new Date(isoDate).toISOString();
  }

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return new Date(isoDate).toISOString();
  }

  const baseDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const offsetMinutes = getTimezoneOffsetMinutes(baseDate, timeZone);
  const zonedTime = new Date(baseDate.getTime() - offsetMinutes * 60_000);
  return zonedTime.toISOString();
};

interface EventsFilter {
  City: SupportedCity;
  StartDate: string;
  EndDate: string;
  SpotifyGenres: string[];
  BroadGenres: string[];
  Venues: string[];
  Festivals: Festival[];
  TheseFestivals: boolean;
  MinShows: number;
  TotalVenues: number;
  FilterMode: string;
}

interface GetEventsRequest {
  Filter: EventsFilter;
  ResultCnt: number;
  Page: number;
}

const formattedStartDate = computed(() => formatDate(startDate.value));
const formattedEndDate = computed(() => formatDate(endDate.value));
const calendarValue = computed(() => {
  if (activeField.value === 'start') {
    return startDate.value;
  }

  if (activeField.value === 'end') {
    return endDate.value;
  }

  return '';
});
const calendarMin = computed(() => (activeField.value === 'end' ? startDate.value : ''));
const calendarMax = computed(() => '');
const calendarPrompt = computed(() =>
  activeField.value === 'end' ? 'Select an end date' : 'Select a start date',
);

const shows = ref<FullShow[]>([]);
const isLoadingEvents = ref(false);
const eventsError = ref<string | null>(null);
let eventsRequestId = 0;

const ageRangeStrings: Record<AgeRange, string> = {
  0: 'All Ages',
  1: '18+',
  2: '21+',
};

const formatPrice = (low: number, high: number) => {
  if (!low && !high) {
    return 'TBA';
  }
  if (low === high) {
    return `$${low.toFixed(2)}`;
  }
  return `$${low.toFixed(2)} - $${high.toFixed(2)}`;
};

const hasPrice = (show: FullShow) => {
  return (show.PriceLow && show.PriceLow > 0) || (show.PriceHigh && show.PriceHigh > 0);
};

const hasImage = (show: FullShow) => {
  return !!(show.ImgUrl && show.ImgUrl.trim());
};

const formatShowDate = (dateString: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

const hasSpotifyTracks = (artist: ArtistInfo) => {
  return artist.SpotifyArtistId && artist.TopTrackIds && artist.TopTrackIds.length > 0;
};

const hasBandcampData = (artist: ArtistInfo) => {
  return artist.BandcampData && artist.BandcampData.Albums && artist.BandcampData.Albums.length > 0;
};

const buildEventsPayload = (): GetEventsRequest | null => {
  console.log('[buildEventsPayload] Starting payload construction');
  console.log('[buildEventsPayload] selectedCity.value:', selectedCity.value);
  console.log('[buildEventsPayload] startDate.value:', startDate.value);
  console.log('[buildEventsPayload] endDate.value:', endDate.value);

  const city = selectedCity.value;

  if (!city || !startDate.value || !endDate.value) {
    console.warn('[buildEventsPayload] Missing required values - returning null', {
      hasCity: !!city,
      hasStartDate: !!startDate.value,
      hasEndDate: !!endDate.value,
    });
    return null;
  }

  const cityPayload: SupportedCity = {
    City: city.City,
    State: city.State,
    StateAbbrev: city.StateAbbrev,
    CountryAbbrev: city.CountryAbbrev,
    TzName: city.TzName,
  };

  const startDateZoned = toZonedISOString(startDate.value, cityPayload.TzName);
  const endDateZoned = toZonedISOString(endDate.value, cityPayload.TzName);

  console.log('[buildEventsPayload] Date conversions:', {
    startDateRaw: startDate.value,
    startDateZoned,
    endDateRaw: endDate.value,
    endDateZoned,
    timezone: cityPayload.TzName,
  });

  const payload: GetEventsRequest = {
    ResultCnt: 50,
    Page: 1,
    Filter: {
      City: cityPayload,
      StartDate: startDateZoned,
      EndDate: endDateZoned,
      SpotifyGenres: [],
      BroadGenres: [],
      Venues: [],
      Festivals: [],
      TheseFestivals: false,
      MinShows: 0,
      TotalVenues: 0,
      FilterMode: '',
    },
  };

  console.log('[buildEventsPayload] Constructed payload:', JSON.stringify(payload, null, 2));
  return payload;
};

const fetchEvents = async () => {
  console.log('[fetchEvents] Starting fetchEvents');
  console.log('[fetchEvents] eventsEndpoint:', eventsEndpoint);

  const payload = buildEventsPayload();

  if (!payload) {
    console.warn('[fetchEvents] No payload - clearing shows and returning early');
    shows.value = [];
    eventsError.value = null;
    return;
  }

  const requestId = ++eventsRequestId;
  console.log('[fetchEvents] Request ID:', requestId);
  isLoadingEvents.value = true;
  eventsError.value = null;

  const payloadString = JSON.stringify(payload);
  console.log('[fetchEvents] Payload to send:', payloadString);
  console.log('[fetchEvents] Payload length:', payloadString.length, 'bytes');

  try {
    console.log('[fetchEvents] Making fetch request to:', eventsEndpoint);
    console.log('[fetchEvents] Request config:', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      bodyLength: payloadString.length,
    });

    const response = await fetch(eventsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: payloadString,
    });

    const headerEntries: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headerEntries[key] = value;
    });
    console.log('[fetchEvents] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: headerEntries,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetchEvents] Response not OK. Error body:', errorText);
      throw new Error(`Unable to load events (status ${response.status}): ${errorText}`);
    }

    const responseText = await response.text();
    console.log('[fetchEvents] Response text length:', responseText.length);
    console.log('[fetchEvents] Response text preview:', responseText.substring(0, 500));

    let data: FullShow[];
    try {
      data = JSON.parse(responseText) as FullShow[];
      console.log('[fetchEvents] Parsed response data:', {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'not an array',
        firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null,
      });
    } catch (parseError) {
      console.error('[fetchEvents] Failed to parse JSON response:', parseError);
      console.error('[fetchEvents] Response text that failed to parse:', responseText);
      throw new Error(`Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    if (requestId === eventsRequestId) {
      shows.value = Array.isArray(data) ? data : [];
      console.log('[fetchEvents] Updated shows.value, count:', shows.value.length);
    } else {
      console.warn('[fetchEvents] Request ID mismatch - ignoring response', {
        currentRequestId: requestId,
        latestRequestId: eventsRequestId,
      });
    }
  } catch (error) {
    console.error('[fetchEvents] Error occurred:', error);
    if (error instanceof Error) {
      console.error('[fetchEvents] Error name:', error.name);
      console.error('[fetchEvents] Error message:', error.message);
      console.error('[fetchEvents] Error stack:', error.stack);
    }

    if (requestId === eventsRequestId) {
      shows.value = [];
      eventsError.value =
        error instanceof Error ? error.message : 'Something went wrong while loading events.';
      console.log('[fetchEvents] Set error message:', eventsError.value);
    }
  } finally {
    if (requestId === eventsRequestId) {
      isLoadingEvents.value = false;
      console.log('[fetchEvents] Set isLoadingEvents to false');
    }
  }
};

const fetchSupportedCities = async () => {
  isLoadingCities.value = true;
  cityLoadError.value = null;

  try {
    const response = await fetch(cityEndpoint, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to load cities (status ${response.status})`);
    }

    const payload = (await response.json()) as SupportedCity[];

    supportedCities.value = payload;

    if (!payload.length) {
      selectedCityKey.value = null;
      return;
    }

    const hasPreviousSelection = selectedCityKey.value
      ? payload.some((city) => makeCityKey(city) === selectedCityKey.value)
      : false;

    if (!hasPreviousSelection) {
      const [firstCity] = payload;
      if (payload.length === 1 && firstCity) {
        selectedCityKey.value = makeCityKey(firstCity);
        void fetchEvents();
      } else {
        selectedCityKey.value = null;
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Something went wrong while loading cities.';
    cityLoadError.value = message;
    supportedCities.value = [];
  } finally {
    isLoadingCities.value = false;
  }
};

const handleCityChange = (cityKey: string) => {
  selectedCityKey.value = cityKey;
  void fetchEvents();
};

const resetDateRange = () => {
  const todayDate = new Date();
  startDate.value = formatIsoDate(todayDate);
  const nextDay = new Date(todayDate);
  nextDay.setDate(nextDay.getDate() + 1);
  endDate.value = formatIsoDate(nextDay);
};

const handleCityReset = () => {
  selectedCityKey.value = null;
  resetDateRange();
  isCalendarOpen.value = false;
  activeField.value = null;
  eventsRequestId += 1;
  isLoadingEvents.value = false;
  shows.value = [];
  eventsError.value = null;
};

type CalendarDateElement = HTMLElement & {
  value?: string;
};

const openCalendar = (field: 'start' | 'end') => {
  if (field === 'end' && !startDate.value) {
    activeField.value = 'start';
  } else {
    activeField.value = field;
  }

  isCalendarOpen.value = true;
};

const closeCalendar = () => {
  isCalendarOpen.value = false;
  activeField.value = null;
};

const handleDateChange = (event: Event) => {
  const target = event.currentTarget as CalendarDateElement | null;

  if (!target) {
    return;
  }

  const value = target.value ?? '';

  if (!value) {
    return;
  }

  if (activeField.value === 'start') {
    startDate.value = value;

    if (endDate.value && endDate.value < value) {
      endDate.value = '';
    }

    activeField.value = 'end';

    if (endDate.value) {
      void fetchEvents();
    }

    return;
  }

  endDate.value = value;
  closeCalendar();
  void fetchEvents();
};

const clearSelection = () => {
  resetDateRange();
  activeField.value = 'start';
  isCalendarOpen.value = true;
  if (selectedCity.value) {
    void fetchEvents();
  }
};

const handleCalendarKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeCalendar();
  }
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!isCalendarOpen.value || !pickerRoot.value) {
    return;
  }

  if (pickerRoot.value.contains(event.target as Node)) {
    return;
  }

  closeCalendar();
};

onMounted(() => {
  void fetchSupportedCities();
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});

defineExpose({
  selectedCity,
  startDate,
  endDate,
  shows,
  isLoadingEvents,
  eventsError,
  fetchEvents,
});
</script>

<template>
  <section>
    <PageHeader title="Calendar" />
    <form v-if="supportedCities.length" class="filter gap-2">
      <input value="X" type="reset" class="inactive-filter px-2" @click.prevent="handleCityReset" />

      <label
        v-for="city in supportedCities"
        :key="makeCityKey(city)"
        :class="{
          'active-filter': makeCityKey(city) === selectedCityKey,
          'inactive-filter': makeCityKey(city) !== selectedCityKey,
        }"
      >
        <input
          type="radio"
          name="cities"
          :value="makeCityKey(city)"
          :checked="makeCityKey(city) === selectedCityKey"
          class="hidden"
          @change="handleCityChange(makeCityKey(city))"
        />

        {{ city.City }}
      </label>
    </form>
    <p v-else class="text-base-content/70 text-sm">No supported cities available yet.</p>
    <p v-if="cityLoadError" class="mt-4 text-sm text-error">
      {{ cityLoadError }}
    </p>

    <div ref="pickerRoot" class="relative mt-8 space-y-4">
      <h2 class="text-base-content/60 text-sm font-semibold uppercase tracking-wide">
        Pick a date range
      </h2>

      <div class="flex flex-wrap gap-4">
        <label class="form-control w-full max-w-xs">
          <span
            class="label-text text-base-content/60 text-xs font-semibold uppercase tracking-wide"
          >
            Start date
          </span>
          <input
            type="text"
            readonly
            class="input-bordered input w-full"
            :value="formattedStartDate"
            placeholder="Select start"
            @click="openCalendar('start')"
          />
        </label>

        <label class="form-control w-full max-w-xs">
          <span
            class="label-text text-base-content/60 text-xs font-semibold uppercase tracking-wide"
          >
            End date
          </span>
          <input
            type="text"
            readonly
            class="input-bordered input w-full"
            :value="formattedEndDate"
            placeholder="Select end"
            @click="openCalendar('end')"
          />
        </label>
      </div>

      <transition name="fade">
        <div v-if="isCalendarOpen" class="relative">
          <div
            class="border-base-300/60 bg-base-200/70 cally absolute z-30 w-full max-w-md rounded-2xl border p-4 shadow-lg backdrop-blur"
            @keydown.stop="handleCalendarKeydown"
            @click.stop
          >
            <calendar-date
              :value="calendarValue"
              :today="todayIso"
              :min="calendarMin || undefined"
              :max="calendarMax || undefined"
              @change="handleDateChange"
            >
              <calendar-month></calendar-month>
            </calendar-date>

            <div class="mt-3 flex items-center justify-between">
              <span class="text-base-content/60 text-xs">
                {{ calendarPrompt }}
              </span>
              <div class="flex gap-2">
                <button type="button" class="inactive-filter" @click="clearSelection">Clear</button>
                <button type="button" class="inactive-filter" @click="closeCalendar">Close</button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <p v-if="startDate || endDate" class="text-base-content/70 text-sm">
        Range:
        <span class="font-semibold text-primary">
          {{ formattedStartDate || '—' }} → {{ formattedEndDate || '—' }}
        </span>
      </p>
    </div>

    <div v-if="eventsError" class="mt-8">
      <p class="text-error text-sm">{{ eventsError }}</p>
    </div>

    <div v-else-if="isLoadingEvents" class="mt-8">
      <p class="text-base-content/70 text-sm">Loading events…</p>
    </div>

    <div v-else-if="shows.length > 0" class="mt-8">
      <!-- Single column horizontal row layout for all events -->
      <div class="space-y-3">
        <div
          v-for="(show, index) in shows"
          :key="index"
          class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="card-body p-3">
            <div class="flex flex-col md:flex-row md:items-center gap-3">
              <!-- Image on left (if exists) -->
              <figure v-if="hasImage(show)" class="flex-shrink-0 w-32 h-32 overflow-hidden rounded-md">
                <img
                  :src="show.ImgUrl"
                  :alt="show.Venue.Name"
                  class="w-full h-full object-cover"
                />
              </figure>

              <!-- Main content: Horizontal layout -->
              <div class="flex-1 min-w-0">
                <h2 class="card-title text-base mb-1.5 line-clamp-1">{{ show.Venue.Name }}</h2>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <p class="text-base-content/80">
                    <span class="font-semibold">Date:</span> {{ formatShowDate(show.Date) }}
                  </p>
                  <p v-if="hasPrice(show)" class="text-base-content/80">
                    <span class="font-semibold">Price:</span> {{ formatPrice(show.PriceLow, show.PriceHigh) }}
                  </p>
                  <p v-if="show.AgeRange !== undefined" class="text-base-content/80">
                    <span class="font-semibold">Age:</span> {{ ageRangeStrings[show.AgeRange] || 'All Ages' }}
                  </p>
                  <p v-if="show.Venue.Address" class="text-base-content/80 truncate max-w-xs">
                    <span class="font-semibold">Location:</span> {{ show.Venue.Address }}
                  </p>
                </div>
              </div>

              <!-- Right side: Artists preview -->
              <div v-if="show.Artists && show.Artists.length > 0" class="flex-shrink-0">
                <div class="flex flex-wrap gap-2 justify-end">
                  <span
                    v-for="(artist, artistIndex) in show.Artists.slice(0, 3)"
                    :key="artistIndex"
                    class="badge badge-primary badge-sm"
                  >
                    {{ artist.ArtistName }}
                  </span>
                  <span v-if="show.Artists.length > 3" class="badge badge-ghost badge-sm">
                    +{{ show.Artists.length - 3 }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Expanded artists section -->
            <div v-if="show.Artists && show.Artists.length > 0" class="mt-3 pt-3 border-t border-base-300">
              <h3 class="text-base-content/80 font-semibold text-xs mb-2">Artists</h3>
              <div class="space-y-2">
                <div
                  v-for="(artist, artistIndex) in show.Artists"
                  :key="artistIndex"
                  class="border-base-300 rounded-md border p-2 bg-base-200/50"
                >
                  <h4 class="font-semibold text-xs mb-1.5">{{ artist.ArtistName }}</h4>

                  <div v-if="hasSpotifyTracks(artist)" class="mt-1.5">
                    <iframe
                      :src="`https://open.spotify.com/embed/artist/${artist.SpotifyArtistId}?utm_source=generator&theme=0`"
                      width="100%"
                      height="80"
                      frameborder="0"
                      allowtransparency="true"
                      allow="encrypted-media"
                      class="rounded-md"
                      loading="lazy"
                    ></iframe>
                  </div>

                  <div
                    v-if="hasBandcampData(artist) && artist.BandcampData.Albums.length > 0 && artist.BandcampData.Albums[0]"
                    class="mt-1.5"
                  >
                    <iframe
                      :src="`https://bandcamp.com/EmbeddedPlayer/album=${artist.BandcampData.Albums[0]?.ID}/size=small/bgcol=ffffff/linkcol=0687f5/tracklist=false/transparent=true/`"
                      seamless
                      class="w-full h-[120px] border-0 rounded-md"
                      loading="lazy"
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="selectedCity && startDate && endDate" class="mt-8">
      <p class="text-base-content/70 text-sm">No events found for the selected date range.</p>
    </div>
  </section>
</template>

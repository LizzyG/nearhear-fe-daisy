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

const eventsEndpoint = resolveApiPath('/media/getEvents');

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
  const [year, month, day] = isoDate.split('-').map(Number);
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
  Venues: string[];
  BroadGenres: string[];
  SpotifyGenres: string[];
  FilterMode: 'venue-or-genre';
}

interface EventsRequestPayload {
  ResultCnt: number;
  Page: number;
  Filter: EventsFilter;
}

interface EventsApiResponse {
  ResultCnt?: number;
  Page?: number;
  Events?: unknown;
  [key: string]: unknown;
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

const eventsResponse = ref<EventsApiResponse | null>(null);
const isLoadingEvents = ref(false);
const eventsError = ref<string | null>(null);
const eventsResultCount = computed<number | null>(() => {
  const result = eventsResponse.value?.ResultCnt;
  return typeof result === 'number' ? result : null;
});
let eventsRequestId = 0;

const buildEventsPayload = (): EventsRequestPayload | null => {
  const city = selectedCity.value;

  if (!city || !startDate.value || !endDate.value) {
    return null;
  }

  const cityPayload: SupportedCity = {
    City: city.City,
    State: city.State,
    StateAbbrev: city.StateAbbrev,
    CountryAbbrev: city.CountryAbbrev,
    TzName: city.TzName,
  };

  return {
    ResultCnt: 50,
    Page: 1,
    Filter: {
      City: cityPayload,
      StartDate: toZonedISOString(startDate.value, cityPayload.TzName),
      EndDate: toZonedISOString(endDate.value, cityPayload.TzName),
      Venues: [],
      BroadGenres: [],
      SpotifyGenres: [],
      FilterMode: 'venue-or-genre',
    },
  };
};

const fetchEvents = async () => {
  const payload = buildEventsPayload();

  if (!payload) {
    eventsResponse.value = null;
    eventsError.value = null;
    return;
  }

  const requestId = ++eventsRequestId;
  isLoadingEvents.value = true;
  eventsError.value = null;

  try {
    const response = await fetch(eventsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Unable to load events (status ${response.status})`);
    }

    const data = (await response.json()) as EventsApiResponse;

    if (requestId === eventsRequestId) {
      eventsResponse.value = data;
    }
  } catch (error) {
    if (requestId === eventsRequestId) {
      eventsResponse.value = null;
      eventsError.value =
        error instanceof Error ? error.message : 'Something went wrong while loading events.';
    }
  } finally {
    if (requestId === eventsRequestId) {
      isLoadingEvents.value = false;
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
  eventsResponse.value = null;
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
  eventsResponse,
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
      <div class="space-y-2 text-sm">
        <p v-if="eventsError" class="text-error">
          {{ eventsError }}
        </p>
        <p v-else-if="isLoadingEvents" class="text-base-content/70">Loading events…</p>
        <p v-else-if="eventsResultCount !== null" class="text-base-content/70">
          Loaded {{ eventsResultCount }} events.
        </p>
      </div>
    </div>
  </section>
</template>

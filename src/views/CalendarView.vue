<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import FilterChip from '@/components/FilterChip.vue';
import LazyEmbed from '@/components/LazyEmbed.vue';
import PageHeader from '../components/layout/PageHeader.vue';

import { resolveApiPath } from '@/config/api';
import { useAuth } from '@/composables/useAuth';
import { apiFetch } from '@/utils/api';

import type {
  AgeRange,
  BandcampAlbum,
  CalendarFullShow,
  EventArtistInfo,
  EventsFilter,
  GetEventsRequest,
  GetFiltersRequest,
  SupportedCity,
} from '@/types/event';

const route = useRoute();
const { isLoggedIn, loginWithSpotify, userId } = useAuth();

const supportedCities = ref<SupportedCity[]>([]);
const STORAGE_KEY = 'nearhear-selected-city';
const selectedCityKey = ref<string | null>(localStorage.getItem(STORAGE_KEY));
const formatIsoDate = (value: Date) => value.toISOString().slice(0, 10);

// Format date as local YYYY-MM-DD string (not UTC)
const formatLocalIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const today = new Date();
const startDate = ref<string>(formatIsoDate(today));
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const endDate = ref<string>(formatIsoDate(tomorrow));
const selectedCity = computed(() => {
  if (!selectedCityKey.value) {
    return null;
  }

  return supportedCities.value.find((city) => makeCityKey(city) === selectedCityKey.value) ?? null;
});
const isLoadingCities = ref(false);
const cityLoadError = ref<string | null>(null);
const isCalendarOpen = ref(false);
const pickerRoot = ref<HTMLElement | null>(null);

// Modal refs for native dialog API
const calendarModal = ref<HTMLDialogElement | null>(null);
const venuesModal = ref<HTMLDialogElement | null>(null);
const genresModal = ref<HTMLDialogElement | null>(null);
const exportModal = ref<HTMLDialogElement | null>(null);

const cityEndpoint = '/media/getSupportedCities';
const filtersEndpoint = '/media/getFilters';

const makeCityKey = (city: SupportedCity) => `${city.City}-${city.StateAbbrev}`;

const formatDate = (value: string, timeZone?: string) => {
  if (!value) {
    return '';
  }

  try {
    // Use city timezone if provided, otherwise use browser's local timezone
    const tz = timeZone || selectedCity.value?.TzName || undefined;

    // Parse date string (YYYY-MM-DD) as a local date to avoid UTC conversion issues
    const dateParts = value.split('-').map(Number);
    let date: Date;
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];
    if (
      dateParts.length === 3 &&
      year !== undefined &&
      month !== undefined &&
      day !== undefined &&
      !Number.isNaN(year) &&
      !Number.isNaN(month) &&
      !Number.isNaN(day)
    ) {
      // Create date in local timezone (will be formatted in city timezone)
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(value);
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeZone: tz,
    }).format(date);
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


const formattedStartDate = computed(() => formatDate(startDate.value));
const formattedEndDate = computed(() => formatDate(endDate.value));
const formattedDateRange = computed(() => {
  if (startDate.value && endDate.value) {
    return `${formattedStartDate.value} → ${formattedEndDate.value}`;
  }
  if (startDate.value) {
    return `${formattedStartDate.value} → ...`;
  }
  return 'Select date range';
});
// Calendar range value format: "startDate/endDate" or just "startDate" if only start is selected
const calendarRangeValue = computed(() => {
  if (startDate.value && endDate.value) {
    return `${startDate.value}/${endDate.value}`;
  }
  if (startDate.value) {
    return startDate.value;
  }
  return '';
});

const shows = ref<CalendarFullShow[]>([]);
const isLoadingEvents = ref(false);
const eventsError = ref<string | null>(null);
let eventsRequestId = 0;

const filters = ref<EventsFilter | null>(null);
const isLoadingFilters = ref(false);
const filtersError = ref<string | null>(null);

// Selected filter state
const selectedVenues = ref<string[]>([]);
const selectedSpotifyGenres = ref<string[]>([]);
const selectedBroadGenres = ref<string[]>([]);

// Filter mode: 'venue-or-genre' (default, more results) or 'venue-and-genre' (stricter)
const filterMode = ref<'venue-or-genre' | 'venue-and-genre'>('venue-or-genre');

// Search query for filtering by venue or artist name
const searchQuery = ref('');

// Date range limit warning
const dateRangeLimitWarning = ref(false);
const MAX_DATE_RANGE_DAYS = 30;

// Export to Spotify state
const isExportModalOpen = ref(false);
const exportPlaylistName = ref('');
const isExporting = ref(false);
const exportError = ref<string | null>(null);
const exportSuccess = ref(false);

// Pending selections for filter panels (before Apply is clicked)
const pendingVenues = ref<string[]>([]);
const pendingSpotifyGenres = ref<string[]>([]);
const pendingBroadGenres = ref<string[]>([]);

// Panel open state
const isVenuesPanelOpen = ref(false);
const isGenresPanelOpen = ref(false);

// Search state for filtering filter lists
const venueSearchQuery = ref('');
const genreSearchQuery = ref('');

const ageRangeStrings: Record<AgeRange, string> = {
  0: 'All Ages',
  1: '18+',
  2: '21+',
  3: 'Unknown',
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

const hasPrice = (show: CalendarFullShow) => {
  return (show.PriceLow && show.PriceLow > 0) || (show.PriceHigh && show.PriceHigh > 0);
};

const formatShowDate = (dateString: string, timeZone?: string) => {
  try {
    // Use city timezone if provided, otherwise use browser's local timezone
    const tz = timeZone || selectedCity.value?.TzName || undefined;

    // Parse date string - could be ISO string with time or YYYY-MM-DD
    // If it's a date-only string, parse it as local to avoid UTC conversion
    let date: Date;
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date-only format (YYYY-MM-DD) - parse as local date
      const dateParts = dateString.split('-').map(Number);
      const year = dateParts[0];
      const month = dateParts[1];
      const day = dateParts[2];
      if (
        year !== undefined &&
        month !== undefined &&
        day !== undefined &&
        !Number.isNaN(year) &&
        !Number.isNaN(month) &&
        !Number.isNaN(day)
      ) {
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateString);
      }
    } else {
      // ISO string with time - parse normally
      date = new Date(dateString);
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: tz,
    }).format(date);
  } catch {
    return dateString;
  }
};

const hasSpotifyTracks = (artist: EventArtistInfo) => {
  return artist.SpotifyArtistId && artist.TopTrackIds && artist.TopTrackIds.length > 0;
};

// Get album ID from album object (handles both id and ID fields)
const getAlbumId = (album: BandcampAlbum): number | undefined => {
  const id = album.id ?? album.ID;
  // Bandcamp album IDs must be > 0 to be valid for embedding
  return id && id > 0 ? id : undefined;
};

// Check if artist has valid album data for embedding
const hasBandcampAlbums = (artist: EventArtistInfo) => {
  if (!artist.BandcampData) {
    return false;
  }
  const albums = artist.BandcampData.albums || artist.BandcampData.Albums;
  if (!Array.isArray(albums) || albums.length === 0) {
    return false;
  }
  // Check if any album has a valid (non-zero) ID
  return albums.some((album) => getAlbumId(album) !== undefined);
};

// Get the first valid album ID for embedding (non-zero ID)
const getFirstAlbumId = (artist: EventArtistInfo): number | undefined => {
  if (!artist.BandcampData) {
    return undefined;
  }
  const albums = artist.BandcampData.albums || artist.BandcampData.Albums;
  if (!Array.isArray(albums) || albums.length === 0) {
    return undefined;
  }
  // Find the first album with a valid (non-zero) ID
  for (const album of albums) {
    const id = getAlbumId(album);
    if (id !== undefined) {
      return id;
    }
  }
  return undefined;
};

// Get Bandcamp artist URL from slug (e.g., "artistname.bandcamp.com")
const getBandcampArtistUrl = (artist: EventArtistInfo): string | undefined => {
  if (artist.BandcampArtistSlug && artist.BandcampArtistSlug.trim()) {
    return `https://${artist.BandcampArtistSlug}.bandcamp.com`;
  }
  return undefined;
};

// Generate Google Calendar URL for an event
const getGoogleCalendarUrl = (show: CalendarFullShow): string => {
  const artistNames = show.Artists?.map((a) => a.ArtistName).join(', ') || 'Live Music';
  const title = `${artistNames} at ${show.Venue?.Name || 'Venue'}`;

  // Parse the show date
  const showDate = new Date(show.Date);

  // Format dates for Google Calendar (YYYYMMDDTHHmmssZ format)
  const formatGoogleDate = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  // Assume show is ~3 hours
  const endDate = new Date(showDate.getTime() + 3 * 60 * 60 * 1000);

  const details = [
    show.PriceLow || show.PriceHigh ? `Price: ${formatPrice(show.PriceLow, show.PriceHigh)}` : '',
    show.AgeRange ? `Age: ${ageRangeStrings[show.AgeRange]}` : '',
    show.Urls?.length ? `Tickets: ${show.Urls[0]}` : '',
  ]
    .filter(Boolean)
    .join('\\n');

  const location = show.Venue?.Address || show.Venue?.Name || '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogleDate(showDate)}/${formatGoogleDate(endDate)}`,
    details: details,
    location: location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Download .ics file for an event
const downloadIcsFile = (show: CalendarFullShow): void => {
  const artistNames = show.Artists?.map((a) => a.ArtistName).join(', ') || 'Live Music';
  const title = `${artistNames} at ${show.Venue?.Name || 'Venue'}`;

  const showDate = new Date(show.Date);
  const endDate = new Date(showDate.getTime() + 3 * 60 * 60 * 1000);

  const formatIcsDate = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  const details = [
    show.PriceLow || show.PriceHigh ? `Price: ${formatPrice(show.PriceLow, show.PriceHigh)}` : '',
    show.AgeRange ? `Age: ${ageRangeStrings[show.AgeRange]}` : '',
    show.Urls?.length ? `Tickets: ${show.Urls[0]}` : '',
  ]
    .filter(Boolean)
    .join('\\n');

  const location = show.Venue?.Address || show.Venue?.Name || '';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NearHear//Event//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatIcsDate(showDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

  // Determine FilterMode based on selected filters
  const hasVenues = selectedVenues.value.length > 0;
  const hasGenres = selectedSpotifyGenres.value.length > 0 || selectedBroadGenres.value.length > 0;

  let filterModeValue = 'none';
  if (hasVenues && hasGenres) {
    filterModeValue = filterMode.value; // Use the user-selected mode
  } else if (hasVenues) {
    filterModeValue = 'venue';
  } else if (hasGenres) {
    filterModeValue = 'genre';
  }

  const payload: GetEventsRequest = {
    ResultCnt: 10000,
    Page: 1,
    Filter: {
      City: cityPayload,
      StartDate: startDateZoned,
      EndDate: endDateZoned,
      SpotifyGenres: selectedSpotifyGenres.value,
      BroadGenres: selectedBroadGenres.value,
      Venues: selectedVenues.value,
      Festivals: [],
      TheseFestivals: false,
      MinShows: 0,
      TotalVenues: filters.value?.TotalVenues || 0,
      FilterMode: filterModeValue,
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

    let data: CalendarFullShow[];
    try {
      data = JSON.parse(responseText) as CalendarFullShow[];
      console.log('[fetchEvents] Parsed response data:', {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'not an array',
        firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null,
      });
    } catch (parseError) {
      console.error('[fetchEvents] Failed to parse JSON response:', parseError);
      console.error('[fetchEvents] Response text that failed to parse:', responseText);
      throw new Error(
        `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      );
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
    const payload = await apiFetch<SupportedCity[]>(cityEndpoint, { method: 'GET' });

    supportedCities.value = payload;

    if (!payload.length) {
      selectedCityKey.value = null;
      return;
    }

    // Check if stored city key exists in the loaded cities
    const storedCityKey = localStorage.getItem(STORAGE_KEY);
    const hasStoredSelection = storedCityKey
      ? payload.some((city) => makeCityKey(city) === storedCityKey)
      : false;

    if (hasStoredSelection && storedCityKey) {
      // Use stored city if it exists in the loaded cities
      selectedCityKey.value = storedCityKey;
      void fetchEvents();
      void fetchFilters();
    } else if (!selectedCityKey.value) {
      // No stored selection, try to find Portland as default
      const portland = payload.find((city) => city.City.toLowerCase() === 'portland');

      if (portland) {
        const portlandKey = makeCityKey(portland);
        selectedCityKey.value = portlandKey;
        localStorage.setItem(STORAGE_KEY, portlandKey);
        void fetchEvents();
        void fetchFilters();
      } else {
        // Fallback to first city if Portland not found
        const [firstCity] = payload;
        if (payload.length === 1 && firstCity) {
          const firstCityKey = makeCityKey(firstCity);
          selectedCityKey.value = firstCityKey;
          localStorage.setItem(STORAGE_KEY, firstCityKey);
          void fetchEvents();
          void fetchFilters();
        } else {
          selectedCityKey.value = null;
        }
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

const buildFiltersPayload = (): GetFiltersRequest | null => {
  const city = selectedCity.value;

  if (!city || !startDate.value || !endDate.value) {
    return null;
  }

  // Convert dates to ISO strings in UTC
  const startDateObj = new Date(startDate.value);
  const endDateObj = new Date(endDate.value);

  const cityPayload: SupportedCity = {
    City: city.City,
    State: city.State,
    StateAbbrev: city.StateAbbrev,
    CountryAbbrev: city.CountryAbbrev,
    TzName: city.TzName,
  };

  return {
    startDate: startDateObj.toISOString(),
    endDate: endDateObj.toISOString(),
    city: cityPayload,
    minShows: 0,
  };
};

const fetchFilters = async () => {
  const payload = buildFiltersPayload();

  if (!payload) {
    filters.value = null;
    filtersError.value = null;
    return;
  }

  isLoadingFilters.value = true;
  filtersError.value = null;

  try {
    const data = await apiFetch<EventsFilter>(filtersEndpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    filters.value = data;
    console.log('[fetchFilters] Loaded filters:', data);

    // Clear selected filters that are no longer available
    selectedVenues.value = selectedVenues.value.filter((venue) => data.Venues?.includes(venue));
    selectedSpotifyGenres.value = selectedSpotifyGenres.value.filter((genre) =>
      data.SpotifyGenres?.includes(genre),
    );
    selectedBroadGenres.value = selectedBroadGenres.value.filter((genre) =>
      data.BroadGenres?.includes(genre),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Something went wrong while loading filters.';
    filtersError.value = message;
    filters.value = null;
    console.error('[fetchFilters] Error:', error);
  } finally {
    isLoadingFilters.value = false;
  }
};

const handleCitySelectChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const cityKey = target.value;
  selectedCityKey.value = cityKey || null;
  if (cityKey) {
    localStorage.setItem(STORAGE_KEY, cityKey);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  void fetchEvents();
  void fetchFilters();
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
  localStorage.removeItem(STORAGE_KEY);
  resetDateRange();
  isCalendarOpen.value = false;
  eventsRequestId += 1;
  isLoadingEvents.value = false;
  shows.value = [];
  eventsError.value = null;
  // Clear filters
  selectedVenues.value = [];
  selectedSpotifyGenres.value = [];
  selectedBroadGenres.value = [];
  filters.value = null;
};

type CalendarRangeElement = HTMLElement & {
  value?: string;
};

const openCalendar = () => {
  isCalendarOpen.value = true;
  calendarModal.value?.showModal();
};

const closeCalendar = () => {
  isCalendarOpen.value = false;
  dateRangeLimitWarning.value = false;
  calendarModal.value?.close();
};

const handleRangeChange = (event: Event) => {
  const target = event.currentTarget as CalendarRangeElement | null;

  if (!target) {
    return;
  }

  const value = target.value ?? '';

  if (!value) {
    // Clear both dates if value is empty
    startDate.value = '';
    endDate.value = '';
    return;
  }

  // Calendar range value format: "startDate/endDate" or just "startDate"
  const parts = value.split('/');
  let startValue = '';
  let endValue = '';

  if (parts.length === 2) {
    // Full range selected
    startValue = parts[0]?.trim() || '';
    endValue = parts[1]?.trim() || '';
  } else if (parts.length === 1) {
    // Only start date selected (user is still selecting)
    startValue = parts[0]?.trim() || '';
    endValue = '';
  }

  // Fix timezone issue: parse date strings as local dates to avoid UTC conversion
  const parseLocalDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const dateParts = dateStr.split('-').map(Number);
    if (dateParts.length === 3) {
      const year = dateParts[0];
      const month = dateParts[1];
      const day = dateParts[2];
      if (
        year !== undefined &&
        month !== undefined &&
        day !== undefined &&
        !Number.isNaN(year) &&
        !Number.isNaN(month) &&
        !Number.isNaN(day)
      ) {
        const localDate = new Date(year, month - 1, day);
        return formatLocalIsoDate(localDate);
      }
    }
    return dateStr;
  };

  const parsedStart = parseLocalDate(startValue);
  const parsedEnd = parseLocalDate(endValue);

  // Check if date range exceeds maximum
  let exceedsLimit = false;
  if (parsedStart && parsedEnd) {
    const startDateObj = new Date(parsedStart);
    const endDateObj = new Date(parsedEnd);
    const diffDays = Math.ceil(
      (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24),
    );
    exceedsLimit = diffDays > MAX_DATE_RANGE_DAYS;
  }

  dateRangeLimitWarning.value = exceedsLimit;

  // If range exceeds limit, don't update dates or fetch - just show warning
  if (exceedsLimit) {
    return;
  }

  startDate.value = parsedStart;
  endDate.value = parsedEnd;

  // If both dates are set, close calendar and fetch events
  if (parsedStart && parsedEnd) {
    closeCalendar();
    void fetchEvents();
    void fetchFilters();
  }
};

const clearSelection = () => {
  resetDateRange();
  if (selectedCity.value) {
    void fetchEvents();
    void fetchFilters();
  }
};

// Computed property for shows filtered by search query
const filteredShows = computed(() => {
  if (!searchQuery.value.trim()) return shows.value;
  const query = searchQuery.value.toLowerCase();
  return shows.value.filter((show) => {
    // Check venue name
    if (show.Venue?.Name?.toLowerCase().includes(query)) return true;
    // Check artist names
    if (show.Artists?.some((artist) => artist.ArtistName?.toLowerCase().includes(query)))
      return true;
    return false;
  });
});

// Computed properties for filtered lists
const filteredVenues = computed(() => {
  if (!filters.value?.Venues) return [];
  if (!venueSearchQuery.value.trim()) return filters.value.Venues;
  const query = venueSearchQuery.value.toLowerCase();
  return filters.value.Venues.filter((venue) => venue.toLowerCase().includes(query));
});

const filteredSpotifyGenres = computed(() => {
  if (!filters.value?.SpotifyGenres) return [];
  if (!genreSearchQuery.value.trim()) return filters.value.SpotifyGenres;
  const query = genreSearchQuery.value.toLowerCase();
  return filters.value.SpotifyGenres.filter((genre) => genre.toLowerCase().includes(query));
});

const filteredBroadGenres = computed(() => {
  if (!filters.value?.BroadGenres) return [];
  if (!genreSearchQuery.value.trim()) return filters.value.BroadGenres;
  const query = genreSearchQuery.value.toLowerCase();
  return filters.value.BroadGenres.filter((genre) => genre.toLowerCase().includes(query));
});

// Panel management functions
const openVenuesPanel = () => {
  console.log('openVenuesPanel');
  pendingVenues.value = [...selectedVenues.value];
  isVenuesPanelOpen.value = true;
  console.log('venuesModal', venuesModal.value);
  venuesModal.value?.showModal();
};

const openGenresPanel = () => {
  pendingSpotifyGenres.value = [...selectedSpotifyGenres.value];
  pendingBroadGenres.value = [...selectedBroadGenres.value];
  isGenresPanelOpen.value = true;
  genresModal.value?.showModal();
};

const closeVenuesPanel = () => {
  isVenuesPanelOpen.value = false;
  venuesModal.value?.close();
};

const closeGenresPanel = () => {
  isGenresPanelOpen.value = false;
  genresModal.value?.close();
};

const applyVenuesFilters = () => {
  selectedVenues.value = [...pendingVenues.value];
  void fetchEvents();
  closeVenuesPanel();
};

const applyGenresFilters = () => {
  selectedSpotifyGenres.value = [...pendingSpotifyGenres.value];
  selectedBroadGenres.value = [...pendingBroadGenres.value];
  void fetchEvents();
  closeGenresPanel();
};

const clearVenuesFilters = () => {
  pendingVenues.value = [];
};

const clearGenresFilters = () => {
  pendingSpotifyGenres.value = [];
  pendingBroadGenres.value = [];
};

// Filter toggle functions for panels (work with pending state)
const togglePendingVenue = (venue: string) => {
  const index = pendingVenues.value.indexOf(venue);
  if (index > -1) {
    pendingVenues.value.splice(index, 1);
  } else {
    pendingVenues.value.push(venue);
  }
};

const togglePendingSpotifyGenre = (genre: string) => {
  const index = pendingSpotifyGenres.value.indexOf(genre);
  if (index > -1) {
    pendingSpotifyGenres.value.splice(index, 1);
  } else {
    pendingSpotifyGenres.value.push(genre);
  }
};

const togglePendingBroadGenre = (genre: string) => {
  const index = pendingBroadGenres.value.indexOf(genre);
  if (index > -1) {
    pendingBroadGenres.value.splice(index, 1);
  } else {
    pendingBroadGenres.value.push(genre);
  }
};

// Check if pending selections are selected
const isPendingVenueSelected = (venue: string) => pendingVenues.value.includes(venue);
const isPendingSpotifyGenreSelected = (genre: string) => pendingSpotifyGenres.value.includes(genre);
const isPendingBroadGenreSelected = (genre: string) => pendingBroadGenres.value.includes(genre);

// Original toggle functions (kept for active filter chips)
const toggleVenue = (venue: string) => {
  const index = selectedVenues.value.indexOf(venue);
  if (index > -1) {
    selectedVenues.value.splice(index, 1);
  } else {
    selectedVenues.value.push(venue);
  }
  void fetchEvents();
};

const toggleSpotifyGenre = (genre: string) => {
  const index = selectedSpotifyGenres.value.indexOf(genre);
  if (index > -1) {
    selectedSpotifyGenres.value.splice(index, 1);
  } else {
    selectedSpotifyGenres.value.push(genre);
  }
  void fetchEvents();
};

const toggleBroadGenre = (genre: string) => {
  const index = selectedBroadGenres.value.indexOf(genre);
  if (index > -1) {
    selectedBroadGenres.value.splice(index, 1);
  } else {
    selectedBroadGenres.value.push(genre);
  }
  void fetchEvents();
};

// Remove filter functions
const removeVenue = (venue: string) => {
  const index = selectedVenues.value.indexOf(venue);
  if (index > -1) {
    selectedVenues.value.splice(index, 1);
    void fetchEvents();
  }
};

const removeSpotifyGenre = (genre: string) => {
  const index = selectedSpotifyGenres.value.indexOf(genre);
  if (index > -1) {
    selectedSpotifyGenres.value.splice(index, 1);
    void fetchEvents();
  }
};

const removeBroadGenre = (genre: string) => {
  const index = selectedBroadGenres.value.indexOf(genre);
  if (index > -1) {
    selectedBroadGenres.value.splice(index, 1);
    void fetchEvents();
  }
};

// Check if a filter is selected
const isVenueSelected = (venue: string) => selectedVenues.value.includes(venue);
const isSpotifyGenreSelected = (genre: string) => selectedSpotifyGenres.value.includes(genre);
const isBroadGenreSelected = (genre: string) => selectedBroadGenres.value.includes(genre);

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

// Track if we've applied the initial venue filter from URL
const hasAppliedInitialVenueFilter = ref(false);

// Handle venue filter from URL query parameter
const applyVenueFromQuery = () => {
  if (hasAppliedInitialVenueFilter.value) return;

  const venueParam = route.query.venue;
  if (venueParam && typeof venueParam === 'string') {
    hasAppliedInitialVenueFilter.value = true;
    selectedVenues.value = [venueParam];

    // Set date range to 30 days when filtering by venue from URL
    const todayDate = new Date();
    startDate.value = formatIsoDate(todayDate);
    const thirtyDaysLater = new Date(todayDate);
    thirtyDaysLater.setDate(todayDate.getDate() + 30);
    endDate.value = formatIsoDate(thirtyDaysLater);

    void fetchFilters();
    void fetchEvents();
  }
};

onMounted(() => {
  void fetchSupportedCities();
  document.addEventListener('click', handleDocumentClick);
});

// Watch for filters to load, then apply venue from URL if present
watch(
  () => filters.value,
  (newFilters) => {
    if (newFilters && !hasAppliedInitialVenueFilter.value) {
      applyVenueFromQuery();
    }
  },
);

// Also watch for route query changes (for subsequent navigations)
watch(
  () => route.query.venue,
  (newVenue, oldVenue) => {
    // Only react to changes, not initial load (handled above)
    if (oldVenue !== undefined && newVenue !== oldVenue) {
      if (newVenue && typeof newVenue === 'string') {
        selectedVenues.value = [newVenue];

        // Set date range to 30 days when filtering by venue
        const todayDate = new Date();
        startDate.value = formatIsoDate(todayDate);
        const thirtyDaysLater = new Date(todayDate);
        thirtyDaysLater.setDate(todayDate.getDate() + 30);
        endDate.value = formatIsoDate(thirtyDaysLater);

        void fetchFilters();
        void fetchEvents();
      } else if (!newVenue) {
        // Venue param was removed, clear the filter
        selectedVenues.value = [];
        void fetchEvents();
      }
    }
  },
);

onBeforeUnmount(() => {
  document.documentElement.classList.remove('modal-open');
  document.removeEventListener('click', handleDocumentClick);
});

// Export to Spotify playlist
const openExportModal = () => {
  if (!isLoggedIn.value) {
    loginWithSpotify();
    return;
  }
  exportPlaylistName.value = '';
  exportError.value = null;
  exportSuccess.value = false;
  isExportModalOpen.value = true;
  exportModal.value?.showModal();
};

const closeExportModal = () => {
  isExportModalOpen.value = false;
  exportPlaylistName.value = '';
  exportError.value = null;
  exportModal.value?.close();
};

const exportToSpotify = async () => {
  if (!exportPlaylistName.value.trim()) {
    exportError.value = 'Please enter a playlist name';
    return;
  }

  if (!selectedCity.value) {
    exportError.value = 'Please select a city first';
    return;
  }

  isExporting.value = true;
  exportError.value = null;
  exportSuccess.value = false;

  try {
    const cityPayload = selectedCity.value || {
      City: '',
      State: '',
      StateAbbrev: '',
      CountryAbbrev: '',
      TzName: 'America/Los_Angeles',
    };

    const startDateZoned = toZonedISOString(startDate.value, cityPayload.TzName);
    const endDateZoned = toZonedISOString(endDate.value, cityPayload.TzName);

    // Determine FilterMode based on selected filters
    const hasVenues = selectedVenues.value.length > 0;
    const hasGenres =
      selectedSpotifyGenres.value.length > 0 || selectedBroadGenres.value.length > 0;

    let filterModeValue = 'none';
    if (hasVenues && hasGenres) {
      filterModeValue = filterMode.value;
    } else if (hasVenues) {
      filterModeValue = 'venue';
    } else if (hasGenres) {
      filterModeValue = 'genre';
    }

    const requestBody = {
      DeleteExisting: false,
      UserId: userId.value || '',
      Platform: 'spotify',
      Filters: {
        City: cityPayload,
        StartDate: startDateZoned,
        EndDate: endDateZoned,
        SpotifyGenres: selectedSpotifyGenres.value,
        BroadGenres: selectedBroadGenres.value,
        Venues: selectedVenues.value,
        Festivals: [],
        TheseFestivals: false,
        MinShows: 0,
        TotalVenues: filters.value?.TotalVenues || 0,
        FilterMode: filterModeValue,
      },
      PlaylistName: exportPlaylistName.value.trim(),
      PlaylistDesc: `Created by NearHear - ${formattedDateRange.value}`,
      public: false,
      PlaylistId: 0,
      SpotifyPlaylistId: '',
      MaxTracks: 0,
    };

    await apiFetch('/spotify/buildFilteredPlaylist', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    exportSuccess.value = true;
    setTimeout(() => {
      closeExportModal();
    }, 2000);
  } catch (err) {
    console.error('Failed to export playlist:', err);
    exportError.value = err instanceof Error ? err.message : 'Failed to create playlist';
  } finally {
    isExporting.value = false;
  }
};

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
    <PageHeader title="Upcoming Events" />
    <p v-if="cityLoadError" class="mt-6 text-sm text-error">
      {{ cityLoadError }}
    </p>

    <!-- Filter Bar: Date picker and filter dropdowns -->
    <div ref="pickerRoot" class="relative mt-6">
      <div class="card border border-base-300 bg-base-200 shadow-sm">
        <div class="card-body p-4">
          <div class="flex flex-col flex-wrap gap-4 md:flex-row md:items-center">
            <!-- City Dropdown -->
            <div
              v-if="supportedCities.length"
              class="form-control w-full md:w-auto md:min-w-[180px]"
            >
              <select
                :value="selectedCityKey || ''"
                class="select-primary h-10"
                @change="handleCitySelectChange"
              >
                <option value="">All Cities</option>
                <option
                  v-for="city in supportedCities"
                  :key="makeCityKey(city)"
                  :value="makeCityKey(city)"
                >
                  {{ city.City }}, {{ city.StateAbbrev }}
                </option>
              </select>
            </div>

            <!-- Date Picker -->
            <div class="relative w-full md:min-w-[220px] md:flex-1">
              <input
                type="text"
                readonly
                class="input-primary h-10 cursor-pointer pl-4 pr-10"
                :value="formattedDateRange"
                placeholder="Select date range"
                @click="openCalendar"
                @focus="openCalendar"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="text-base-content/50 pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </div>

            <!-- Filter Buttons with AND/OR toggle between them -->
            <template
              v-if="
                filters &&
                (filters.Venues?.length ||
                  filters.SpotifyGenres?.length ||
                  filters.BroadGenres?.length)
              "
            >
              <!-- Venues Filter Button -->
              <button
                v-if="filters.Venues && filters.Venues.length > 0"
                type="button"
                class="btn-action-outline h-10 w-full md:w-auto md:min-w-[140px]"
                @click="openVenuesPanel"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-4 w-4"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                  />
                </svg>
                Venues
                <span v-if="selectedVenues.length > 0" class="badge badge-primary badge-sm ml-1">
                  {{ selectedVenues.length }}
                </span>
              </button>

              <!-- AND/OR Toggle (between Venues and Genres) -->
              <div
                v-if="
                  selectedVenues.length > 0 &&
                  (selectedSpotifyGenres.length > 0 || selectedBroadGenres.length > 0)
                "
                class="flex w-full flex-row justify-center gap-1 md:w-auto md:flex-col md:justify-start"
              >
                <button
                  type="button"
                  :class="filterMode === 'venue-and-genre' ? 'btn-toggle-active' : 'btn-toggle'"
                  @click="
                    filterMode = 'venue-and-genre';
                    void fetchEvents();
                  "
                >
                  AND
                </button>
                <button
                  type="button"
                  :class="filterMode === 'venue-or-genre' ? 'btn-toggle-active' : 'btn-toggle'"
                  @click="
                    filterMode = 'venue-or-genre';
                    void fetchEvents();
                  "
                >
                  OR
                </button>
              </div>

              <!-- Genres Filter Button -->
              <button
                v-if="
                  (filters.SpotifyGenres && filters.SpotifyGenres.length > 0) ||
                  (filters.BroadGenres && filters.BroadGenres.length > 0)
                "
                type="button"
                class="btn-action-outline h-10 w-full md:w-auto md:min-w-[140px]"
                @click="openGenresPanel"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-4 w-4"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                  />
                </svg>
                Genres
                <span
                  v-if="selectedSpotifyGenres.length + selectedBroadGenres.length > 0"
                  class="badge badge-primary badge-sm ml-1"
                >
                  {{ selectedSpotifyGenres.length + selectedBroadGenres.length }}
                </span>
              </button>
            </template>

            <!-- Search Input (client-side filtering) -->
            <div class="relative w-full md:min-w-[200px] md:flex-1">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search venues or artists..."
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

            <!-- Export to Spotify Button -->
            <button
              type="button"
              class="btn-action-solid h-10 whitespace-nowrap"
              :disabled="filteredShows.length === 0"
              @click="openExportModal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="h-5 w-5"
              >
                <path
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                />
              </svg>
              <span class="hidden sm:inline">Export to Spotify</span>
              <span class="sm:hidden">Export</span>
            </button>
          </div>
        </div>
      </div>

      <dialog
        ref="calendarModal"
        class="modal"
        @keydown.stop="handleCalendarKeydown"
      >
        <div class="modal-box max-w-fit border border-base-300 bg-base-200 shadow-lg">
            <div class="overflow-visible">
              <calendar-range
                :value="calendarRangeValue"
                :first-day-of-week="0"
                :today="''"
                @change="handleRangeChange"
              >
                <calendar-month></calendar-month>
              </calendar-range>
            </div>

            <!-- Date range limit warning -->
            <div
              v-if="dateRangeLimitWarning"
              class="bg-error/10 border-error/30 mt-3 max-w-[300px] rounded-lg border p-3"
            >
              <p class="whitespace-normal break-words text-center text-sm text-error">
                Please select a date range of {{ MAX_DATE_RANGE_DAYS }} days or less.
              </p>
            </div>

          <div class="mt-4 flex items-center justify-end gap-2">
            <button type="button" class="btn-action-outline" @click="clearSelection">Clear</button>
            <button type="button" class="btn-action-outline" @click="closeCalendar">Close</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>

    <!-- Venues Filter Panel -->
    <dialog ref="venuesModal" class="modal">
      <div
        class="modal-box w-full max-w-2xl space-y-0 border border-base-300 bg-base-100 shadow-lg"
      >
        <div class="flex items-center justify-between border-b border-base-300 pb-4">
          <h2 class="text-lg font-semibold">Filter Venues</h2>
          <button type="button" class="btn btn-ghost btn-square" @click="closeVenuesPanel">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2.5"
              stroke="currentColor"
              class="h-6 w-6"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="py-4">
          <input
            v-model="venueSearchQuery"
            type="text"
            placeholder="Search venues..."
            class="input-primary"
          />
        </div>

        <div class="max-h-[50vh] overflow-y-auto py-2">
          <div class="space-y-2">
            <label
              v-for="venue in filteredVenues"
              :key="venue"
              class="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-base-200"
            >
              <input
                type="checkbox"
                :checked="isPendingVenueSelected(venue)"
                class="checkbox-app"
                @change="togglePendingVenue(venue)"
              />
              <span class="flex-1">{{ venue }}</span>
            </label>
          </div>
        </div>

        <div class="mt-4 flex items-center gap-3 border-t border-base-300 pt-4">
          <button type="button" class="btn-action-outline flex-1" @click="clearVenuesFilters">
            Clear
          </button>
          <button type="button" class="btn-action-solid flex-1" @click="applyVenuesFilters">
            Apply
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Genres Filter Panel -->
    <dialog ref="genresModal" class="modal">
      <div
        class="modal-box w-full max-w-2xl space-y-0 border border-base-300 bg-base-100 shadow-lg"
      >
        <div class="flex items-center justify-between border-b border-base-300 pb-4">
          <h2 class="text-lg font-semibold">Filter Genres</h2>
          <button type="button" class="btn btn-ghost btn-square" @click="closeGenresPanel">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2.5"
              stroke="currentColor"
              class="h-6 w-6"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="py-4">
          <input
            v-model="genreSearchQuery"
            type="text"
            placeholder="Search genres..."
            class="input-primary"
          />
        </div>

        <div class="max-h-[50vh] space-y-6 overflow-y-auto py-2">
          <div v-if="filters && filters.SpotifyGenres && filters.SpotifyGenres.length > 0">
            <h3 class="text-base-content/70 mb-3 text-sm font-semibold">Spotify Genres</h3>
            <div class="space-y-2">
              <label
                v-for="genre in filteredSpotifyGenres"
                :key="`spotify-${genre}`"
                class="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-base-200"
              >
                <input
                  type="checkbox"
                  :checked="isPendingSpotifyGenreSelected(genre)"
                  class="checkbox-app"
                  @change="togglePendingSpotifyGenre(genre)"
                />
                <span class="flex-1">{{ genre }}</span>
              </label>
            </div>
          </div>

          <div v-if="filters && filters.BroadGenres && filters.BroadGenres.length > 0">
            <h3 class="text-base-content/70 mb-3 text-sm font-semibold">Broad Genres</h3>
            <div class="space-y-2">
              <label
                v-for="genre in filteredBroadGenres"
                :key="`broad-${genre}`"
                class="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-base-200"
              >
                <input
                  type="checkbox"
                  :checked="isPendingBroadGenreSelected(genre)"
                  class="checkbox-app"
                  @change="togglePendingBroadGenre(genre)"
                />
                <span class="flex-1">{{ genre }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-4 flex items-center gap-3 border-t border-base-300 pt-4">
          <button type="button" class="btn-action-outline flex-1" @click="clearGenresFilters">
            Clear
          </button>
          <button type="button" class="btn-action-solid flex-1" @click="applyGenresFilters">
            Apply
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Active Filters Chips -->
    <div
      v-if="
        selectedVenues.length > 0 ||
        selectedSpotifyGenres.length > 0 ||
        selectedBroadGenres.length > 0
      "
      class="mt-6"
    >
      <div class="flex flex-wrap gap-2">
        <!-- Venue chips -->
        <FilterChip
          v-for="venue in selectedVenues"
          :key="`chip-venue-${venue}`"
          :label="venue"
          @remove="removeVenue(venue)"
        />

        <!-- Spotify Genre chips -->
        <FilterChip
          v-for="genre in selectedSpotifyGenres"
          :key="`chip-spotify-${genre}`"
          :label="genre"
          @remove="removeSpotifyGenre(genre)"
        />

        <!-- Broad Genre chips -->
        <FilterChip
          v-for="genre in selectedBroadGenres"
          :key="`chip-broad-${genre}`"
          :label="genre"
          @remove="removeBroadGenre(genre)"
        />
      </div>
    </div>

    <div v-if="eventsError" class="mt-8">
      <p class="text-sm text-error">{{ eventsError }}</p>
    </div>

    <div v-else-if="isLoadingEvents" class="mt-8">
      <p class="text-base-content/70 text-sm">Loading events…</p>
    </div>

    <div v-else-if="filteredShows.length > 0" class="mt-8">
      <!-- Alternating row layout for events -->
      <div class="overflow-hidden rounded-lg border border-base-300">
        <div
          v-for="(show, index) in filteredShows"
          :key="index"
          :class="['p-4', index % 2 === 0 ? 'bg-base-200' : 'bg-row-alt']"
        >
          <!-- Header row: Venue, Date, Actions -->
          <div class="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div class="flex-1">
              <h4 class="text-base font-semibold text-base-content">{{ show.Venue.Name }}</h4>
              <div class="text-base-content/70 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>{{ formatShowDate(show.Date) }}</span>
                <span v-if="hasPrice(show)">{{ formatPrice(show.PriceLow, show.PriceHigh) }}</span>
                <span v-if="show.AgeRange !== undefined && show.AgeRange !== 0">{{
                  ageRangeStrings[show.AgeRange]
                }}</span>
                <span v-if="show.Venue.Address" class="max-w-xs truncate">{{
                  show.Venue.Address
                }}</span>
              </div>
            </div>
            <!-- Add to Calendar dropdown -->
            <div class="dropdown dropdown-end">
              <button
                type="button"
                tabindex="0"
                class="hover:bg-primary/10 btn btn-ghost btn-sm gap-1 text-primary"
                title="Add to Calendar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-4 w-4"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
                  />
                </svg>
                <span class="hidden sm:inline">Add to Cal</span>
              </button>
              <ul
                tabindex="0"
                class="dropdown-content menu z-50 w-48 rounded-lg border border-base-300 bg-base-100 p-2 shadow-lg"
              >
                <li>
                  <button
                    type="button"
                    class="flex items-center gap-2"
                    @click="downloadIcsFile(show)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="h-4 w-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                      />
                    </svg>
                    Apple / Outlook
                  </button>
                </li>
                <li>
                  <a
                    :href="getGoogleCalendarUrl(show)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="h-4 w-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                      />
                    </svg>
                    Google Calendar
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <!-- Artists - each artist name above their embed -->
          <div v-if="show.Artists && show.Artists.length > 0" class="flex flex-wrap gap-4">
            <div
              v-for="(artist, artistIndex) in show.Artists"
              :key="artistIndex"
              class="flex flex-col"
            >
              <!-- Artist name and genres -->
              <div class="mb-1 flex items-center gap-2">
                <span class="font-medium text-base-content">{{ artist.ArtistName }}</span>
                <div v-if="artist.Genres && artist.Genres.length > 0" class="flex flex-wrap gap-1">
                  <span
                    v-for="(genre, genreIndex) in artist.Genres.slice(0, 2)"
                    :key="genreIndex"
                    class="badge badge-primary badge-xs"
                  >
                    {{ genre }}
                  </span>
                </div>
              </div>
              <!-- Embed directly below artist name -->
              <div v-if="hasSpotifyTracks(artist)">
                <LazyEmbed
                  :src="`https://open.spotify.com/embed/artist/${artist.SpotifyArtistId}?utm_source=generator&theme=0&compact=true`"
                  :width="280"
                  :height="80"
                  class="rounded-md"
                />
              </div>
              <div v-else-if="hasBandcampAlbums(artist)">
                <LazyEmbed
                  :src="`https://bandcamp.com/EmbeddedPlayer/album=${getFirstAlbumId(artist)}/size=small/bgcol=ffffff/linkcol=0687f5/tracklist=false/transparent=true/`"
                  :width="280"
                  :height="80"
                  class="rounded-md border-0"
                />
              </div>
              <a
                v-else-if="getBandcampArtistUrl(artist)"
                :href="getBandcampArtistUrl(artist)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm font-medium text-primary hover:underline"
              >
                Listen on Bandcamp →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="selectedCity && startDate && endDate" class="mt-8">
      <p v-if="shows.length > 0 && searchQuery.trim()" class="text-base-content/70 text-sm">
        No events match "{{ searchQuery }}"
      </p>
      <p v-else class="text-base-content/70 text-sm">
        No events found for the selected date range.
      </p>
    </div>
  </section>

  <!-- Export to Spotify Modal -->
  <dialog ref="exportModal" class="modal">
    <div class="modal-box border border-base-300 bg-base-200 shadow-lg">
      <h3 class="mb-4 text-lg font-bold text-primary">Export to Spotify Playlist</h3>

      <div v-if="exportSuccess" class="alert alert-success mb-4">
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Playlist created successfully! Check your Spotify library.</span>
      </div>

      <div v-else>
        <p class="text-base-content/70 mb-4 text-sm">
          Create a Spotify playlist from {{ filteredShows.length }} event{{
            filteredShows.length !== 1 ? 's' : ''
          }}
          matching your current filters.
        </p>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text font-medium">Playlist Name</span>
          </label>
          <input
            v-model="exportPlaylistName"
            type="text"
            placeholder="My NearHear Playlist"
            class="input-primary"
            :disabled="isExporting"
            @keydown.enter="exportToSpotify"
          />
        </div>

        <div v-if="exportError" class="alert alert-error mb-4">
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
          <span>{{ exportError }}</span>
        </div>
      </div>

      <div class="modal-action">
        <button
          type="button"
          class="btn-action-outline"
          :disabled="isExporting"
          @click="closeExportModal"
        >
          {{ exportSuccess ? 'Close' : 'Cancel' }}
        </button>
        <button
          v-if="!exportSuccess"
          type="button"
          class="btn-action-solid"
          :disabled="isExporting || !exportPlaylistName.trim()"
          @click="exportToSpotify"
        >
          <span v-if="isExporting" class="loading loading-spinner loading-sm"></span>
          <span>{{ isExporting ? 'Creating...' : 'Create Playlist' }}</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

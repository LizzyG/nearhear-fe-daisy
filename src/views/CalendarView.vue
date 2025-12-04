<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import FilterChip from '@/components/FilterChip.vue';
import PageHeader from '../components/layout/PageHeader.vue';

import { resolveApiPath } from '@/config/api';
import { apiFetch } from '@/utils/api';
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
  name?: string;
  slug?: string;
  id?: number;
  release_date?: string;
  tracks?: BandcampTrack[];
  // Support both camelCase and snake_case for backward compatibility
  Name?: string;
  Slug?: string;
  ID?: number;
  Tracks?: BandcampTrack[];
}

interface BandcampData {
  artist_name?: string;
  albums?: BandcampAlbum[] | null;
  // Support both camelCase and snake_case for backward compatibility
  ArtistName?: string;
  Albums?: BandcampAlbum[] | null;
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
const STORAGE_KEY = 'nearhear-selected-city';
const selectedCityKey = ref<string | null>(
  localStorage.getItem(STORAGE_KEY)
);
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

const cityEndpoint = resolveApiPath('/media/getSupportedCities');
const filtersEndpoint = resolveApiPath('/media/getFilters');

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
    if (dateParts.length === 3 && year !== undefined && month !== undefined && day !== undefined && !Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
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

interface GetFiltersRequest {
  startDate: string;
  endDate: string;
  city: SupportedCity;
  minShows: number;
}

interface GetEventsRequest {
  Filter: EventsFilter;
  ResultCnt: number;
  Page: number;
}

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

const shows = ref<FullShow[]>([]);
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
  0: 'Unknown',
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
      if (year !== undefined && month !== undefined && day !== undefined && !Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
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

const hasSpotifyTracks = (artist: ArtistInfo) => {
  return artist.SpotifyArtistId && artist.TopTrackIds && artist.TopTrackIds.length > 0;
};

// Get album ID from album object (handles both id and ID fields)
const getAlbumId = (album: BandcampAlbum): number | undefined => {
  const id = album.id ?? album.ID;
  // Bandcamp album IDs must be > 0 to be valid for embedding
  return id && id > 0 ? id : undefined;
};

// Check if artist has valid album data for embedding
const hasBandcampAlbums = (artist: ArtistInfo) => {
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
const getFirstAlbumId = (artist: ArtistInfo): number | undefined => {
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
const getBandcampArtistUrl = (artist: ArtistInfo): string | undefined => {
  if (artist.BandcampArtistSlug && artist.BandcampArtistSlug.trim()) {
    return `https://${artist.BandcampArtistSlug}.bandcamp.com`;
  }
  return undefined;
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
    ResultCnt: 50,
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
      const portland = payload.find(
        (city) => city.City.toLowerCase() === 'portland'
      );
      
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
      body: payload,
    });

    filters.value = data;
    console.log('[fetchFilters] Loaded filters:', data);
    
    // Clear selected filters that are no longer available
    selectedVenues.value = selectedVenues.value.filter((venue) => 
      data.Venues?.includes(venue)
    );
    selectedSpotifyGenres.value = selectedSpotifyGenres.value.filter((genre) => 
      data.SpotifyGenres?.includes(genre)
    );
    selectedBroadGenres.value = selectedBroadGenres.value.filter((genre) => 
      data.BroadGenres?.includes(genre)
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
};

const closeCalendar = () => {
  isCalendarOpen.value = false;
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
      if (year !== undefined && month !== undefined && day !== undefined && !Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        const localDate = new Date(year, month - 1, day);
        return formatLocalIsoDate(localDate);
      }
    }
    return dateStr;
  };

  const parsedStart = parseLocalDate(startValue);
  const parsedEnd = parseLocalDate(endValue);

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
  pendingVenues.value = [...selectedVenues.value];
  isVenuesPanelOpen.value = true;
};

const openGenresPanel = () => {
  pendingSpotifyGenres.value = [...selectedSpotifyGenres.value];
  pendingBroadGenres.value = [...selectedBroadGenres.value];
  isGenresPanelOpen.value = true;
};

const closeVenuesPanel = () => {
  isVenuesPanelOpen.value = false;
};

const closeGenresPanel = () => {
  isGenresPanelOpen.value = false;
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
    <PageHeader title="Upcoming Events" />
    <p v-if="cityLoadError" class="mt-4 text-sm text-error">
      {{ cityLoadError }}
    </p>

    <!-- Filter Bar: Date picker and filter dropdowns -->
    <div ref="pickerRoot" class="relative mt-6">
      <div class="card bg-base-200 border border-base-300 shadow-sm">
        <div class="card-body p-4">
          <div class="flex flex-col md:flex-row flex-wrap gap-4 md:items-center">
            <!-- City Dropdown -->
            <div v-if="supportedCities.length" class="form-control w-full md:flex-1 md:min-w-[220px]">
              <select
                :value="selectedCityKey || ''"
                class="select select-bordered select-sm bg-base-100 h-10 pl-4 w-full"
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
            <div class="relative w-full md:flex-1 md:min-w-[220px]">
              <input
                type="text"
                readonly
                class="input-bordered input w-full cursor-pointer bg-base-100 h-10 pl-4 pr-10 hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
                class="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 pointer-events-none text-base-content/50"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </div>

            <!-- Filter Buttons with AND/OR toggle between them -->
            <template v-if="filters && (filters.Venues?.length || filters.SpotifyGenres?.length || filters.BroadGenres?.length)">
              <!-- Venues Filter Button -->
              <button
                v-if="filters.Venues && filters.Venues.length > 0"
                type="button"
                class="btn btn-sm h-10 bg-base-100 border-base-300 hover:border-primary hover:bg-base-200 w-full md:w-auto md:min-w-[140px]"
                @click="openVenuesPanel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                Venues
                <span v-if="selectedVenues.length > 0" class="badge badge-primary badge-sm ml-1">
                  {{ selectedVenues.length }}
                </span>
              </button>

              <!-- AND/OR Toggle (between Venues and Genres) -->
              <div 
                v-if="selectedVenues.length > 0 && (selectedSpotifyGenres.length > 0 || selectedBroadGenres.length > 0)" 
                class="flex flex-row gap-3 justify-center w-full md:w-auto md:flex-col md:gap-1 md:justify-start"
              >
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="filter-mode"
                    value="venue-and-genre"
                    :checked="filterMode === 'venue-and-genre'"
                    class="radio-custom"
                    @change="filterMode = 'venue-and-genre'; void fetchEvents()"
                  />
                  <span class="text-sm font-medium">AND</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="filter-mode"
                    value="venue-or-genre"
                    :checked="filterMode === 'venue-or-genre'"
                    class="radio-custom"
                    @change="filterMode = 'venue-or-genre'; void fetchEvents()"
                  />
                  <span class="text-sm font-medium">OR</span>
                </label>
              </div>

              <!-- Genres Filter Button -->
              <button
                v-if="(filters.SpotifyGenres && filters.SpotifyGenres.length > 0) || (filters.BroadGenres && filters.BroadGenres.length > 0)"
                type="button"
                class="btn btn-sm h-10 bg-base-100 border-base-300 hover:border-primary hover:bg-base-200 w-full md:w-auto md:min-w-[140px]"
                @click="openGenresPanel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                Genres
                <span v-if="selectedSpotifyGenres.length + selectedBroadGenres.length > 0" class="badge badge-primary badge-sm ml-1">
                  {{ selectedSpotifyGenres.length + selectedBroadGenres.length }}
                </span>
              </button>
            </template>
          </div>
        </div>
      </div>

      <div :class="['modal', isCalendarOpen && 'modal-open']" @keydown.stop="handleCalendarKeydown">
        <div class="modal-box max-w-fit bg-base-200 border border-base-300 shadow-lg">
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

          <div class="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              class="btn btn-outline btn-primary btn-sm"
              @click="clearSelection"
            >
              Clear
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              @click="closeCalendar"
            >
              Close
            </button>
          </div>
        </div>
        <div class="modal-backdrop" @click="closeCalendar"></div>
      </div>
    </div>

    <!-- Venues Filter Panel -->
    <div :class="['modal', isVenuesPanelOpen && 'modal-open']">
      <div class="modal-box max-w-2xl w-full bg-base-100 border border-base-300 shadow-lg space-y-0">
        <div class="flex items-center justify-between pb-4 border-b border-base-300">
          <h2 class="text-lg font-semibold">Filter Venues</h2>
          <button
            type="button"
            class="btn btn-ghost btn-square"
            @click="closeVenuesPanel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="h-6 w-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="py-4">
          <input
            v-model="venueSearchQuery"
            type="text"
            placeholder="Search venues..."
            class="input input-bordered w-full"
          />
        </div>

        <div class="max-h-[50vh] overflow-y-auto py-2">
          <div class="space-y-2">
            <label
              v-for="venue in filteredVenues"
              :key="venue"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="isPendingVenueSelected(venue)"
                class="checkbox checkbox-primary border-base-300"
                @change="togglePendingVenue(venue)"
              />
              <span class="flex-1">{{ venue }}</span>
            </label>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-base-300 flex items-center gap-3">
          <button
            type="button"
            class="btn-action-outline flex-1"
            @click="clearVenuesFilters"
          >
            Clear
          </button>
          <button
            type="button"
            class="btn-action-solid flex-1"
            @click="applyVenuesFilters"
          >
            Apply
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="closeVenuesPanel"></div>
    </div>

    <!-- Genres Filter Panel -->
    <div :class="['modal', isGenresPanelOpen && 'modal-open']">
      <div class="modal-box max-w-2xl w-full bg-base-100 border border-base-300 shadow-lg space-y-0">
        <div class="flex items-center justify-between pb-4 border-b border-base-300">
          <h2 class="text-lg font-semibold">Filter Genres</h2>
          <button
            type="button"
            class="btn btn-ghost btn-square"
            @click="closeGenresPanel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="h-6 w-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="py-4">
          <input
            v-model="genreSearchQuery"
            type="text"
            placeholder="Search genres..."
            class="input input-bordered w-full"
          />
        </div>

        <div class="max-h-[50vh] overflow-y-auto py-2 space-y-6">
          <div v-if="filters && filters.SpotifyGenres && filters.SpotifyGenres.length > 0">
            <h3 class="text-sm font-semibold text-base-content/70 mb-3">Spotify Genres</h3>
            <div class="space-y-2">
              <label
                v-for="genre in filteredSpotifyGenres"
                :key="`spotify-${genre}`"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="isPendingSpotifyGenreSelected(genre)"
                class="checkbox checkbox-primary border-base-300"
                  @change="togglePendingSpotifyGenre(genre)"
                />
                <span class="flex-1">{{ genre }}</span>
              </label>
            </div>
          </div>

          <div v-if="filters && filters.BroadGenres && filters.BroadGenres.length > 0">
            <h3 class="text-sm font-semibold text-base-content/70 mb-3">Broad Genres</h3>
            <div class="space-y-2">
              <label
                v-for="genre in filteredBroadGenres"
                :key="`broad-${genre}`"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="isPendingBroadGenreSelected(genre)"
                class="checkbox checkbox-primary border-base-300"
                  @change="togglePendingBroadGenre(genre)"
                />
                <span class="flex-1">{{ genre }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-base-300 flex items-center gap-3">
          <button
            type="button"
            class="btn-action-outline flex-1"
            @click="clearGenresFilters"
          >
            Clear
          </button>
          <button
            type="button"
            class="btn-action-solid flex-1"
            @click="applyGenresFilters"
          >
            Apply
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="closeGenresPanel"></div>
    </div>

    <!-- Active Filters Chips -->
    <div v-if="selectedVenues.length > 0 || selectedSpotifyGenres.length > 0 || selectedBroadGenres.length > 0" class="mt-6">
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
          class="card bg-base-200 border-2 border-base-300 shadow-md hover:shadow-lg transition-shadow"
        >
          <div class="card-body p-4">
            <!-- Venue and show details at top -->
            <div class="mb-4 pb-3 border-b border-base-300">
              <h4 class="text-base font-semibold text-base-content mb-2">{{ show.Venue.Name }}</h4>
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-base-content/80">
                <p>
                  <span class="font-semibold">Date:</span> {{ formatShowDate(show.Date) }}
                </p>
                <p v-if="hasPrice(show)">
                  <span class="font-semibold">Price:</span> {{ formatPrice(show.PriceLow, show.PriceHigh) }}
                </p>
                <p v-if="show.AgeRange !== undefined && show.AgeRange !== 0">
                  <span class="font-semibold">Age:</span> {{ ageRangeStrings[show.AgeRange] }}
                </p>
                <p v-if="show.Venue.Address" class="truncate max-w-xs">
                  <span class="font-semibold">Location:</span> {{ show.Venue.Address }}
                </p>
              </div>
            </div>

            <!-- Artists with embeds -->
            <div v-if="show.Artists && show.Artists.length > 0" class="space-y-3">
              <!-- Tiled artist info and Spotify embeds -->
              <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 items-end">
                <div
                  v-for="(artist, artistIndex) in show.Artists"
                  :key="artistIndex"
                  class="flex flex-col"
                >
                  <!-- Artist name and genres -->
                  <div class="mb-2">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="text-lg font-semibold text-base-content">{{ artist.ArtistName }}</h3>
                      <!-- Genres as badges for this artist -->
                      <div v-if="artist.Genres && artist.Genres.length > 0" class="flex flex-wrap gap-1">
                        <span
                          v-for="(genre, genreIndex) in artist.Genres"
                          :key="genreIndex"
                          class="badge badge-primary badge-sm"
                        >
                          {{ genre }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Spotify embed -->
                  <div v-if="hasSpotifyTracks(artist)" class="mt-auto">
                    <iframe
                      :src="`https://open.spotify.com/embed/artist/${artist.SpotifyArtistId}?utm_source=generator&theme=0&compact=true`"
                      width="300"
                      height="80"
                      frameborder="0"
                      allowtransparency="true"
                      allow="encrypted-media"
                      class="rounded-md"
                      loading="lazy"
                    ></iframe>
                  </div>
                </div>
              </div>

              <!-- Bandcamp embeds -->
              <div class="space-y-2">
                <div
                  v-for="(artist, artistIndex) in show.Artists"
                  :key="`bandcamp-${artistIndex}`"
                >
                  <!-- Bandcamp album embed (if album data available) -->
                  <div v-if="hasBandcampAlbums(artist)">
                    <iframe
                      :src="`https://bandcamp.com/EmbeddedPlayer/album=${getFirstAlbumId(artist)}/size=small/bgcol=ffffff/linkcol=0687f5/tracklist=false/transparent=true/`"
                      seamless
                      class="w-full h-[120px] border-0 rounded-md"
                      loading="lazy"
                    ></iframe>
                  </div>

                  <!-- Bandcamp artist link (if only slug available, no album data) -->
                  <div v-else-if="getBandcampArtistUrl(artist)">
                    <a
                      :href="getBandcampArtistUrl(artist)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary hover:underline text-sm font-medium"
                    >
                      Listen on Bandcamp →
                    </a>
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

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import PageHeader from '../components/layout/PageHeader.vue';

import { resolveApiPath } from '@/config/api';
import { apiFetch } from '@/utils/api';
import filterListIcon from '@/assets/icons/filter-list.svg';
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
const selectedCityKey = ref<string | null>(null);
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

// Search state for filtering filter lists
const venueSearchQuery = ref('');
const genreSearchQuery = ref('');

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
    const payload = await apiFetch<SupportedCity[]>(cityEndpoint, { method: 'GET' });

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
        void fetchFilters();
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

const handleCityChange = (cityKey: string) => {
  selectedCityKey.value = cityKey;
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

// Filter toggle functions
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
            Date range
          </span>
          <input
            type="text"
            readonly
            class="input-bordered input w-full"
            :value="formattedDateRange"
            placeholder="Select date range"
            @click="openCalendar"
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
            <calendar-range
              :value="calendarRangeValue"
              :first-day-of-week="0"
              :today="''"
              @change="handleRangeChange"
            >
              <calendar-month></calendar-month>
            </calendar-range>

            <div class="mt-3 flex items-center justify-end gap-2">
              <button type="button" class="inactive-filter" @click="clearSelection">Clear</button>
              <button type="button" class="inactive-filter" @click="closeCalendar">Close</button>
            </div>
          </div>
        </div>
      </transition>

      <p v-if="startDate || endDate" class="text-base-content/70 text-sm">
        Range:
        <span class="font-semibold text-primary">
          {{ formattedDateRange }}
        </span>
      </p>
    </div>

    <!-- Filters Section -->
    <div v-if="filters && (filters.Venues?.length || filters.SpotifyGenres?.length || filters.BroadGenres?.length)" class="mt-8 space-y-4">
      <h2 class="text-base-content/60 text-sm font-semibold uppercase tracking-wide">
        Filters
      </h2>

      <div class="flex flex-wrap gap-4">
        <!-- Venues Collapse -->
        <div v-if="filters.Venues && filters.Venues.length > 0" class="collapse collapse-arrow bg-base-200 flex-1 min-w-[280px] max-w-md">
          <input type="checkbox" />
          <div class="collapse-title text-sm font-medium flex items-center gap-2 py-2 min-h-0">
            <img :src="filterListIcon" alt="" class="w-4 h-4" />
            <span>Venues</span>
          </div>
          <div class="collapse-content">
            <div class="space-y-3 pt-2">
              <!-- Search input -->
              <input
                v-model="venueSearchQuery"
                type="text"
                placeholder="Search venues..."
                class="input input-bordered input-sm w-full"
              />
              <!-- Venue buttons -->
              <div class="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                <button
                  v-for="venue in filteredVenues"
                  :key="venue"
                  type="button"
                  :class="{
                    'btn-primary': isVenueSelected(venue),
                    'btn-ghost': !isVenueSelected(venue),
                  }"
                  class="btn btn-sm"
                  @click="toggleVenue(venue)"
                >
                  {{ venue }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Genres Collapse -->
        <div v-if="(filters.SpotifyGenres && filters.SpotifyGenres.length > 0) || (filters.BroadGenres && filters.BroadGenres.length > 0)" class="collapse collapse-arrow bg-base-200 flex-1 min-w-[280px] max-w-md">
          <input type="checkbox" />
          <div class="collapse-title text-sm font-medium flex items-center gap-2 py-2 min-h-0">
            <img :src="filterListIcon" alt="" class="w-4 h-4" />
            <span>Genres</span>
          </div>
          <div class="collapse-content">
            <div class="space-y-4 pt-2">
              <!-- Search input -->
              <input
                v-model="genreSearchQuery"
                type="text"
                placeholder="Search genres..."
                class="input input-bordered input-sm w-full"
              />
              
              <!-- Spotify Genres -->
              <div v-if="filters.SpotifyGenres && filters.SpotifyGenres.length > 0">
                <h4 class="text-xs font-semibold text-base-content/60 mb-2">Spotify Genres</h4>
                <div class="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                  <button
                    v-for="genre in filteredSpotifyGenres"
                    :key="`spotify-${genre}`"
                    type="button"
                    :class="{
                      'btn-primary': isSpotifyGenreSelected(genre),
                      'btn-ghost': !isSpotifyGenreSelected(genre),
                    }"
                    class="btn btn-sm"
                    @click="toggleSpotifyGenre(genre)"
                  >
                    {{ genre }}
                  </button>
                </div>
              </div>

              <!-- Broad Genres -->
              <div v-if="filters.BroadGenres && filters.BroadGenres.length > 0">
                <h4 class="text-xs font-semibold text-base-content/60 mb-2">Broad Genres</h4>
                <div class="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                  <button
                    v-for="genre in filteredBroadGenres"
                    :key="`broad-${genre}`"
                    type="button"
                    :class="{
                      'btn-primary': isBroadGenreSelected(genre),
                      'btn-ghost': !isBroadGenreSelected(genre),
                    }"
                    class="btn btn-sm"
                    @click="toggleBroadGenre(genre)"
                  >
                    {{ genre }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Filters Chips -->
    <div v-if="selectedVenues.length > 0 || selectedSpotifyGenres.length > 0 || selectedBroadGenres.length > 0" class="mt-6">
      <div class="flex flex-wrap gap-2">
        <!-- Venue chips -->
        <div
          v-for="venue in selectedVenues"
          :key="`chip-venue-${venue}`"
          class="badge badge-primary badge-lg gap-2 cursor-pointer"
          @click="removeVenue(venue)"
        >
          <span>{{ venue }}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="inline-block w-4 h-4 stroke-current"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </div>

        <!-- Spotify Genre chips -->
        <div
          v-for="genre in selectedSpotifyGenres"
          :key="`chip-spotify-${genre}`"
          class="badge badge-primary badge-lg gap-2 cursor-pointer"
          @click="removeSpotifyGenre(genre)"
        >
          <span>{{ genre }}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="inline-block w-4 h-4 stroke-current"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </div>

        <!-- Broad Genre chips -->
        <div
          v-for="genre in selectedBroadGenres"
          :key="`chip-broad-${genre}`"
          class="badge badge-primary badge-lg gap-2 cursor-pointer"
          @click="removeBroadGenre(genre)"
        >
          <span>{{ genre }}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="inline-block w-4 h-4 stroke-current"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </div>
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

                  <!-- Bandcamp album embed (if album data available) -->
                  <div
                    v-if="hasBandcampAlbums(artist)"
                    class="mt-1.5"
                  >
                    <iframe
                      :src="`https://bandcamp.com/EmbeddedPlayer/album=${getFirstAlbumId(artist)}/size=small/bgcol=ffffff/linkcol=0687f5/tracklist=false/transparent=true/`"
                      seamless
                      class="w-full h-[120px] border-0 rounded-md"
                      loading="lazy"
                    ></iframe>
                  </div>

                  <!-- Bandcamp artist link (if only slug available, no album data) -->
                  <div
                    v-else-if="getBandcampArtistUrl(artist)"
                    class="mt-1.5"
                  >
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

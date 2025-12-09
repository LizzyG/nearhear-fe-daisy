<script setup lang="ts">
import LazyEmbed from '@/components/LazyEmbed.vue';

// Normalized event type that works for both calendar and liked events
export interface EventArtist {
  name: string;
  spotifyArtistId?: string;
  genres?: string[];
  previewUrls?: string[];
  bandcampAlbumId?: number;
  bandcampArtistSlug?: string;
}

export interface NormalizedEvent {
  id: number | string;
  venue: string;
  venueAddress?: string;
  date: string;
  localDate?: string;
  priceLow?: number;
  priceHigh?: number;
  ageRange?: number;
  artists: EventArtist[];
  infoUrl?: string;
  timeZone?: string;
}

const props = defineProps<{
  event: NormalizedEvent;
  showCalendarActions?: boolean;
}>();

const ageRangeStrings: Record<number, string> = {
  0: '',
  1: '18+',
  2: '21+',
};

const formatPrice = (low?: number, high?: number) => {
  if (!low && !high) return '';
  if (low === high) return `$${low?.toFixed(2)}`;
  return `$${low?.toFixed(2)} - $${high?.toFixed(2)}`;
};

const hasPrice = () => {
  return (
    (props.event.priceLow && props.event.priceLow > 0) ||
    (props.event.priceHigh && props.event.priceHigh > 0)
  );
};

const formatEventDate = (dateString: string, timeZone?: string) => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return dateString;
  }
};

const hasSpotifyTracks = (artist: EventArtist) => {
  return artist.spotifyArtistId && artist.previewUrls && artist.previewUrls.length > 0;
};

const hasBandcampAlbum = (artist: EventArtist) => {
  return artist.bandcampAlbumId && artist.bandcampAlbumId > 0;
};

const getBandcampArtistUrl = (artist: EventArtist): string | undefined => {
  if (artist.bandcampArtistSlug) {
    return `https://${artist.bandcampArtistSlug}.bandcamp.com`;
  }
  return undefined;
};

// Calendar integration
const getGoogleCalendarUrl = (): string => {
  const artistNames = props.event.artists.map((a) => a.name).join(', ') || 'Live Music';
  const title = `${artistNames} at ${props.event.venue}`;
  const showDate = new Date(props.event.date);

  const formatGoogleDate = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  const endDate = new Date(showDate.getTime() + 3 * 60 * 60 * 1000);

  const details = [
    hasPrice() ? `Price: ${formatPrice(props.event.priceLow, props.event.priceHigh)}` : '',
    props.event.ageRange ? `Age: ${ageRangeStrings[props.event.ageRange]}` : '',
    props.event.infoUrl ? `Info: ${props.event.infoUrl}` : '',
  ]
    .filter(Boolean)
    .join('\\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogleDate(showDate)}/${formatGoogleDate(endDate)}`,
    details: details,
    location: props.event.venueAddress || props.event.venue,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const downloadIcsFile = (): void => {
  const artistNames = props.event.artists.map((a) => a.name).join(', ') || 'Live Music';
  const title = `${artistNames} at ${props.event.venue}`;
  const showDate = new Date(props.event.date);
  const endDate = new Date(showDate.getTime() + 3 * 60 * 60 * 1000);

  const formatIcsDate = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  const details = [
    hasPrice() ? `Price: ${formatPrice(props.event.priceLow, props.event.priceHigh)}` : '',
    props.event.ageRange ? `Age: ${ageRangeStrings[props.event.ageRange]}` : '',
    props.event.infoUrl ? `Info: ${props.event.infoUrl}` : '',
  ]
    .filter(Boolean)
    .join('\\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NearHear//Event//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatIcsDate(showDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details}`,
    `LOCATION:${props.event.venueAddress || props.event.venue}`,
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
</script>

<template>
  <div class="p-4">
    <!-- Header row: Venue, Date, Actions -->
    <div class="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div class="flex-1">
        <h4 class="text-base font-semibold text-base-content">{{ event.venue }}</h4>
        <div class="text-base-content/70 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>{{ formatEventDate(event.date, event.timeZone) }}</span>
          <span v-if="hasPrice()">{{ formatPrice(event.priceLow, event.priceHigh) }}</span>
          <span v-if="event.ageRange && event.ageRange !== 0">
            {{ ageRangeStrings[event.ageRange] }}
          </span>
          <span v-if="event.venueAddress" class="max-w-xs truncate">
            {{ event.venueAddress }}
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <!-- Info URL -->
        <a
          v-if="event.infoUrl"
          :href="event.infoUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:bg-primary/10 btn btn-ghost btn-sm gap-1 text-primary"
          title="Event Info"
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
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
          <span class="hidden sm:inline">Info</span>
        </a>

        <!-- Add to Calendar dropdown -->
        <div v-if="showCalendarActions !== false" class="dropdown dropdown-end">
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
              <button type="button" class="flex items-center gap-2" @click="downloadIcsFile">
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
                :href="getGoogleCalendarUrl()"
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
    </div>

    <!-- Artists -->
    <div v-if="event.artists.length > 0" class="flex flex-wrap gap-4">
      <div v-for="(artist, artistIndex) in event.artists" :key="artistIndex" class="flex flex-col">
        <!-- Artist name and genres -->
        <div class="mb-1 flex items-center gap-2">
          <span class="font-medium text-base-content">{{ artist.name }}</span>
          <div v-if="artist.genres && artist.genres.length > 0" class="flex flex-wrap gap-1">
            <span
              v-for="(genre, genreIndex) in artist.genres.slice(0, 2)"
              :key="genreIndex"
              class="badge badge-primary badge-xs"
            >
              {{ genre }}
            </span>
          </div>
        </div>

        <!-- Spotify Embed -->
        <div v-if="hasSpotifyTracks(artist)">
          <LazyEmbed
            :src="`https://open.spotify.com/embed/artist/${artist.spotifyArtistId}?utm_source=generator&theme=0&compact=true`"
            :width="280"
            :height="80"
            class="rounded-md"
          />
        </div>

        <!-- Bandcamp Embed -->
        <div v-else-if="hasBandcampAlbum(artist)">
          <LazyEmbed
            :src="`https://bandcamp.com/EmbeddedPlayer/album=${artist.bandcampAlbumId}/size=small/bgcol=ffffff/linkcol=0687f5/tracklist=false/transparent=true/`"
            :width="280"
            :height="80"
            class="rounded-md border-0"
          />
        </div>

        <!-- Bandcamp Link -->
        <a
          v-else-if="getBandcampArtistUrl(artist)"
          :href="getBandcampArtistUrl(artist)"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm font-medium text-primary hover:underline"
        >
          Listen on Bandcamp →
        </a>

        <!-- Audio Preview fallback -->
        <div
          v-else-if="artist.previewUrls && artist.previewUrls.length > 0 && artist.previewUrls[0]"
          class="mt-1"
        >
          <audio :src="artist.previewUrls[0]" controls preload="none" class="h-8 w-[280px]">
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
    </div>
  </div>
</template>

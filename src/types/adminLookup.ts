/**
 * Types for admin artist lookup functionality
 */

export interface KnownArtist {
  name: string;
  genres?: string[];
}

export interface LookupArtistEntry {
  eventId: number;
  eventArtistId: number;
  artistName: string;
  artistId?: number;
  venue: string;
  date: string;
  localDate: string;
  url: string;
  knownArtists?: KnownArtist[];
}

export interface GetLookupArtistsRequest {
  cityId?: number;
  limit?: number;
  offset?: number;
  daysBack?: number;
}

export interface GetLookupArtistsResponse {
  artists: LookupArtistEntry[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface UpdateEventArtistRequest {
  eventArtistId: number;
  artistName: string;
  spotifyId?: string;
  bandcampSlug?: string;
  instagramHandle?: string;
}

export interface SplitArtist {
  name: string;
  spotifyId?: string;
  bandcampSlug?: string;
  instagramHandle?: string;
}

export interface SplitEventArtistRequest {
  eventArtistId: number;
  artists: SplitArtist[];
}

export interface MarkArtistIgnoreRequest {
  eventArtistId: number;
  reason?: string;
}

// Spotify search result for admin lookup
export interface SpotifySearchResult {
  ArtistName: string;
  SpotifyArtistId?: string;
  SpotifyURL?: string;
  Genres?: string[];
  ImageUrl?: string;
  Popularity?: number;
}

// Scraper status types
export interface ScraperStatus {
  scraperId: number;
  name: string;
  url: string;
  isPaused: boolean;
  lastRunAt?: string;
  lastRunEndedAt?: string;
  lastEventCount: number;
  lastEarliestDate?: string;
  lastLatestDate?: string;
  lastNumPages: number;
  lastSuccessAt?: string;
  lastSuccessCount?: number;
}

export interface GetScraperStatusResponse {
  scrapers: ScraperStatus[];
}


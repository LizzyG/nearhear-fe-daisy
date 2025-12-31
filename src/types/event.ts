export interface SupportedCity {
  City: string;
  State: string;
  StateAbbrev: string;
  CountryAbbrev: string;
  TzName: string;
}

export type AgeRange = 0 | 1 | 2 | 3; // 0 = All Ages, 1 = 18+, 2 = 21+, 3 = Unknown

// Venue type for FullShow
export interface Venue {
  Id?: number;
  Name: string;
  GoogleName?: string;
  Status?: string;
  StreetNumber?: string;
  Street?: string;
  CityStr?: string;
  Zip?: string;
  ZipSuffix?: string;
  State?: string;
  Address?: string;
  Neighborhood?: string;
  Latitude?: number;
  Longitude?: number;
  GoogleId?: string;
  Website?: string;
  InstagramHandle?: string;
  MapsUrl?: string;
  City?: SupportedCity;
}

// Bandcamp types for event artists
export interface BandcampTrack {
  ID: number;
  Slug: string;
  Name: string;
}

export interface BandcampAlbum {
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

export interface BandcampData {
  artist_name?: string;
  albums?: BandcampAlbum[] | null;
  // Support both camelCase and snake_case for backward compatibility
  ArtistName?: string;
  Albums?: BandcampAlbum[] | null;
}

// Full artist info from event API responses (CalendarView)
export interface EventArtistInfo {
  ArtistId: number;
  ArtistName: string;
  SpotifyArtistId: string;
  TopTrackIds: string[];
  PreviewUrls: string[];
  Popularity: number;
  Genres: string[];
  NumMatches: number;
  PossibleMatches: Record<string, unknown>[];
  Aliases: string[];
  InstagramHandle: string;
  BandcampArtistSlug: string;
  BandcampData: BandcampData;
}

// Artist info for submitting shows (subset for FullShow)
export interface ShowArtistInfo {
  ArtistId?: number;
  ArtistName: string;
  SpotifyArtistId?: string;
  TopTrackIds?: string[];
  PreviewUrls?: string[];
  Popularity?: number;
  Genres?: string[];
  NumMatches?: number;
  Aliases?: string[];
  InstagramHandle?: string;
  BandcampArtistSlug?: string;
  BandcampURL?: string;
}

// Festival type for FullShow
export interface Festival {
  Id?: number;
  Name?: string;
  Website?: string;
  StartDate?: string;
  EndDate?: string;
}

// FullShow type for submitting events
export interface FullShow {
  Date: string;
  PriceLow: number;
  PriceHigh: number;
  AgeRange: AgeRange;
  Venue: Venue;
  Urls: string[];
  ImgUrl: string;
  Artists: ShowArtistInfo[];
  Festival?: Festival;
  Status?: string;
}

// Artist reference for user-added events
export interface EventArtistRef {
  artist_id?: number;
  artist_name: string;
}

// User-added event type (matches backend UserAddedEvent)
export interface UserAddedEvent {
  date: string;
  price_low?: number;
  price_high?: number;
  age_range?: AgeRange;
  url: string;
  img_url?: string;
  venue_id?: number;
  venue_name: string;
  city: SupportedCity;
  artists: EventArtistRef[];
}

// ============================================
// API Request/Response types for CalendarView
// ============================================

// Filter configuration for events API
export interface EventsFilter {
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

// Request payload for getFilters API
export interface GetFiltersRequest {
  startDate: string;
  endDate: string;
  city: SupportedCity;
  minShows: number;
}

// Request payload for getEventsByShow API
export interface GetEventsRequest {
  Filter: EventsFilter;
  ResultCnt: number;
  Page: number;
}

// FullShow variant used in CalendarView (with full artist info)
export interface CalendarFullShow {
  Date: string;
  PriceLow: number;
  PriceHigh: number;
  AgeRange: AgeRange;
  Venue: Venue;
  Urls: string[];
  ImgUrl: string;
  Artists: EventArtistInfo[];
  Festival: Festival;
  Status: string;
}

export interface SupportedCity {
  City: string;
  State: string;
  StateAbbrev: string;
  CountryAbbrev: string;
  TzName: string;
}

export type AgeRange = 0 | 1 | 2; // 0 = All Ages, 1 = 18+, 2 = 21+

// Venue type for FullShow
export interface Venue {
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

// Artist info for FullShow
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

export interface SupportedCity {
  City: string;
  State: string;
  StateAbbrev: string;
  CountryAbbrev: string;
  TzName: string;
}

export type AgeRange = 0 | 1 | 2; // 0 = All Ages, 1 = 18+, 2 = 21+

export interface EventArtistInput {
  ArtistName: string;
  SpotifyArtistId?: string;
  BandcampUrl?: string;
  InstagramHandle?: string;
}

export interface AddEventRequest {
  UserId: string;
  Date: string; // ISO datetime string
  City: string;
  State: string;
  VenueName: string;
  EventUrl: string;
  Artists: EventArtistInput[];
  ImageUrl?: string;
  AgeRange?: AgeRange;
  IsFree?: boolean;
  PriceLow?: number;
  PriceHigh?: number;
}

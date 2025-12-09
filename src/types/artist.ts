export interface BandcampAlbum {
  album_id: number;
  title?: string;
}

export interface BandcampData {
  artist_name: string;
  albums: BandcampAlbum[] | null;
}

export interface ArtistInfo {
  ArtistName: string;
  SpotifyArtistId?: string;
  SpotifyURL?: string;
  BandcampURL?: string;
  BandcampArtistSlug?: string;
  BandcampData?: BandcampData;
  InstagramHandle?: string;
  InstagramURL?: string;
  Genres?: string[];
  ImageUrl?: string;
}

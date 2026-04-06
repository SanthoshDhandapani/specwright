export interface Show {
  id: number;
  name: string;
  type: string;
  language: string;
  genres: string[];
  status: string;
  runtime: number | null;
  premiered: string | null;
  ended: string | null;
  rating: { average: number | null };
  image: { medium: string; original: string } | null;
  summary: string | null;
}

export interface ShowSearchResult {
  score: number;
  show: Show;
}

export interface CastMember {
  person: { id: number; name: string; image: { medium: string; original: string } | null };
  character: { id: number; name: string; image: { medium: string; original: string } | null };
}

export interface ShowImage {
  id: number;
  type: string;
  main: boolean;
  resolutions: {
    original: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
  };
}

export interface WatchList {
  id: string;
  name: string;
  showIds: number[];
  createdAt: number;
}

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

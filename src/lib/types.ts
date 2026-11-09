export type Place = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  visitedOn: string; // YYYY-MM-DD
  note: string | null;
  photos: string[];
  createdAt: string;
};

export type PlaceInput = {
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  visitedOn: string;
  note?: string | null;
  photos?: string[];
};

export type SearchResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type Note = {
  id: string;
  text: string;
  createdAt: string; // ISO timestamp — note is visible for 24h from here
};

export const NOTE_TTL_MS = 24 * 60 * 60 * 1000;

export type DailyDay = {
  day: string;
  question: string;
  mine: string | null;
  theirs: string | null;
  theirsAnswered: boolean;
};

export type MatchDay = {
  day: string;
  question: string;
  options: [string, string];
  mine: 0 | 1 | null;
  /** revealed only after I've picked */
  theirs: 0 | 1 | null;
  theirsAnswered: boolean;
  matched: boolean | null;
};

export type MatchStats = { played: number; matched: number; streak: number; history: MatchDay[] };

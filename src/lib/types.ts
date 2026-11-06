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

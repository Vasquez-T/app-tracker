export type ContentProviderName = "tmdb" | "tvmaze";

export interface AppShow {
  id: number;
  provider?: ContentProviderName;
  name: string;
  type: string;
  language: string;
  genres: string[];
  status: string;
  runtime: number | null;
  premiered: string | null;
  ended: string | null;
  officialSite: string | null;
  schedule: { time: string; days: string[] };
  rating: { average: number | null };
  weight: number;
  network: { id: number; name: string; country: { name: string; code: string } } | null;
  webChannel: { id: number; name: string; country: { name: string; code: string } | null } | null;
  image: { medium: string; original: string } | null;
  summary: string | null;
  updated: number;
  seasonCount?: number | null;
  nextEpisodeAirDate?: string | null;
  _links: { self: { href: string }; previousepisode?: { href: string }; nextepisode?: { href: string } };
}

export interface AppEpisode {
  id: number;
  url: string;
  name: string;
  season: number;
  number: number | null;
  type: string;
  airdate: string;
  airtime: string;
  airstamp: string;
  runtime: number | null;
  rating: { average: number | null };
  image: { medium: string; original: string } | null;
  summary: string | null;
  _links: { self: { href: string }; show?: { href: string } };
}

export interface AppScheduleEntry {
  id: number;
  url: string;
  name: string;
  season: number;
  number: number | null;
  type: string;
  airdate: string;
  airtime: string;
  airstamp: string;
  runtime: number | null;
  rating: { average: number | null };
  image: { medium: string; original: string } | null;
  summary: string | null;
  show: AppShow;
  _embedded?: { show: AppShow };
}

export interface AppSearchResult {
  score: number;
  show: AppShow;
}

export interface AppShowImage {
  id: number;
  type: string;
  main: boolean;
  resolutions: {
    original?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
  };
}

import {
  AppEpisode,
  AppScheduleEntry,
  AppSearchResult,
  AppShow,
  AppShowImage,
} from "@/lib/contentTypes";
import { withProviderFallback } from "@/lib/contentProvider";
import { tmdbProvider } from "@/lib/tmdbProvider";
import { tvmazeProvider } from "@/lib/tvmazeProvider";

// Backward-compatible type exports (used across existing components)
export type TVMazeShow = AppShow;
export type TVMazeEpisode = AppEpisode;
export type TVMazeScheduleEntry = AppScheduleEntry;
export type TVMazeSearchResult = AppSearchResult;
export type TVMazeShowImage = AppShowImage;

const callWithFallback = <T>(fn: (provider: typeof tmdbProvider | typeof tvmazeProvider) => Promise<T>) =>
  withProviderFallback(tmdbProvider, tvmazeProvider, fn);

export async function searchShows(query: string): Promise<TVMazeSearchResult[]> {
  return callWithFallback((provider) => provider.searchShows(query));
}

export async function getShow(id: number): Promise<TVMazeShow> {
  return callWithFallback((provider) => provider.getShow(id));
}

export async function getShowEpisodes(id: number, seasonNumber?: number): Promise<TVMazeEpisode[]> {
  return callWithFallback((provider) => provider.getShowEpisodes(id, seasonNumber));
}

export async function getShowImages(id: number): Promise<TVMazeShowImage[]> {
  return callWithFallback((provider) => provider.getShowImages(id));
}

export async function getSchedule(countryCode = "US", date?: string): Promise<TVMazeScheduleEntry[]> {
  return callWithFallback((provider) => provider.getSchedule(countryCode, date));
}

export async function getWebSchedule(date?: string, countryCode?: string): Promise<TVMazeScheduleEntry[]> {
  return callWithFallback((provider) => provider.getWebSchedule(date, countryCode));
}

export function stripHtml(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

export function getShowNetwork(show: TVMazeShow): string {
  return show.network?.name || show.webChannel?.name || "Unknown";
}

export function getShowImage(show: TVMazeShow): string | null {
  return show.image?.original || show.image?.medium || null;
}

export function getBestPosterFromImages(images: TVMazeShowImage[]): string | null {
  const posters = images.filter((img) => img.type === "poster");
  const source = posters.length > 0 ? posters : images;

  if (source.length === 0) return null;

  const sorted = [...source].sort((a, b) => {
    const aArea = (a.resolutions.original?.width || 0) * (a.resolutions.original?.height || 0);
    const bArea = (b.resolutions.original?.width || 0) * (b.resolutions.original?.height || 0);
    return bArea - aArea;
  });

  const best = sorted[0];
  return best.resolutions.original?.url || best.resolutions.medium?.url || null;
}

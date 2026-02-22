import {
  AppEpisode,
  AppScheduleEntry,
  AppSearchResult,
  AppShow,
  AppShowImage,
  ContentProviderName,
} from "@/lib/contentTypes";

export interface ContentProvider {
  name: ContentProviderName;
  isAvailable: () => boolean;
  searchShows: (query: string) => Promise<AppSearchResult[]>;
  getShow: (id: number) => Promise<AppShow>;
  getShowEpisodes: (id: number, seasonNumber?: number) => Promise<AppEpisode[]>;
  getShowImages: (id: number) => Promise<AppShowImage[]>;
  getSchedule: (countryCode?: string, date?: string) => Promise<AppScheduleEntry[]>;
  getWebSchedule: (date?: string, countryCode?: string) => Promise<AppScheduleEntry[]>;
}

export async function withProviderFallback<T>(
  primary: ContentProvider,
  fallback: ContentProvider,
  call: (provider: ContentProvider) => Promise<T>,
): Promise<T> {
  if (primary.isAvailable()) {
    try {
      return await call(primary);
    } catch (error) {
      console.warn(`[contentProvider] ${primary.name} failed, falling back to ${fallback.name}`, error);
    }
  }

  return call(fallback);
}

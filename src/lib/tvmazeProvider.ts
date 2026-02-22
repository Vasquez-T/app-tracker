import {
  AppEpisode,
  AppScheduleEntry,
  AppSearchResult,
  AppShow,
  AppShowImage,
} from "@/lib/contentTypes";
import { ContentProvider } from "@/lib/contentProvider";

const BASE_URL = "https://api.tvmaze.com";

const providerName = "tvmaze" as const;

export const tvmazeProvider: ContentProvider = {
  name: providerName,
  isAvailable: () => true,

  async searchShows(query: string): Promise<AppSearchResult[]> {
    const res = await fetch(`${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed to search shows");
    const data = (await res.json()) as AppSearchResult[];
    return data.map((entry) => ({ ...entry, show: { ...entry.show, provider: providerName } }));
  },

  async getShow(id: number): Promise<AppShow> {
    const res = await fetch(`${BASE_URL}/shows/${id}`);
    if (!res.ok) throw new Error("Failed to fetch show");
    const data = (await res.json()) as AppShow;
    return { ...data, provider: providerName };
  },

  async getShowEpisodes(id: number): Promise<AppEpisode[]> {
    const res = await fetch(`${BASE_URL}/shows/${id}/episodes`);
    if (!res.ok) throw new Error("Failed to fetch episodes");
    return res.json();
  },

  async getShowImages(id: number): Promise<AppShowImage[]> {
    const res = await fetch(`${BASE_URL}/shows/${id}/images`);
    if (!res.ok) throw new Error("Failed to fetch show images");
    return res.json();
  },

  async getSchedule(countryCode = "US", date?: string): Promise<AppScheduleEntry[]> {
    const params = new URLSearchParams({ country: countryCode });
    if (date) params.set("date", date);
    const res = await fetch(`${BASE_URL}/schedule?${params}`);
    if (!res.ok) throw new Error("Failed to fetch schedule");
    const data = (await res.json()) as AppScheduleEntry[];
    return data.map((entry) => ({ ...entry, show: { ...entry.show, provider: providerName } }));
  },

  async getWebSchedule(date?: string, countryCode?: string): Promise<AppScheduleEntry[]> {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (countryCode !== undefined) params.set("country", countryCode);
    const res = await fetch(`${BASE_URL}/schedule/web?${params}`);
    if (!res.ok) throw new Error("Failed to fetch web schedule");
    const data = (await res.json()) as AppScheduleEntry[];
    return data.map((entry) => ({ ...entry, show: { ...entry.show, provider: providerName } }));
  },
};

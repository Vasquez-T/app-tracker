import {
  AppEpisode,
  AppScheduleEntry,
  AppSearchResult,
  AppShow,
  AppShowImage,
} from "@/lib/contentTypes";
import { ContentProvider } from "@/lib/contentProvider";

const providerName = "tmdb" as const;
const TMDB_BASE_URL = import.meta.env.VITE_TMDB_BASE_URL || "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = import.meta.env.VITE_TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

type TMDBShow = {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string | null;
  last_air_date?: string | null;
  status?: string;
  vote_average?: number;
  genre_ids?: number[];
  genres?: Array<{ id: number; name: string }>;
  origin_country?: string[];
  number_of_seasons?: number;
  episode_run_time?: number[];
  next_episode_to_air?: { air_date: string | null } | null;
  networks?: Array<{ id: number; name: string; origin_country?: string }>;
  homepage?: string | null;
};

type TMDBEpisode = {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_number: number;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
  still_path: string | null;
};

let genreCache: Record<number, string> | null = null;

const imageUrl = (path: string | null, size = "w500") =>
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!TMDB_KEY) {
    throw new Error("Missing VITE_TMDB_API_KEY");
  }

  const query = new URLSearchParams({ api_key: TMDB_KEY, language: "en-US", ...params });
  const res = await fetch(`${TMDB_BASE_URL}${path}?${query.toString()}`);
  if (!res.ok) throw new Error(`TMDB request failed: ${path}`);
  return res.json() as Promise<T>;
}

async function getGenreMap(): Promise<Record<number, string>> {
  if (genreCache) return genreCache;
  const data = await tmdbFetch<{ genres: Array<{ id: number; name: string }> }>("/genre/tv/list");
  genreCache = data.genres.reduce<Record<number, string>>((acc, genre) => {
    acc[genre.id] = genre.name;
    return acc;
  }, {});
  return genreCache;
}

function mapShow(show: TMDBShow, genresMap?: Record<number, string>): AppShow {
  const genres = show.genres?.map((g) => g.name) || show.genre_ids?.map((id) => genresMap?.[id]).filter(Boolean) || [];
  const poster = imageUrl(show.poster_path, "w500");
  const backdrop = imageUrl(show.backdrop_path, "w1280");
  const network = show.networks?.[0];

  return {
    provider: providerName,
    id: show.id,
    name: show.name || show.original_name,
    type: "Scripted",
    language: "",
    genres,
    status: show.status || "Running",
    runtime: show.episode_run_time?.[0] ?? null,
    premiered: show.first_air_date ?? null,
    ended: show.status === "Ended" ? show.last_air_date ?? null : null,
    officialSite: show.homepage ?? null,
    schedule: { time: "", days: [] },
    rating: { average: show.vote_average ? Number(show.vote_average.toFixed(1)) : null },
    weight: 0,
    network: network
      ? {
          id: network.id,
          name: network.name,
          country: { name: network.origin_country || "", code: network.origin_country || "" },
        }
      : null,
    webChannel: null,
    image: poster ? { medium: poster, original: poster } : backdrop ? { medium: backdrop, original: backdrop } : null,
    summary: show.overview || null,
    updated: Math.floor(Date.now() / 1000),
    seasonCount: show.number_of_seasons ?? null,
    nextEpisodeAirDate: show.next_episode_to_air?.air_date ?? null,
    _links: { self: { href: `${TMDB_BASE_URL}/tv/${show.id}` } },
  };
}

function mapEpisode(showId: number, ep: TMDBEpisode): AppEpisode {
  const still = imageUrl(ep.still_path, "w500");

  return {
    id: ep.id,
    url: `${TMDB_BASE_URL}/tv/${showId}/season/${ep.season_number}/episode/${ep.episode_number}`,
    name: ep.name,
    season: ep.season_number,
    number: ep.episode_number,
    type: "regular",
    airdate: ep.air_date || "",
    airtime: "",
    airstamp: ep.air_date || "",
    runtime: ep.runtime ?? null,
    rating: { average: ep.vote_average ? Number(ep.vote_average.toFixed(1)) : null },
    image: still ? { medium: still, original: still } : null,
    summary: ep.overview || null,
    _links: { self: { href: `${TMDB_BASE_URL}/tv/${showId}` } },
  };
}

export const tmdbProvider: ContentProvider = {
  name: providerName,
  isAvailable: () => Boolean(TMDB_KEY),

  async searchShows(query: string): Promise<AppSearchResult[]> {
    const genresMap = await getGenreMap();
    const data = await tmdbFetch<{ results: TMDBShow[] }>("/search/tv", { query });
    return data.results.map((show) => ({ score: 1, show: mapShow(show, genresMap) }));
  },

  async getShow(id: number): Promise<AppShow> {
    const data = await tmdbFetch<TMDBShow>(`/tv/${id}`);
    return mapShow(data);
  },

  async getShowEpisodes(id: number, seasonNumber?: number): Promise<AppEpisode[]> {
    if (seasonNumber) {
      const season = await tmdbFetch<{ episodes: TMDBEpisode[] }>(`/tv/${id}/season/${seasonNumber}`);
      return season.episodes.map((episode) => mapEpisode(id, episode));
    }

    const show = await tmdbFetch<TMDBShow>(`/tv/${id}`);
    const seasonCount = show.number_of_seasons || 0;
    if (seasonCount === 0) return [];

    const seasonRequests = Array.from({ length: seasonCount }, (_, idx) => idx + 1).map((season) =>
      tmdbFetch<{ episodes: TMDBEpisode[] }>(`/tv/${id}/season/${season}`)
        .then((data) => data.episodes.map((episode) => mapEpisode(id, episode)))
        .catch(() => []),
    );

    const seasonEpisodes = await Promise.all(seasonRequests);
    return seasonEpisodes.flat().filter((ep) => Boolean(ep.airdate));
  },

  async getShowImages(id: number): Promise<AppShowImage[]> {
    const data = await tmdbFetch<{ posters: Array<{ file_path: string; width: number; height: number }> }>(
      `/tv/${id}/images`,
    );

    return data.posters.map((poster, index) => ({
      id: index + 1,
      type: "poster",
      main: index === 0,
      resolutions: {
        original: {
          url: `${TMDB_IMAGE_BASE}/original${poster.file_path}`,
          width: poster.width,
          height: poster.height,
        },
        medium: {
          url: `${TMDB_IMAGE_BASE}/w500${poster.file_path}`,
          width: Math.round(poster.width / 2),
          height: Math.round(poster.height / 2),
        },
      },
    }));
  },

  async getSchedule(_countryCode = "US", date?: string): Promise<AppScheduleEntry[]> {
    const data = await tmdbFetch<{ results: TMDBShow[] }>("/tv/airing_today", date ? { air_date: date } : {});
    const airDate = date || new Date().toISOString().slice(0, 10);

    return data.results.map((show) => ({
      id: show.id,
      url: `${TMDB_BASE_URL}/tv/${show.id}`,
      name: "Episode airing",
      season: 0,
      number: null,
      type: "regular",
      airdate: airDate,
      airtime: "",
      airstamp: airDate,
      runtime: show.episode_run_time?.[0] ?? null,
      rating: { average: show.vote_average ? Number(show.vote_average.toFixed(1)) : null },
      image: imageUrl(show.poster_path, "w500")
        ? {
            medium: imageUrl(show.poster_path, "w500")!,
            original: imageUrl(show.poster_path, "original")!,
          }
        : null,
      summary: show.overview || null,
      show: mapShow(show),
    }));
  },

  async getWebSchedule(date?: string, countryCode?: string): Promise<AppScheduleEntry[]> {
    return this.getSchedule(countryCode, date);
  },
};

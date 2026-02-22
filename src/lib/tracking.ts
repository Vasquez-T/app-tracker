import { supabase } from "@/lib/supabase";
import { TVMazeEpisode, TVMazeShow } from "@/lib/tvmaze";

export type UserShowStatus = "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch";

export const USER_SHOW_STATUS_LABELS: Record<UserShowStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
  plan_to_watch: "Plan to Watch",
};

export const USER_SHOW_STATUS_OPTIONS: Array<{ value: UserShowStatus; label: string }> = (
  Object.entries(USER_SHOW_STATUS_LABELS) as Array<[UserShowStatus, string]>
).map(([value, label]) => ({ value, label }));

export interface TrackedShowRecord {
  showDbId: string;
  userId: string;
  status: UserShowStatus;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  show: TVMazeShow;
  provider: string;
  externalId: number;
  nextEpisodeAirDate: string | null;
}

export interface WatchedProgressRecord {
  showId: string;
  seasonNumber: number;
  episodeNumber: number;
  externalEpisodeId: number | null;
}

export const getEpisodeProgressKey = (season: number, episodeNumber: number | null) =>
  `${season}::${episodeNumber ?? -1}`;

type ShowRow = {
  id: string;
  provider: string;
  external_id: number;
  metadata: TVMazeShow | null;
  title: string;
  genres: string[];
  show_status: string | null;
  premiered: string | null;
  ended: string | null;
  poster_url: string | null;
  network_name: string | null;
  rating: number | null;
  runtime: number | null;
  season_count: number | null;
  next_episode_air_date: string | null;
};

const toFallbackShow = (row: ShowRow): TVMazeShow => ({
  id: row.external_id,
  provider: row.provider as "tmdb" | "tvmaze",
  name: row.title,
  type: "Scripted",
  language: "",
  genres: row.genres || [],
  status: row.show_status || "Ended",
  runtime: row.runtime,
  premiered: row.premiered,
  ended: row.ended,
  officialSite: null,
  schedule: { time: "", days: [] },
  rating: { average: row.rating },
  weight: 0,
  network: row.network_name
    ? { id: 0, name: row.network_name, country: { name: "", code: "" } }
    : null,
  webChannel: null,
  image: row.poster_url ? { medium: row.poster_url, original: row.poster_url } : null,
  summary: null,
  updated: 0,
  seasonCount: row.season_count,
  nextEpisodeAirDate: row.next_episode_air_date,
  _links: { self: { href: "" } },
});

const mapStatusToOngoingEnded = (status: string | null | undefined) => {
  const value = (status || "").toLowerCase();
  if (["ended", "canceled", "cancelled", "completed"].includes(value)) return "ended";
  return "ongoing";
};

const inferSeasonCount = (show: TVMazeShow) => show.seasonCount ?? null;

export async function upsertShowMetadata(show: TVMazeShow): Promise<string> {
  const provider = show.provider || "tvmaze";
  const externalId = show.id;

  const payload = {
    provider,
    external_id: externalId,
    title: show.name,
    poster_url: show.image?.medium || show.image?.original || null,
    backdrop_url: show.image?.original || show.image?.medium || null,
    overview: show.summary,
    genres: show.genres,
    season_count: inferSeasonCount(show),
    show_status: mapStatusToOngoingEnded(show.status),
    premiered: show.premiered,
    ended: show.ended,
    network_name: show.network?.name || show.webChannel?.name || null,
    rating: show.rating.average,
    runtime: show.runtime,
    next_episode_air_date: show.nextEpisodeAirDate ?? null,
    metadata: show,
    last_synced: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("shows")
    .upsert(payload, { onConflict: "provider,external_id" })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw error || new Error("Failed to upsert show metadata");
  }

  return data.id;
}

export async function trackShowForUser(userId: string, show: TVMazeShow, status: UserShowStatus = "watching") {
  const showId = await upsertShowMetadata(show);

  const { error } = await supabase.from("user_shows").upsert(
    {
      user_id: userId,
      show_id: showId,
      status,
    },
    { onConflict: "user_id,show_id" },
  );

  if (error) throw error;
  return showId;
}

export async function untrackShowForUser(userId: string, show: TVMazeShow) {
  const provider = show.provider || "tvmaze";

  const { data: showRow, error: showLookupError } = await supabase
    .from("shows")
    .select("id")
    .eq("provider", provider)
    .eq("external_id", show.id)
    .maybeSingle();

  if (showLookupError) throw showLookupError;
  if (!showRow?.id) return;

  await supabase.from("episode_progress").delete().eq("user_id", userId).eq("show_id", showRow.id);
  const { error } = await supabase.from("user_shows").delete().eq("user_id", userId).eq("show_id", showRow.id);

  if (error) throw error;
}

export async function updateUserShowStatus(userId: string, showDbId: string, status: UserShowStatus) {
  const { error } = await supabase
    .from("user_shows")
    .update({ status })
    .eq("user_id", userId)
    .eq("show_id", showDbId);

  if (error) throw error;
}

export async function fetchTrackedShows(userId: string): Promise<TrackedShowRecord[]> {
  const { data, error } = await supabase
    .from("user_shows")
    .select(
      "user_id,show_id,status,rating,created_at,updated_at,shows(id,provider,external_id,metadata,title,genres,show_status,premiered,ended,poster_url,network_name,rating,runtime,season_count,next_episode_air_date)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data || []) as Array<Record<string, unknown>>)
    .map((row) => {
      const showRow = row.shows as ShowRow | null;
      if (!showRow) return null;

      const rawShow = showRow.metadata as TVMazeShow | null;
      const mappedShow = rawShow ? ({ ...rawShow, provider: showRow.provider as "tmdb" | "tvmaze" } as TVMazeShow) : toFallbackShow(showRow);

      return {
        showDbId: String(row.show_id),
        userId: String(row.user_id),
        status: row.status as UserShowStatus,
        rating: (row.rating as number | null) ?? null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        show: mappedShow,
        provider: showRow.provider,
        externalId: showRow.external_id,
        nextEpisodeAirDate: showRow.next_episode_air_date,
      } satisfies TrackedShowRecord;
    })
    .filter(Boolean) as TrackedShowRecord[];
}

export async function fetchWatchedEpisodeProgress(userId: string): Promise<WatchedProgressRecord[]> {
  const { data, error } = await supabase
    .from("episode_progress")
    .select("show_id,season_number,episode_number,external_episode_id")
    .eq("user_id", userId)
    .eq("watched", true);

  if (error) throw error;

  return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
    showId: String(row.show_id),
    seasonNumber: Number(row.season_number),
    episodeNumber: Number(row.episode_number),
    externalEpisodeId:
      row.external_episode_id === null || row.external_episode_id === undefined
        ? null
        : Number(row.external_episode_id),
  }));
}

export async function setEpisodeWatched(
  userId: string,
  showId: string,
  seasonNumber: number,
  episodeNumber: number,
  externalEpisodeId: number | null,
  watched: boolean,
) {
  const { error } = await supabase.from("episode_progress").upsert(
    {
      user_id: userId,
      show_id: showId,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      external_episode_id: externalEpisodeId,
      watched,
      watched_at: watched ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,show_id,season_number,episode_number" },
  );

  if (error) throw error;
}

export async function markSeasonWatched(userId: string, showId: string, episodes: TVMazeEpisode[]) {
  const rows = episodes
    .filter((episode) => typeof episode.number === "number")
    .map((episode) => ({
      user_id: userId,
      show_id: showId,
      season_number: episode.season,
      episode_number: episode.number as number,
      external_episode_id: episode.id,
      watched: true,
      watched_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("episode_progress")
    .upsert(rows, { onConflict: "user_id,show_id,season_number,episode_number" });

  if (error) throw error;
}

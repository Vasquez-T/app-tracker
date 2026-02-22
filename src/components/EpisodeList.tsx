import { useState, useEffect } from "react";
import {
  TVMazeShow,
  TVMazeEpisode,
  getShowEpisodes,
  getShowImage,
  getShowNetwork,
  stripHtml,
  getShowImages,
  getBestPosterFromImages,
} from "@/lib/tvmaze";
import { Check, Calendar, ArrowLeft, Loader2, Star } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

interface EpisodeListProps {
  show: TVMazeShow;
  isTracked: boolean;
  watchedEpisodes: Set<number>;
  onToggleWatched: (episode: TVMazeEpisode) => void;
  onBack: () => void;
  onStopTracking: () => void | Promise<void>;
}

const EpisodeList = ({
  show,
  isTracked,
  watchedEpisodes,
  onToggleWatched,
  onBack,
  onStopTracking,
}: EpisodeListProps) => {
  const [episodes, setEpisodes] = useState<TVMazeEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(getShowImage(show));
  const [posterWebpUrl, setPosterWebpUrl] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setSelectedSeason(null);
    getShowEpisodes(show.id)
      .then(setEpisodes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [show.id]);

  useEffect(() => {
    let active = true;
    setPosterWebpUrl(null);
    setPosterUrl(getShowImage(show));

    getShowImages(show.id)
      .then((images) => {
        if (!active) return;
        const best = getBestPosterFromImages(images);
        if (best) setPosterUrl(best);
      })
      .catch(() => {
        // Fallback image is already set.
      });

    return () => {
      active = false;
    };
  }, [show]);

  useEffect(() => {
    if (!posterUrl) {
      setPosterWebpUrl(null);
      return;
    }

    let cancelled = false;
    let generatedObjectUrl: string | null = null;

    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setPosterWebpUrl(null);
        return;
      }

      ctx.drawImage(image, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (cancelled) return;

          if (!blob) {
            setPosterWebpUrl(null);
            return;
          }

          generatedObjectUrl = URL.createObjectURL(blob);
          setPosterWebpUrl(generatedObjectUrl);
        },
        "image/webp",
        0.9,
      );
    };

    image.onerror = () => {
      if (!cancelled) setPosterWebpUrl(null);
    };

    image.src = posterUrl;

    return () => {
      cancelled = true;
      if (generatedObjectUrl) {
        URL.revokeObjectURL(generatedObjectUrl);
      }
    };
  }, [posterUrl]);

  const watched = episodes.filter((e) => watchedEpisodes.has(e.id)).length;
  const seasons = Array.from(new Set(episodes.map((e) => e.season))).sort((a, b) => a - b);
  const activeSeason = selectedSeason ?? seasons[0] ?? null;
  const visibleEpisodes = activeSeason === null ? episodes : episodes.filter((e) => e.season === activeSeason);
  const seasonWatched = visibleEpisodes.filter((e) => watchedEpisodes.has(e.id)).length;

  const ratingLabel = show.rating?.average ? show.rating.average.toFixed(1) : "N/A";
  const premieredLabel = show.premiered ? format(new Date(show.premiered), "MMM d, yyyy") : "Unknown";

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to shows
      </button>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {posterUrl && (
          <img
            src={posterWebpUrl || posterUrl}
            alt={show.name}
            className="w-full max-w-xs sm:max-w-sm md:max-w-none md:w-64 md:h-96 lg:w-72 lg:h-[28rem] rounded-xl object-cover border border-border"
          />
        )}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-3xl font-bold font-display text-foreground">{show.name}</h2>
            {isTracked && (
              <button
                onClick={() => {
                  void onStopTracking();
                }}
                className="h-9 px-3 rounded-md border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
              >
                Stop tracking
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{show.genres.join(", ") || "No genres"}</span>
            <span>·</span>
            <span>{getShowNetwork(show)}</span>
            <span>·</span>
            <span>{show.status}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-primary" /> {ratingLabel}
            </span>
            <span>Premiered: {premieredLabel}</span>
            {show.runtime ? <span>Runtime: {show.runtime}m</span> : null}
          </div>
          {show.summary && <p className="text-base leading-relaxed text-muted-foreground line-clamp-6">{stripHtml(show.summary)}</p>}
          {episodes.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary font-medium">{watched}/{episodes.length}</span>
                <span className="text-muted-foreground">episodes watched</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 mt-2">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(watched / episodes.length) * 100}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {seasons.length > 1 && (
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="hidden sm:flex gap-2 overflow-x-auto pb-1">
                {seasons.map((season) => (
                  <button
                    key={season}
                    onClick={() => setSelectedSeason(season)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      activeSeason === season
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Season {season}
                  </button>
                ))}
              </div>

              <select
                value={activeSeason ?? ""}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                className="sm:hidden h-9 px-3 rounded-md bg-card border border-border text-sm text-foreground"
              >
                {seasons.map((season) => (
                  <option key={season} value={season}>
                    Season {season}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeSeason !== null && (
            <p className="text-xs text-muted-foreground">
              Season {activeSeason}: <span className="text-primary font-medium">{seasonWatched}/{visibleEpisodes.length}</span> watched
            </p>
          )}

          <div className="space-y-2">
            {visibleEpisodes.map((episode, i) => {
              const airDate = episode.airdate ? new Date(episode.airdate) : null;
              const aired = airDate ? isPast(airDate) || isToday(airDate) : false;
              const today = airDate ? isToday(airDate) : false;
              const isWatched = watchedEpisodes.has(episode.id);

              return (
                <div
                  key={episode.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-200 animate-fade-in ${
                    isWatched
                      ? "bg-watched/5 border-watched/20"
                      : today
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card border-border hover:border-muted-foreground/30"
                  }`}
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                >
                  <button
                    onClick={() => onToggleWatched(episode)}
                    disabled={!aired}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                      isWatched
                        ? "bg-watched text-watched-foreground"
                        : aired
                        ? "border-2 border-muted-foreground/30 hover:border-primary hover:text-primary"
                        : "border-2 border-border text-border cursor-not-allowed"
                    }`}
                  >
                    {isWatched && <Check className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-primary">
                        S{episode.season}E{episode.number ?? "?"}
                      </span>
                      {today && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                          TODAY
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${isWatched ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {episode.name}
                    </p>
                  </div>
                  {airDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      <Calendar className="w-3 h-3" />
                      {format(airDate, "MMM d, yyyy")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EpisodeList;

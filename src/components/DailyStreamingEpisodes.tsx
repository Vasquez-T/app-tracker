import { useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List, Loader2, Tv } from "lucide-react";
import { getShowEpisodes, getShowImage, TVMazeEpisode, TVMazeShow } from "@/lib/tvmaze";

interface DailyStreamingEpisodesProps {
  trackedShows: TVMazeShow[];
  onSelectShow: (show: TVMazeShow) => void;
}

interface TrackedEpisode {
  episode: TVMazeEpisode;
  show: TVMazeShow;
}

type DailyStreamingLayout = "list" | "box";

interface WebpImageProps {
  src: string;
  alt: string;
  className?: string;
}

const WebpImage = ({ src, alt, className }: WebpImageProps) => {
  const [webpUrl, setWebpUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let generatedObjectUrl: string | null = null;

    setWebpUrl(null);

    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      if (cancelled) return;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d");
        if (!context) {
          setWebpUrl(null);
          return;
        }

        context.drawImage(image, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (cancelled) return;
            if (!blob) {
              setWebpUrl(null);
              return;
            }

            generatedObjectUrl = URL.createObjectURL(blob);
            setWebpUrl(generatedObjectUrl);
          },
          "image/webp",
          0.9,
        );
      } catch {
        setWebpUrl(null);
      }
    };

    image.onerror = () => {
      if (!cancelled) setWebpUrl(null);
    };

    image.src = src;

    return () => {
      cancelled = true;
      if (generatedObjectUrl) {
        URL.revokeObjectURL(generatedObjectUrl);
      }
    };
  }, [src]);

  return <img src={webpUrl || src} alt={alt} className={className} loading="lazy" />;
};

const toApiDate = (date: Date) => format(date, "yyyy-MM-dd");

const DailyStreamingEpisodes = ({ trackedShows, onSelectShow }: DailyStreamingEpisodesProps) => {
  const [selectedDate, setSelectedDate] = useState(() => toApiDate(new Date()));
  const [trackedEpisodes, setTrackedEpisodes] = useState<TrackedEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<DailyStreamingLayout>("box");

  useEffect(() => {
    if (trackedShows.length === 0) {
      setTrackedEpisodes([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    Promise.all(trackedShows.map((show) => getShowEpisodes(show.id).then((episodes) => ({ show, episodes }))))
      .then((results) => {
        const all: TrackedEpisode[] = [];
        for (const { show, episodes } of results) {
          for (const episode of episodes) {
            if (!episode.airdate) continue;
            all.push({ show, episode });
          }
        }
        setTrackedEpisodes(all);
      })
      .catch((err) => {
        console.error(err);
        setError("Couldn't load episodes from your tracked shows.");
      })
      .finally(() => setLoading(false));
  }, [trackedShows]);

  const selectedDateObj = parseISO(selectedDate);
  const isToday = isSameDay(selectedDateObj, new Date());

  const episodesForDay = useMemo(
    () =>
      trackedEpisodes
        .filter(({ episode }) => isSameDay(parseISO(episode.airdate), selectedDateObj))
        .sort((a, b) => {
          if (a.episode.airtime && b.episode.airtime) return a.episode.airtime.localeCompare(b.episode.airtime);
          if (a.episode.airtime) return -1;
          if (b.episode.airtime) return 1;
          return a.show.name.localeCompare(b.show.name);
        }),
    [trackedEpisodes, selectedDateObj],
  );

  const nextEpisodeDate = useMemo(() => {
    return trackedEpisodes
      .map((item) => parseISO(item.episode.airdate))
      .filter((date) => date >= new Date())
      .sort((a, b) => a.getTime() - b.getTime())[0];
  }, [trackedEpisodes]);

  const changeDate = (days: number) => {
    setSelectedDate(toApiDate(addDays(selectedDateObj, days)));
  };

  if (trackedShows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border border-border rounded-lg bg-card">
        <Tv className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Track shows first to see your daily airing episodes</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">Daily Airings (Tracked Shows)</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-card p-0.5">
            <button
              onClick={() => setLayout("list")}
              className={`h-8 px-2.5 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                layout === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Use list layout"
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setLayout("box")}
              className={`h-8 px-2.5 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                layout === "box"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Use box layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Box
            </button>
          </div>

          <button
            onClick={() => changeDate(-1)}
            className="w-8 h-8 rounded-md flex items-center justify-center bg-card border border-border hover:border-primary/40 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => setSelectedDate(toApiDate(new Date()))}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Today
          </button>

          {nextEpisodeDate && (
            <button
              onClick={() => setSelectedDate(toApiDate(nextEpisodeDate))}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity"
            >
              Next Airing
            </button>
          )}

          <button
            onClick={() => changeDate(1)}
            className="w-8 h-8 rounded-md flex items-center justify-center bg-card border border-border hover:border-primary/40 transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {format(selectedDateObj, "EEEE, MMM d, yyyy")}
          {isToday && <span className="ml-2 text-primary font-medium">(Today)</span>}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-border rounded-lg bg-card">
          {error}
        </div>
      ) : episodesForDay.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-border rounded-lg bg-card">
          <Tv className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tracked episodes airing on this day</p>
        </div>
      ) : (
        layout === "box" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {episodesForDay.map(({ episode, show }, i) => {
              const image = getShowImage(show);

              return (
                <button
                  key={`${episode.id}-${i}`}
                  onClick={() => onSelectShow(show)}
                  className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-secondary/40 transition-all overflow-hidden"
                >
                  <div className="h-56 bg-secondary">
                    {image ? (
                      <WebpImage src={image} alt={show.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tv className="w-5 h-5 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <p className="text-xs text-primary font-mono">
                      S{episode.season}E{episode.number ?? "?"}
                      {episode.airtime && <span className="text-muted-foreground ml-1.5">{episode.airtime}</span>}
                    </p>
                    <p className="text-sm text-foreground line-clamp-2">{episode.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {show.name}
                      {show.webChannel?.name || show.network?.name
                        ? ` • ${show.webChannel?.name || show.network?.name}`
                        : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {episodesForDay.map(({ episode, show }, i) => {
              const image = getShowImage(show);

              return (
                <button
                  key={`${episode.id}-${i}`}
                  onClick={() => onSelectShow(show)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-secondary/40 transition-all"
                >
                  <div className="w-16 h-24 rounded overflow-hidden bg-secondary shrink-0">
                    {image ? (
                      <WebpImage src={image} alt={show.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tv className="w-4 h-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-primary font-mono">
                      S{episode.season}E{episode.number ?? "?"}
                      {episode.airtime && <span className="text-muted-foreground ml-1.5">{episode.airtime}</span>}
                    </p>
                    <p className="text-sm text-foreground truncate">{episode.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {show.name}
                      {show.webChannel?.name || show.network?.name
                        ? ` • ${show.webChannel?.name || show.network?.name}`
                        : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default DailyStreamingEpisodes;
import { useState, useEffect } from "react";
import { getSchedule, getWebSchedule, TVMazeScheduleEntry, getShowImage } from "@/lib/tvmaze";
import { Calendar, Loader2, Tv } from "lucide-react";
import { format } from "date-fns";

interface UpcomingTimelineProps {
  countryCode?: string;
}

const UpcomingTimeline = ({ countryCode = "US" }: UpcomingTimelineProps) => {
  const [entries, setEntries] = useState<TVMazeScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleType, setScheduleType] = useState<"tv" | "web">("tv");

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    setLoading(true);
    const fetcher =
      scheduleType === "tv" ? getSchedule(countryCode, today) : getWebSchedule(today, countryCode);
    fetcher
      .then((data) => setEntries(data.slice(0, 20)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [scheduleType, today, countryCode]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-primary" />
        <h2 className="font-display text-lg font-bold text-foreground">Today's Schedule</h2>
        <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
          {countryCode.toUpperCase()}
        </span>
      </div>

      <div className="flex rounded-lg border border-border overflow-hidden mb-4">
        <button
          onClick={() => setScheduleType("tv")}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            scheduleType === "tv" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          TV
        </button>
        <button
          onClick={() => setScheduleType("web")}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            scheduleType === "web" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          Streaming
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Tv className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No episodes airing today</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {entries.map((entry, i) => {
            const show = entry.show || entry._embedded?.show;
            const image = show ? getShowImage(show) : null;
            return (
              <div
                key={`${entry.id}-${i}`}
                className="flex items-center gap-3 p-2.5 rounded-lg border bg-card border-border animate-slide-in"
                style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
              >
                <div className="w-9 h-13 rounded overflow-hidden bg-secondary shrink-0">
                  {image ? (
                    <img src={image} alt={show?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tv className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-primary font-mono">
                    S{entry.season}E{entry.number ?? "?"}
                    {entry.airtime && <span className="text-muted-foreground ml-1.5">{entry.airtime}</span>}
                  </p>
                  <p className="text-sm text-foreground truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{show?.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingTimeline;

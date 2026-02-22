import { useState, useEffect } from "react";
import { TVMazeShow, TVMazeEpisode, getShowEpisodes, getShowImage } from "@/lib/tvmaze";
import { Calendar, ChevronLeft, ChevronRight, Loader2, Tv } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

interface WeeklyCalendarProps {
  trackedShows: TVMazeShow[];
  onSelectShow: (show: TVMazeShow) => void;
}

interface CalendarEpisode {
  episode: TVMazeEpisode;
  show: TVMazeShow;
}

const WeeklyCalendar = ({ trackedShows, onSelectShow }: WeeklyCalendarProps) => {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [episodesByDay, setEpisodesByDay] = useState<Map<string, CalendarEpisode[]>>(new Map());
  const [loading, setLoading] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (trackedShows.length === 0) {
      setEpisodesByDay(new Map());
      return;
    }

    setLoading(true);
    Promise.all(trackedShows.map((show) => getShowEpisodes(show.id).then((eps) => ({ show, eps }))))
      .then((results) => {
        const map = new Map<string, CalendarEpisode[]>();
        for (const { show, eps } of results) {
          for (const ep of eps) {
            if (!ep.airdate) continue;
            const epDate = new Date(ep.airdate);
            if (days.some((d) => isSameDay(d, epDate))) {
              const key = format(epDate, "yyyy-MM-dd");
              const arr = map.get(key) || [];
              arr.push({ episode: ep, show });
              map.set(key, arr);
            }
          }
        }
        setEpisodesByDay(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [trackedShows, weekStart]);

  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const today = new Date();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">Weekly Calendar</h2>
        </div>

        <div className="space-y-2 lg:space-y-0 lg:flex lg:items-center lg:gap-2">
          <span className="block lg:hidden text-xs text-muted-foreground text-center">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="w-9 h-9 rounded-md flex items-center justify-center bg-card border border-border hover:border-primary/40 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={goToday}
              className="flex-1 lg:flex-none h-9 px-3 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              Today
            </button>

            <button
              onClick={nextWeek}
              className="w-9 h-9 rounded-md flex items-center justify-center bg-card border border-border hover:border-primary/40 transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <span className="hidden lg:block text-sm text-muted-foreground font-medium min-w-[140px] text-center">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
        </div>

        <div className="hidden">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Today
          </button>
          <button
            onClick={prevWeek}
            className="w-8 h-8 rounded-md flex items-center justify-center bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm text-muted-foreground font-medium min-w-[140px] text-center">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <button
            onClick={nextWeek}
            className="w-8 h-8 rounded-md flex items-center justify-center bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {trackedShows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Tv className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Track some shows to see their episodes here</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div>
          <div className="lg:hidden space-y-3">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const isToday = isSameDay(day, today);
              const eps = episodesByDay.get(key) || [];

              return (
                <div
                  key={key}
                  className={`rounded-xl border transition-colors ${
                    isToday ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className={`px-4 py-3 border-b ${isToday ? "border-primary/30" : "border-border"}`}>
                    <p className="text-xs text-muted-foreground">{format(day, "EEEE")}</p>
                    <p className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "MMM d")}
                    </p>
                  </div>

                  <div className="p-2.5 space-y-2">
                    {eps.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No episodes</p>
                    ) : (
                      eps.map(({ episode, show }) => {
                        const image = getShowImage(show);

                        return (
                          <button
                            key={episode.id}
                            onClick={() => onSelectShow(show)}
                            className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/20 transition-all"
                          >
                            <div className="w-12 h-16 rounded overflow-hidden bg-secondary shrink-0">
                              {image ? (
                                <img src={image} alt={show.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Tv className="w-4 h-4 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-mono text-primary">
                                S{episode.season}E{episode.number ?? "?"}
                              </p>
                              <p className="text-sm text-foreground truncate">{show.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{episode.name}</p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden lg:grid grid-cols-7 gap-2">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const isToday = isSameDay(day, today);
              const eps = episodesByDay.get(key) || [];

              return (
                <div
                  key={key}
                  className={`rounded-lg border min-h-[180px] transition-colors ${
                    isToday ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className={`px-3 py-2 border-b ${isToday ? "border-primary/30" : "border-border"}`}>
                    <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                    <p className={`text-lg font-display font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "d")}
                    </p>
                  </div>

                  <div className="p-1.5 space-y-1.5">
                    {eps.length === 0 ? (
                      <p className="text-xs text-muted-foreground/40 text-center py-4">—</p>
                    ) : (
                      eps.map(({ episode, show }) => {
                        const image = getShowImage(show);
                        return (
                          <div
                            key={episode.id}
                            onClick={() => onSelectShow(show)}
                            className="flex items-start gap-1.5 p-1.5 rounded-md bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/20 cursor-pointer transition-all group"
                          >
                            {image && <img src={image} alt={show.name} className="w-6 h-9 rounded object-cover shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-mono text-primary">
                                S{episode.season}E{episode.number ?? "?"}
                              </p>
                              <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">
                                {show.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">{episode.name}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendar;

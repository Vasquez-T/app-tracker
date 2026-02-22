import { TVShow } from "@/lib/showData";
import { Calendar } from "lucide-react";
import { format, isFuture, isToday } from "date-fns";

interface UpcomingTimelineProps {
  shows: TVShow[];
}

const UpcomingTimeline = ({ shows }: UpcomingTimelineProps) => {
  const trackedShows = shows.filter((s) => s.tracked);
  const upcoming = trackedShows
    .flatMap((show) =>
      show.episodes
        .filter((ep) => !ep.watched && (isFuture(new Date(ep.airDate)) || isToday(new Date(ep.airDate))))
        .map((ep) => ({ ...ep, showTitle: show.title, showPoster: show.poster }))
    )
    .sort((a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime())
    .slice(0, 8);

  if (upcoming.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>No upcoming episodes. Track some shows!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {upcoming.map((ep, i) => {
        const today = isToday(new Date(ep.airDate));
        return (
          <div
            key={ep.id}
            className={`flex items-center gap-3 p-3 rounded-lg border animate-slide-in ${
              today ? "bg-primary/10 border-primary/30" : "bg-card border-border"
            }`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <img
              src={ep.showPoster}
              alt={ep.showTitle}
              className="w-10 h-14 rounded object-cover border border-border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-mono">
                S{ep.season}E{ep.episode}
                {today && (
                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    TODAY
                  </span>
                )}
              </p>
              <p className="text-sm text-foreground truncate">{ep.title}</p>
              <p className="text-xs text-muted-foreground truncate">{ep.showTitle}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {format(new Date(ep.airDate), "MMM d")}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default UpcomingTimeline;

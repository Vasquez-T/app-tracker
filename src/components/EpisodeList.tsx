import { Episode, TVShow } from "@/lib/showData";
import { Check, Calendar, ArrowLeft } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

interface EpisodeListProps {
  show: TVShow;
  onToggleWatched: (showId: string, episodeId: string) => void;
  onBack: () => void;
}

const EpisodeList = ({ show, onToggleWatched, onBack }: EpisodeListProps) => {
  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to shows
      </button>

      <div className="flex gap-5 mb-8">
        <img
          src={show.poster}
          alt={show.title}
          className="w-28 h-40 rounded-lg object-cover border border-border"
        />
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl font-bold font-display text-foreground">{show.title}</h2>
          <p className="text-sm text-muted-foreground">
            {show.genre} · {show.network}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary font-medium">
              {show.episodes.filter((e) => e.watched).length}/{show.episodes.length}
            </span>
            <span className="text-muted-foreground">episodes watched</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5 mt-2">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${(show.episodes.filter((e) => e.watched).length / show.episodes.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {show.episodes.map((episode, i) => {
          const airDate = new Date(episode.airDate);
          const aired = isPast(airDate) || isToday(airDate);
          const today = isToday(airDate);

          return (
            <div
              key={episode.id}
              className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-200 animate-fade-in ${
                episode.watched
                  ? "bg-watched/5 border-watched/20"
                  : today
                  ? "bg-primary/5 border-primary/30"
                  : "bg-card border-border hover:border-muted-foreground/30"
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <button
                onClick={() => onToggleWatched(show.id, episode.id)}
                disabled={!aired}
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                  episode.watched
                    ? "bg-watched text-watched-foreground"
                    : aired
                    ? "border-2 border-muted-foreground/30 hover:border-primary hover:text-primary"
                    : "border-2 border-border text-border cursor-not-allowed"
                }`}
              >
                {episode.watched && <Check className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-primary">
                    S{episode.season}E{episode.episode}
                  </span>
                  {today && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                      TODAY
                    </span>
                  )}
                </div>
                <p className={`text-sm truncate ${episode.watched ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {episode.title}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Calendar className="w-3 h-3" />
                {format(airDate, "MMM d")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EpisodeList;

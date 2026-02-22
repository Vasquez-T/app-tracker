import { TVShow } from "@/lib/showData";
import { Badge } from "@/components/ui/badge";
import { Eye, Plus, Check, Tv } from "lucide-react";

interface ShowCardProps {
  show: TVShow;
  onToggleTrack: (id: string) => void;
  onSelect: (id: string) => void;
}

const statusColors: Record<string, string> = {
  airing: "bg-watched/20 text-watched border-watched/30",
  ended: "bg-muted text-muted-foreground border-border",
  upcoming: "bg-primary/20 text-primary border-primary/30",
};

const ShowCard = ({ show, onToggleTrack, onSelect }: ShowCardProps) => {
  const unwatched = show.episodes.filter((e) => !e.watched).length;
  const nextEp = show.episodes.find((e) => !e.watched);

  return (
    <div
      className="group relative rounded-lg overflow-hidden bg-card border border-border hover:border-primary/40 transition-all duration-300 cursor-pointer card-shine animate-fade-in"
      onClick={() => onSelect(show.id)}
    >
      <div className="aspect-[2/3] overflow-hidden relative">
        <img
          src={show.poster}
          alt={show.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <Badge
          className={`absolute top-3 left-3 text-xs border ${statusColors[show.status]}`}
        >
          {show.status}
        </Badge>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleTrack(show.id);
          }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
            show.tracked
              ? "bg-primary text-primary-foreground glow-gold"
              : "bg-card/80 text-muted-foreground hover:bg-card hover:text-foreground"
          }`}
        >
          {show.tracked ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="font-semibold text-sm text-foreground truncate">{show.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Tv className="w-3 h-3" />
          <span>{show.network}</span>
          <span>·</span>
          <span>{show.genre}</span>
        </div>
        {show.tracked && nextEp && (
          <div className="flex items-center gap-1.5 text-xs pt-1">
            <Eye className="w-3 h-3 text-primary" />
            <span className="text-primary">
              S{nextEp.season}E{nextEp.episode}
            </span>
            <span className="text-muted-foreground">
              · {unwatched} unwatched
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowCard;

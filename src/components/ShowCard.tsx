import { TVMazeShow, getShowImage, getShowNetwork } from "@/lib/tvmaze";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Tv } from "lucide-react";

interface ShowCardProps {
  show: TVMazeShow;
  isTracked: boolean;
  onToggleTrack: (show: TVMazeShow) => void;
  onSelect: (show: TVMazeShow) => void;
  mode?: "search" | "tracked";
}

const statusColors: Record<string, string> = {
  Running: "bg-watched/20 text-watched border-watched/30",
  Completed: "bg-muted text-muted-foreground border-border",
  Ended: "bg-muted text-muted-foreground border-border",
  "To Be Determined": "bg-primary/20 text-primary border-primary/30",
  "In Development": "bg-primary/20 text-primary border-primary/30",
};

const ShowCard = ({ show, isTracked, onToggleTrack, onSelect, mode = "search" }: ShowCardProps) => {
  const image = getShowImage(show);
  const network = getShowNetwork(show);

  return (
    <div
      className={`group relative rounded-lg overflow-hidden border transition-all duration-300 cursor-pointer card-shine animate-fade-in ${
        mode === "tracked"
          ? "bg-secondary/30 border-border/70 hover:border-primary/50"
          : "bg-card border-border hover:border-primary/40"
      }`}
      onClick={() => onSelect(show)}
    >
      <div className="aspect-[2/3] overflow-hidden relative bg-secondary">
        {image ? (
          <img
            src={image}
            alt={show.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tv className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        {mode === "search" && (
          <Badge
            className={`absolute top-3 left-3 text-xs border ${statusColors[show.status] || statusColors["Ended"]}`}
          >
            {show.status}
          </Badge>
        )}
        {mode === "search" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleTrack(show);
            }}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              isTracked
                ? "bg-primary text-primary-foreground glow-gold"
                : "bg-card/80 text-muted-foreground hover:bg-card hover:text-foreground"
            }`}
          >
            {isTracked ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        )}
      </div>
      <div className={`p-3 space-y-1.5 ${mode === "tracked" ? "bg-background/70" : ""}`}>
        <h3 className="font-semibold text-sm text-foreground truncate">{show.name}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Tv className="w-3 h-3" />
          <span>{network}</span>
          {show.genres.length > 0 && (
            <>
              <span>·</span>
              <span className="truncate">{show.genres.slice(0, 2).join(", ")}</span>
            </>
          )}
        </div>
        <div className="text-xs">
          <Badge className={`text-[10px] border ${statusColors[show.status] || statusColors["Ended"]}`}>
            {show.status}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default ShowCard;

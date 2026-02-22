import { useState } from "react";
import { initialShows, TVShow } from "@/lib/showData";
import ShowCard from "@/components/ShowCard";
import EpisodeList from "@/components/EpisodeList";
import UpcomingTimeline from "@/components/UpcomingTimeline";
import { Tv, Calendar, Search, Filter } from "lucide-react";

type Tab = "all" | "tracked";

const Index = () => {
  const [shows, setShows] = useState<TVShow[]>(initialShows);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const toggleTrack = (id: string) => {
    setShows((prev) =>
      prev.map((s) => (s.id === id ? { ...s, tracked: !s.tracked } : s))
    );
  };

  const toggleWatched = (showId: string, episodeId: string) => {
    setShows((prev) =>
      prev.map((s) =>
        s.id === showId
          ? {
              ...s,
              episodes: s.episodes.map((e) =>
                e.id === episodeId ? { ...e, watched: !e.watched } : e
              ),
            }
          : s
      )
    );
  };

  const selectedShow = shows.find((s) => s.id === selectedShowId);

  const filteredShows = shows.filter((s) => {
    const matchesTab = tab === "all" || s.tracked;
    const matchesSearch =
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.genre.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const trackedCount = shows.filter((s) => s.tracked).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Tv className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-display font-bold text-gradient-gold">ShowTrackr</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            Tracking <span className="text-primary font-semibold">{trackedCount}</span> shows
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {selectedShow ? (
          <EpisodeList
            show={selectedShow}
            onToggleWatched={toggleWatched}
            onBack={() => setSelectedShowId(null)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            {/* Main content */}
            <div>
              {/* Search & Tabs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search shows..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setTab("all")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                      tab === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Shows
                  </button>
                  <button
                    onClick={() => setTab("tracked")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                      tab === "tracked"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Tracking ({trackedCount})
                  </button>
                </div>
              </div>

              {/* Show Grid */}
              {filteredShows.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredShows.map((show) => (
                    <ShowCard
                      key={show.id}
                      show={show}
                      onToggleTrack={toggleTrack}
                      onSelect={setSelectedShowId}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No shows found</p>
                </div>
              )}
            </div>

            {/* Sidebar - Upcoming */}
            <aside>
              <div className="sticky top-20">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h2 className="font-display text-lg font-bold text-foreground">Upcoming</h2>
                </div>
                <UpcomingTimeline shows={shows} />
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

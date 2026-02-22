import { useState, useCallback } from "react";
import { searchShows, TVMazeShow, TVMazeSearchResult } from "@/lib/tvmaze";
import ShowCard from "@/components/ShowCard";
import EpisodeList from "@/components/EpisodeList";
import UpcomingTimeline from "@/components/UpcomingTimeline";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import { Tv, Search, Filter, Loader2, CalendarDays } from "lucide-react";

type Tab = "search" | "tracked" | "calendar";

const Index = () => {
  const [trackedShows, setTrackedShows] = useState<TVMazeShow[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<number>>(new Set());
  const [selectedShow, setSelectedShow] = useState<TVMazeShow | null>(null);
  const [tab, setTab] = useState<Tab>("search");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<TVMazeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const trackedIds = new Set(trackedShows.map((s) => s.id));

  const handleSearch = useCallback(async () => {
    if (!search.trim()) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const results = await searchShows(search);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }, [search]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const toggleTrack = (show: TVMazeShow) => {
    setTrackedShows((prev) =>
      prev.some((s) => s.id === show.id)
        ? prev.filter((s) => s.id !== show.id)
        : [...prev, show]
    );
  };

  const toggleWatched = (episodeId: number) => {
    setWatchedEpisodes((prev) => {
      const next = new Set(prev);
      if (next.has(episodeId)) next.delete(episodeId);
      else next.add(episodeId);
      return next;
    });
  };

  const displayShows: TVMazeShow[] =
    tab === "tracked" ? trackedShows : tab === "search" ? searchResults.map((r) => r.show) : [];

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
            Tracking <span className="text-primary font-semibold">{trackedShows.length}</span> shows
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {selectedShow ? (
          <EpisodeList
            show={selectedShow}
            watchedEpisodes={watchedEpisodes}
            onToggleWatched={toggleWatched}
            onBack={() => setSelectedShow(null)}
          />
        ) : tab === "calendar" ? (
          <WeeklyCalendar trackedShows={trackedShows} onSelectShow={setSelectedShow} />
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
                    placeholder="Search TV shows..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-9 pr-20 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching || !search.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 transition-opacity"
                  >
                    {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
                  </button>
                </div>
                <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                  <button
                    onClick={() => setTab("search")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                      tab === "search"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Search
                  </button>
                  <button
                    onClick={() => setTab("tracked")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                      tab === "tracked"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Tracking ({trackedShows.length})
                  </button>
                  <button
                    onClick={() => setTab("calendar")}
                    className="px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5 bg-card text-muted-foreground hover:text-foreground"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    Calendar
                  </button>
                </div>
              </div>

              {/* Show Grid */}
              {displayShows.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {displayShows.map((show) => (
                    <ShowCard
                      key={show.id}
                      show={show}
                      isTracked={trackedIds.has(show.id)}
                      onToggleTrack={toggleTrack}
                      onSelect={setSelectedShow}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {tab === "tracked"
                      ? "No tracked shows yet. Search and add some!"
                      : hasSearched
                      ? "No results found"
                      : "Search for a TV show to get started"}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar - Today's Schedule */}
            <aside>
              <div className="sticky top-20">
                <UpcomingTimeline />
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

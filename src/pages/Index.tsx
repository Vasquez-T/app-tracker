import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  getShowImage,
  searchShows,
  TVMazeEpisode,
  TVMazeShow,
  TVMazeSearchResult,
} from "@/lib/tvmaze";
import ShowCard from "@/components/ShowCard";
import EpisodeList from "@/components/EpisodeList";
import UpcomingTimeline from "@/components/UpcomingTimeline";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import DailyStreamingEpisodes from "@/components/DailyStreamingEpisodes";
import { Tv, Search, Filter, Loader2, CalendarDays, X, ChevronDown, Download } from "lucide-react";
import { Link, useMatch, useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Tab = "tracked" | "calendar" | "streaming";

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  show_todays_schedule_sidebar: boolean | null;
  schedule_country_code: string | null;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type TrackedShowRow = {
  tvmaze_show_id: number;
  show_name: string;
  show_status: string | null;
  image_url: string | null;
  network_name: string | null;
  genres: string[];
  premiered: string | null;
  ended: string | null;
  rating: number | null;
  raw_show: TVMazeShow | null;
};

type TrackedGenreFilter = "all" | "comedy" | "action" | "romance";
type TrackedTypeFilter = "all" | "anime" | "series";

const TRACKED_GENRE_OPTIONS: Array<{ value: TrackedGenreFilter; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "comedy", label: "Comedy" },
  { value: "action", label: "Action" },
  { value: "romance", label: "Romance" },
];

const TRACKED_TYPE_OPTIONS: Array<{ value: TrackedTypeFilter; label: string }> = [
  { value: "all", label: "All types" },
  { value: "anime", label: "Anime" },
  { value: "series", label: "Series" },
];

const toFallbackShow = (row: TrackedShowRow): TVMazeShow => ({
  id: row.tvmaze_show_id,
  name: row.show_name,
  type: "Scripted",
  language: "",
  genres: row.genres || [],
  status: row.show_status || "Ended",
  runtime: null,
  premiered: row.premiered,
  ended: row.ended,
  officialSite: null,
  schedule: { time: "", days: [] },
  rating: { average: row.rating },
  weight: 0,
  network: row.network_name
    ? { id: 0, name: row.network_name, country: { name: "", code: "" } }
    : null,
  webChannel: null,
  image: row.image_url ? { medium: row.image_url, original: row.image_url } : null,
  summary: null,
  updated: 0,
  _links: { self: { href: "" } },
});

const getDefaultUsername = (email: string | undefined, userId: string) => {
  const prefix = (email || "user").split("@")[0] || "user";
  return `${prefix}_${userId.slice(0, 6)}`;
};

const slugifyShowName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getShowCategory = (show: TVMazeShow) =>
  show.genres.some((genre) => genre.toLowerCase() === "anime") ? "anime" : "tv-show";

const getShowPath = (show: TVMazeShow) => `/${getShowCategory(show)}/${slugifyShowName(show.name)}`;

const isShowMatchingRoute = (show: TVMazeShow, category: string, slug: string) =>
  getShowCategory(show) === category && slugifyShowName(show.name) === slug;

const Index = () => {
  const navigate = useNavigate();
  const tvShowMatch = useMatch("/tv-show/:slug");
  const animeMatch = useMatch("/anime/:slug");
  const routeCategory = animeMatch ? "anime" : tvShowMatch ? "tv-show" : null;
  const routeSlug = animeMatch?.params.slug ?? tvShowMatch?.params.slug ?? null;
  const isShowRoute = Boolean(routeCategory && routeSlug);

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [showRouteLookupLoading, setShowRouteLookupLoading] = useState(false);
  const [showRouteNotFound, setShowRouteNotFound] = useState(false);

  const [trackedShows, setTrackedShows] = useState<TVMazeShow[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<number>>(new Set());
  const [selectedShow, setSelectedShow] = useState<TVMazeShow | null>(null);
  const [tab, setTab] = useState<Tab>("tracked");

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<TVMazeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [trackedSearch, setTrackedSearch] = useState("");
  const [trackedGenreFilter, setTrackedGenreFilter] = useState<TrackedGenreFilter>("all");
  const [trackedTypeFilter, setTrackedTypeFilter] = useState<TrackedTypeFilter>("all");

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const sessionUserId = session?.user?.id ?? null;
  const sessionUserEmail = session?.user?.email ?? null;

  const trackedIds = useMemo(() => new Set(trackedShows.map((s) => s.id)), [trackedShows]);
  const normalizedTrackedSearch = trackedSearch.trim().toLowerCase();
  const isIOS = useMemo(() => /iphone|ipad|ipod/i.test(window.navigator.userAgent), []);
  const isAndroid = useMemo(() => /android/i.test(window.navigator.userAgent), []);

  const filteredTrackedShows = useMemo(() => {
    return trackedShows.filter((show) => {
      const matchesSearch =
        !normalizedTrackedSearch ||
        show.name.toLowerCase().includes(normalizedTrackedSearch) ||
        show.genres.some((genre) => genre.toLowerCase().includes(normalizedTrackedSearch));

      const matchesGenre =
        trackedGenreFilter === "all" || show.genres.some((genre) => genre.toLowerCase() === trackedGenreFilter);

      const showType = getShowCategory(show) === "anime" ? "anime" : "series";
      const matchesType = trackedTypeFilter === "all" || showType === trackedTypeFilter;

      return matchesSearch && matchesGenre && matchesType;
    });
  }, [trackedShows, normalizedTrackedSearch, trackedGenreFilter, trackedTypeFilter]);

  const hasTrackedFilters =
    Boolean(normalizedTrackedSearch) || trackedGenreFilter !== "all" || trackedTypeFilter !== "all";

  const trackedGenreLabel =
    TRACKED_GENRE_OPTIONS.find((option) => option.value === trackedGenreFilter)?.label || "All categories";
  const trackedTypeLabel =
    TRACKED_TYPE_OPTIONS.find((option) => option.value === trackedTypeFilter)?.label || "All types";

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
      })
      .finally(() => {
        if (active) setLoadingAuth(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Avoid clearing state on transient/null auth events that can happen
      // when the tab regains focus and tokens are refreshed.
      if (event === "SIGNED_OUT") {
        setSession(null);
        return;
      }

      if (nextSession) {
        setSession(nextSession);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const query = search.trim();

    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchShows(query);
        if (!cancelled) setSearchResults(results);
      } catch (e) {
        if (!cancelled) console.error(e);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");

    const updateStandalone = () => {
      const isIosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(displayMode.matches || isIosStandalone);
    };

    updateStandalone();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstallable(false);
      setDeferredInstallPrompt(null);
      setShowInstallHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (typeof displayMode.addEventListener === "function") {
      displayMode.addEventListener("change", updateStandalone);
    } else {
      displayMode.addListener(updateStandalone);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);

      if (typeof displayMode.removeEventListener === "function") {
        displayMode.removeEventListener("change", updateStandalone);
      } else {
        displayMode.removeListener(updateStandalone);
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionUserId) {
      loadedUserIdRef.current = null;
      setProfile(null);
      setTrackedShows([]);
      setWatchedEpisodes(new Set());
      setSelectedShow(null);
      return;
    }

    let active = true;

    const load = async () => {
      const shouldShowLoading = loadedUserIdRef.current !== sessionUserId;
      if (shouldShowLoading) {
        setLoadingUserData(true);
      }

      const userId = sessionUserId;
      const userEmail = sessionUserEmail;

      const profileLookup = await supabase
        .from("profiles")
        .select(
          "id,username,full_name,email,avatar_url,show_todays_schedule_sidebar,schedule_country_code",
        )
        .eq("id", userId)
        .maybeSingle();

      let profileData = (profileLookup.data as ProfileRow | null) ?? null;

      if (!profileData) {
        const fallbackUsername = getDefaultUsername(userEmail ?? undefined, userId);
        await supabase.from("profiles").insert({
          id: userId,
          username: fallbackUsername,
          email: userEmail,
        });

        const profileAfterInsert = await supabase
          .from("profiles")
          .select(
            "id,username,full_name,email,avatar_url,show_todays_schedule_sidebar,schedule_country_code",
          )
          .eq("id", userId)
          .single();

        if (!profileAfterInsert.error) {
          profileData = profileAfterInsert.data as ProfileRow;
        }
      }

      const [trackedRes, watchedRes] = await Promise.all([
        supabase
          .from("tracked_shows")
          .select(
            "tvmaze_show_id,show_name,show_status,image_url,network_name,genres,premiered,ended,rating,raw_show",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("watched_episodes").select("tvmaze_episode_id").eq("user_id", userId),
      ]);

      if (!active) return;

      if (profileData) {
        setProfile(profileData);
      }

      if (!trackedRes.error) {
        const shows = ((trackedRes.data || []) as TrackedShowRow[]).map((row) =>
          row.raw_show ? (row.raw_show as TVMazeShow) : toFallbackShow(row),
        );
        setTrackedShows(shows);
      }

      if (!watchedRes.error) {
        const watched = new Set<number>((watchedRes.data || []).map((e) => e.tvmaze_episode_id));
        setWatchedEpisodes(watched);
      }

      setTab("tracked");
      setSelectedShow(null);
      loadedUserIdRef.current = userId;
      setLoadingUserData(false);
    };

    load().catch((err) => {
      console.error(err);
      if (active) setLoadingUserData(false);
    });

    return () => {
      active = false;
    };
  }, [sessionUserId, sessionUserEmail]);

  useEffect(() => {
    if (!routeCategory || !routeSlug) {
      setShowRouteLookupLoading(false);
      setShowRouteNotFound(false);
      return;
    }

    const normalizedCategory = routeCategory.toLowerCase();
    const normalizedSlug = routeSlug.toLowerCase();

    setShowRouteNotFound(false);

    if (selectedShow && isShowMatchingRoute(selectedShow, normalizedCategory, normalizedSlug)) {
      setShowRouteLookupLoading(false);
      return;
    }

    const trackedMatch = trackedShows.find((show) =>
      isShowMatchingRoute(show, normalizedCategory, normalizedSlug),
    );

    if (trackedMatch) {
      setSelectedShow(trackedMatch);
      setShowRouteLookupLoading(false);
      return;
    }

    let active = true;
    setShowRouteLookupLoading(true);

    searchShows(normalizedSlug.replace(/-/g, " "))
      .then((results) => {
        if (!active) return;

        const exactMatch = results.find(
          ({ show }) =>
            slugifyShowName(show.name) === normalizedSlug && getShowCategory(show) === normalizedCategory,
        );

        if (exactMatch?.show) {
          setSelectedShow(exactMatch.show);
          setShowRouteNotFound(false);
          setShowRouteLookupLoading(false);
          return;
        }

        setSelectedShow(null);
        setShowRouteNotFound(true);
        setShowRouteLookupLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        setSelectedShow(null);
        setShowRouteNotFound(true);
        setShowRouteLookupLoading(false);
      });

    return () => {
      active = false;
    };
  }, [routeCategory, routeSlug, trackedShows, selectedShow]);

  const toggleTrack = async (show: TVMazeShow): Promise<boolean> => {
    if (!session?.user) return false;

    const isTracked = trackedIds.has(show.id);

    if (isTracked) {
      const { error } = await supabase
        .from("tracked_shows")
        .delete()
        .eq("user_id", session.user.id)
        .eq("tvmaze_show_id", show.id);

      if (!error) {
        setTrackedShows((prev) => prev.filter((s) => s.id !== show.id));
        return true;
      }
      return false;
    }

    const payload = {
      user_id: session.user.id,
      tvmaze_show_id: show.id,
      show_name: show.name,
      show_status: show.status,
      image_url: show.image?.medium || show.image?.original || null,
      network_name: show.network?.name || show.webChannel?.name || null,
      genres: show.genres,
      premiered: show.premiered,
      ended: show.ended,
      rating: show.rating.average,
      raw_show: show,
    };

    const { error } = await supabase
      .from("tracked_shows")
      .upsert(payload, { onConflict: "user_id,tvmaze_show_id" });

    if (!error) {
      setTrackedShows((prev) => {
        if (prev.some((s) => s.id === show.id)) return prev;
        return [...prev, show];
      });
      return true;
    }

    return false;
  };

  const clearSearchUI = () => {
    setSearch("");
    setSearchResults([]);
    setSearching(false);
    setShowSearchDropdown(false);
  };

  const resetTrackedFilters = () => {
    setTrackedSearch("");
    setTrackedGenreFilter("all");
    setTrackedTypeFilter("all");
  };

  const handleTrackFromSearch = async (show: TVMazeShow, isTracked: boolean) => {
    const ok = await toggleTrack(show);
    if (ok && !isTracked) {
      clearSearchUI();
    }
  };

  const toggleWatched = async (episode: TVMazeEpisode) => {
    if (!session?.user || !selectedShow) return;

    const alreadyWatched = watchedEpisodes.has(episode.id);

    if (alreadyWatched) {
      const { error } = await supabase
        .from("watched_episodes")
        .delete()
        .eq("user_id", session.user.id)
        .eq("tvmaze_episode_id", episode.id);

      if (!error) {
        setWatchedEpisodes((prev) => {
          const next = new Set(prev);
          next.delete(episode.id);
          return next;
        });
      }
      return;
    }

    const { error } = await supabase.from("watched_episodes").insert({
      user_id: session.user.id,
      tvmaze_episode_id: episode.id,
      tvmaze_show_id: selectedShow.id,
      season: episode.season,
      episode_number: episode.number,
      episode_name: episode.name,
      airdate: episode.airdate || null,
      raw_episode: episode,
    });

    if (!error) {
      setWatchedEpisodes((prev) => {
        const next = new Set(prev);
        next.add(episode.id);
        return next;
      });
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      setAuthError("Missing Supabase environment variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    const email = authEmail.trim();
    const password = authPassword.trim();
    const username = authUsername.trim();

    if (!email || !password) {
      setAuthError("Please enter email and password.");
      setAuthMessage("");
      return;
    }

    if (authMode === "register") {
      if (!username) {
        setAuthError("Please choose a username.");
        setAuthMessage("");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      if (error) {
        setAuthError(error.message);
        setAuthMessage("");
        return;
      }

      setAuthError("");
      setAuthPassword("");

      if (!data.session) {
        setAuthMessage("Account created! Check your email to confirm your account before logging in.");
      } else {
        setAuthMessage("Account created successfully.");
      }

      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthError(error.message);
      setAuthMessage("");
      return;
    }

    setAuthError("");
    setAuthMessage("");
    setAuthPassword("");
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await supabase.auth.signOut();
    clearSearchUI();
    resetTrackedFilters();
  };

  const handleSelectShowFromSearch = (show: TVMazeShow) => {
    navigate(getShowPath(show));
    setSelectedShow(show);
    clearSearchUI();
  };

  const handleGoHome = () => {
    navigate("/");
    setSelectedShow(null);
    setTab("tracked");
  };

  const handleSelectShow = (show: TVMazeShow) => {
    navigate(getShowPath(show));
    setSelectedShow(show);
  };

  const handleStopTrackingSelectedShow = async () => {
    if (!selectedShow || !trackedIds.has(selectedShow.id)) return;
    const removed = await toggleTrack(selectedShow);
    if (removed) {
      handleGoHome();
    }
  };

  const handleInstallClick = async () => {
    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setIsInstallable(false);
      }

      setDeferredInstallPrompt(null);
      setShowInstallHelp(false);
      return;
    }

    if (isIOS || isAndroid) {
      setShowInstallHelp(true);
    }
  };

  const canShowInstallButton = !isStandalone && (isInstallable || isIOS || isAndroid);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md border border-border rounded-xl bg-card p-6 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-display font-bold text-gradient-gold">TVTracker</h1>
            <p className="text-sm text-muted-foreground">Create an account or log in to track your own shows</p>
          </div>

          {canShowInstallButton && (
            <div className="space-y-2">
              <button
                onClick={() => {
                  void handleInstallClick();
                }}
                className="w-full h-10 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:border-primary/40 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install app
              </button>
              {showInstallHelp && (isIOS || isAndroid) && (
                <p className="text-xs text-muted-foreground text-center">
                  {isIOS
                    ? "On iPhone/iPad, tap Share and then Add to Home Screen."
                    : "On Android, open the browser menu and tap Install app or Add to Home screen."}
                </p>
              )}
            </div>
          )}

          {!isSupabaseConfigured && (
            <p className="text-xs text-destructive">
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.
            </p>
          )}

          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
                setAuthMessage("");
              }}
              className={`flex-1 py-2 text-sm font-medium ${
                authMode === "login"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
                setAuthMessage("");
              }}
              className={`flex-1 py-2 text-sm font-medium ${
                authMode === "register"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Username"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />

            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />

            {authError && <p className="text-xs text-destructive">{authError}</p>}
            {authMessage && <p className="text-xs text-primary">{authMessage}</p>}

            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {authMode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const headerName = profile?.username || session.user.email || "User";
  const avatarUrl = profile?.avatar_url || "";
  const avatarInitial = (headerName || "U").charAt(0).toUpperCase();
  const showScheduleSidebar = Boolean(profile?.show_todays_schedule_sidebar);
  const scheduleCountryCode = (profile?.schedule_country_code || "US").toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGoHome}
              className="flex items-center gap-3 hover:opacity-90 transition-opacity"
              aria-label="Go to main view"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tv className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-xl font-display font-bold text-gradient-gold">TVTracker</h1>
            </button>

            {!isShowRoute && (
              <div ref={searchContainerRef} className="relative order-last w-full lg:order-none lg:flex-1 lg:max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search TV shows..."
                  value={search}
                  onFocus={() => setShowSearchDropdown(true)}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  className="w-full h-11 pl-12 pr-20 rounded-lg bg-card border border-border text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                {search.trim() && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={clearSearchUI}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {searching && (
                  <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                )}

                {search.trim() && showSearchDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-border bg-card max-h-[420px] overflow-y-auto z-20 shadow-xl">
                    {searching ? (
                      <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
                    ) : (
                      <div className="p-2 space-y-1">
                        {searchResults.map(({ show }) => {
                          const image = getShowImage(show);
                          const isTracked = trackedIds.has(show.id);

                          return (
                            <div
                              key={show.id}
                              onClick={() => handleSelectShowFromSearch(show)}
                              className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-secondary/60 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-14 rounded overflow-hidden bg-secondary shrink-0">
                                  {image ? (
                                    <img src={image} alt={show.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Tv className="w-4 h-4 text-muted-foreground/40" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm text-foreground truncate">{show.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {show.genres.join(", ") || "No genres"}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleTrackFromSearch(show, isTracked);
                                }}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                  isTracked
                                    ? "bg-primary/15 text-primary"
                                    : "bg-primary text-primary-foreground hover:opacity-90"
                                }`}
                              >
                                {isTracked ? "Tracked" : "Track"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              {!selectedShow && (
                <div className="hidden lg:flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setTab("tracked")}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      tab === "tracked"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Tracking
                  </button>
                  <button
                    onClick={() => setTab("calendar")}
                    className={`px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      tab === "calendar"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    Calendar
                  </button>
                  <button
                    onClick={() => setTab("streaming")}
                    className={`px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      tab === "streaming"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5" />
                    Daily Streaming
                  </button>
                </div>
              )}

              {canShowInstallButton && (
                <button
                  onClick={() => {
                    void handleInstallClick();
                  }}
                  className="hidden lg:inline-flex h-9 px-3 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:border-primary/40 transition-colors items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install app
                </button>
              )}

              <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full"
                    onMouseEnter={() => setUserMenuOpen(true)}
                    onMouseLeave={() => setUserMenuOpen(false)}
                    aria-label="Open user menu"
                  >
                    <Avatar className="h-9 w-9 border border-border">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt={headerName} /> : null}
                      <AvatarFallback>{avatarInitial}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-44"
                  onMouseEnter={() => setUserMenuOpen(true)}
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <DropdownMenuLabel className="truncate">{headerName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      void handleLogout();
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {canShowInstallButton && (
            <button
              onClick={() => {
                void handleInstallClick();
              }}
              className="lg:hidden h-9 w-full rounded-md border border-border bg-card text-xs font-medium text-foreground hover:border-primary/40 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Install app
            </button>
          )}

          {!selectedShow && (
            <div className="flex w-full rounded-lg border border-border overflow-hidden lg:hidden">
              <button
                onClick={() => setTab("tracked")}
                className={`flex-1 px-2 sm:px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === "tracked"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                Tracking
              </button>
              <button
                onClick={() => setTab("calendar")}
                className={`flex-1 px-2 sm:px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  tab === "calendar"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Calendar
              </button>
              <button
                onClick={() => setTab("streaming")}
                className={`flex-1 px-2 sm:px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  tab === "streaming"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                Daily Streaming
              </button>
            </div>
          )}

          {showInstallHelp && (isIOS || isAndroid) && (
            <div className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              {isIOS ? (
                <>
                  On iPhone/iPad: tap <span className="font-medium text-foreground">Share</span> and then
                  <span className="font-medium text-foreground"> Add to Home Screen</span>.
                </>
              ) : (
                <>
                  On Android: open the browser menu and tap
                  <span className="font-medium text-foreground"> Install app</span> or
                  <span className="font-medium text-foreground"> Add to Home screen</span>.
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loadingUserData || showRouteLookupLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : selectedShow ? (
          <EpisodeList
            show={selectedShow}
            isTracked={trackedIds.has(selectedShow.id)}
            watchedEpisodes={watchedEpisodes}
            onToggleWatched={toggleWatched}
            onBack={handleGoHome}
            onStopTracking={handleStopTrackingSelectedShow}
          />
        ) : showRouteNotFound && isShowRoute ? (
          <div className="max-w-3xl mx-auto text-center py-14 border border-border rounded-xl bg-card px-6">
            <h2 className="text-xl font-display font-bold text-foreground mb-2">Show not found for this category</h2>
            <p className="text-sm text-muted-foreground mb-5">
              This URL doesn't match an existing {routeCategory === "anime" ? "anime" : "TV show"}.
            </p>
            <button
              onClick={handleGoHome}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            >
              Go to home
            </button>
          </div>
        ) : (
          <>
            {tab === "calendar" ? (
              <WeeklyCalendar trackedShows={trackedShows} onSelectShow={handleSelectShow} />
            ) : tab === "streaming" ? (
              <DailyStreamingEpisodes trackedShows={trackedShows} onSelectShow={handleSelectShow} />
            ) : (
              <div
                className={`grid grid-cols-1 gap-8 ${
                  showScheduleSidebar ? "lg:grid-cols-[1fr_320px]" : "lg:grid-cols-1"
                }`}
              >
                <div>
                  {trackedShows.length > 0 ? (
                    <>
                      <div className="mb-5 grid grid-cols-1 md:grid-cols-[1fr_180px_160px] gap-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            value={trackedSearch}
                            onChange={(e) => setTrackedSearch(e.target.value)}
                            placeholder="Search tracked shows..."
                            className="w-full h-10 pl-9 pr-9 rounded-lg bg-card border border-border text-sm"
                          />
                          {trackedSearch.trim() && (
                            <button
                              onClick={() => setTrackedSearch("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              aria-label="Clear tracked shows search"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-10 w-full px-3 rounded-lg bg-card border border-border text-sm text-left flex items-center justify-between hover:border-primary/40 transition-colors">
                              <span className="truncate">{trackedGenreLabel}</span>
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-52">
                            <DropdownMenuLabel>Category</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup
                              value={trackedGenreFilter}
                              onValueChange={(value) => setTrackedGenreFilter(value as TrackedGenreFilter)}
                            >
                              {TRACKED_GENRE_OPTIONS.map((option) => (
                                <DropdownMenuRadioItem key={option.value} value={option.value}>
                                  {option.label}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-10 w-full px-3 rounded-lg bg-card border border-border text-sm text-left flex items-center justify-between hover:border-primary/40 transition-colors">
                              <span className="truncate">{trackedTypeLabel}</span>
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44">
                            <DropdownMenuLabel>Show type</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup
                              value={trackedTypeFilter}
                              onValueChange={(value) => setTrackedTypeFilter(value as TrackedTypeFilter)}
                            >
                              {TRACKED_TYPE_OPTIONS.map((option) => (
                                <DropdownMenuRadioItem key={option.value} value={option.value}>
                                  {option.label}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {filteredTrackedShows.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {filteredTrackedShows.map((show) => (
                            <ShowCard
                              key={show.id}
                              show={show}
                              isTracked={trackedIds.has(show.id)}
                              onToggleTrack={(selected) => {
                                void toggleTrack(selected);
                              }}
                              onSelect={handleSelectShow}
                              mode="tracked"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16 text-muted-foreground border border-border rounded-lg bg-card">
                          <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm mb-3">No tracked shows match your filters.</p>
                          {hasTrackedFilters && (
                            <button
                              onClick={resetTrackedFilters}
                              className="h-9 px-3 rounded-md border border-border hover:border-primary/40 text-sm"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No tracked shows yet. Search and add some!</p>
                    </div>
                  )}
                </div>

                {showScheduleSidebar && (
                  <aside>
                    <div className="sticky top-20">
                      <UpcomingTimeline countryCode={scheduleCountryCode} />
                    </div>
                  </aside>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Index;

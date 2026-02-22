import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, UserCircle2 } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  show_todays_schedule_sidebar: boolean | null;
  schedule_country_code: string | null;
};

const COUNTRY_OPTIONS = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "ES", label: "Spain" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "IT", label: "Italy" },
  { code: "BR", label: "Brazil" },
  { code: "AR", label: "Argentina" },
  { code: "MX", label: "Mexico" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
];

const Profile = () => {
  const navigate = useNavigate();

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [showTodaysScheduleSidebar, setShowTodaysScheduleSidebar] = useState(false);
  const [scheduleCountryCode, setScheduleCountryCode] = useState("US");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!isSupabaseConfigured) {
        setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session?.user) {
        setSessionUserId(null);
        setLoading(false);
        return;
      }

      const user = session.user;
      setSessionUserId(user.id);

      const fallbackUsername = `${(user.email || "user").split("@")[0] || "user"}_${user.id.slice(0, 6)}`;

      const profileLookup = await supabase
        .from("profiles")
        .select(
          "id,username,full_name,email,avatar_url,show_todays_schedule_sidebar,schedule_country_code",
        )
        .eq("id", user.id)
        .maybeSingle();

      let profile = (profileLookup.data as ProfileRow | null) ?? null;

      if (!profile) {
        await supabase.from("profiles").insert({
          id: user.id,
          username: fallbackUsername,
          email: user.email ?? null,
          show_todays_schedule_sidebar: false,
          schedule_country_code: "US",
        });

        const profileAfterInsert = await supabase
          .from("profiles")
          .select(
            "id,username,full_name,email,avatar_url,show_todays_schedule_sidebar,schedule_country_code",
          )
          .eq("id", user.id)
          .single();

        if (!profileAfterInsert.error) {
          profile = profileAfterInsert.data as ProfileRow;
        }
      }

      if (!active) return;

      if (!profile) {
        setError("Could not load profile");
        setLoading(false);
        return;
      }

      setUsername(profile.username || "");
      setName(profile.full_name || "");
      setEmail(profile.email || user.email || "");
      setAvatar(profile.avatar_url || "");
      setShowTodaysScheduleSidebar(Boolean(profile.show_todays_schedule_sidebar));
      setScheduleCountryCode((profile.schedule_country_code || "US").toUpperCase());
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      setMessage("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
        setError("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!sessionUserId) {
      setError("You need to be logged in.");
      setMessage("");
      return;
    }

    const nextUsername = username.trim();
    const nextEmail = email.trim();

    if (!nextUsername) {
      setError("Username is required.");
      setMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        username: nextUsername,
        full_name: name.trim() || null,
        email: nextEmail || null,
        avatar_url: avatar.trim() || null,
        show_todays_schedule_sidebar: showTodaysScheduleSidebar,
        schedule_country_code: scheduleCountryCode,
      })
      .eq("id", sessionUserId);

    if (profileError) {
      setSaving(false);
      setError(profileError.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && nextEmail && user.email !== nextEmail) {
      const { error: updateUserError } = await supabase.auth.updateUser({ email: nextEmail });
      if (updateUserError) {
        setSaving(false);
        setError(updateUserError.message);
        return;
      }
      setMessage("Profile updated. Check your inbox to confirm the new email.");
      setSaving(false);
      return;
    }

    setMessage("Profile updated successfully.");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionUserId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">You need to be logged in to edit your profile.</p>
          <Link to="/" className="text-primary underline">
            Go back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:border-primary/40"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-display font-bold text-gradient-gold">Edit Profile</h1>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-3 py-1.5 text-sm rounded-md border border-border hover:border-primary/40"
          >
            Done
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="border border-border rounded-xl bg-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            {avatar.trim() ? (
              <img src={avatar} alt="Profile" className="w-14 h-14 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center border border-border">
                <UserCircle2 className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{name.trim() || username}</p>
              <p className="text-xs text-muted-foreground">{email.trim() || "No email set"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-sm"
              placeholder="Username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-sm"
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-sm"
              placeholder="you@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Profile picture URL</label>
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-sm"
              placeholder="https://..."
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Or upload image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="text-xs text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-border file:bg-card file:text-foreground"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4 bg-background/40">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Today's Schedule Sidebar</p>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Show sidebar on home page</span>
              <input
                type="checkbox"
                checked={showTodaysScheduleSidebar}
                onChange={(e) => setShowTodaysScheduleSidebar(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </label>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Country filter</label>
              <select
                value={scheduleCountryCode}
                onChange={(e) => setScheduleCountryCode(e.target.value)}
                disabled={!showTodaysScheduleSidebar}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-sm disabled:opacity-60"
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label} ({country.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {message && <p className="text-xs text-primary">{message}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Profile;

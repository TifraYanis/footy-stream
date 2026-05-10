import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Globe2,
  Home,
  ListFilter,
  Moon,
  Newspaper,
  Play,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sun,
  Trash2,
  Trophy,
  Tv,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  assetUrl,
  clearFootyCache,
  type CommentaryItem,
  type Match,
  type MatchStats,
  type NewsArticle,
  type RosterAthlete,
  type Sport,
  type StatItem,
  type Stream,
  type TeamSide,
} from "./api/watchfooty";
import {
  useMatchDetailsQuery,
  useMatchesQuery,
  useMatchStatsQuery,
  useNewsQuery,
  useSportsQuery,
  useTopLeaguesQuery,
  useTopTeamsQuery,
} from "./hooks/useFooty";
import {
  TIMEZONE_LABEL,
  compareMatches,
  formatKickoffClock,
  formatKickoffTime,
  getPhase,
  matchClockLabel,
  phaseLabel,
  publishedAgo,
  scoreFor,
  statLabel,
  statNumber,
  statValue,
  streamCount,
  teamInitials,
  teamName,
  todayInputValue,
  toTitleCase,
} from "./utils/format";

type MatchFilter = "all" | "live" | "upcoming" | "finished";
type ThemeMode = "dark" | "light";
type DetailTab = "stats" | "lineups" | "commentary";

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const fallbackSports: Sport[] = [
  { name: "football", displayName: "Football" },
  { name: "basketball", displayName: "Basketball" },
  { name: "hockey", displayName: "Hockey" },
  { name: "tennis", displayName: "Tennis" },
  { name: "baseball", displayName: "Baseball" },
];

const filters: { key: MatchFilter; label: string; icon: IconComponent }[] = [
  { key: "all", label: "Tous", icon: ListFilter },
  { key: "live", label: "Live", icon: Radio },
  { key: "upcoming", label: "A venir", icon: Calendar },
  { key: "finished", label: "Termines", icon: CheckCircle2 },
];

const navItems: { to: string; label: string; icon: IconComponent }[] = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/sports", label: "Sports", icon: Globe2 },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/settings", label: "Parametres", icon: Settings },
];

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = window.localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export default function App() {
  const queryClient = useQueryClient();
  const [theme, setTheme] = usePersistentState<ThemeMode>("footy-stream:theme", "dark");
  const [sport, setSport] = usePersistentState("footy-stream:sport", "football");
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [date, setDate] = useState(todayInputValue());
  const [searchTerm, setSearchTerm] = useState("");

  const sportsQuery = useSportsQuery();
  const sports = sportsQuery.data?.length ? sportsQuery.data : fallbackSports;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const refreshAll = () => {
    void queryClient.invalidateQueries();
  };

  const clearCache = () => {
    clearFootyCache();
    void queryClient.invalidateQueries();
  };

  const appState = {
    sports,
    selectedSport: sport,
    setSport,
    filter,
    setFilter,
    date,
    setDate,
    searchTerm,
    setSearchTerm,
    refreshAll,
    theme,
    setTheme,
    clearCache,
  };

  return (
    <AppShell {...appState}>
      <Routes>
        <Route path="/" element={<DashboardRoute {...appState} />} />
        <Route path="/match/:matchId" element={<DashboardRoute {...appState} />} />
        <Route path="/sports" element={<SportsView {...appState} />} />
        <Route path="/leagues" element={<CollectionView {...appState} type="leagues" />} />
        <Route path="/teams" element={<CollectionView {...appState} type="teams" />} />
        <Route path="/news" element={<NewsView selectedSport={sport} />} />
        <Route
          path="/settings"
          element={<SettingsView theme={theme} setTheme={setTheme} clearCache={clearCache} />}
        />
      </Routes>
    </AppShell>
  );
}

type AppShellProps = {
  children: ReactNode;
  sports: Sport[];
  selectedSport: string;
  setSport: (sport: string) => void;
  filter: MatchFilter;
  setFilter: (filter: MatchFilter) => void;
  date: string;
  setDate: (date: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  refreshAll: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  clearCache: () => void;
};

type AppStateProps = Omit<AppShellProps, "children">;

function AppShell({
  children,
  sports,
  selectedSport,
  setSport,
  filter,
  setFilter,
  date,
  setDate,
  searchTerm,
  setSearchTerm,
  refreshAll,
  theme,
  setTheme,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Shield size={22} />
          </span>
          <span>YanisStream</span>
        </div>

        <nav className="side-nav" aria-label="Navigation principale">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                className={({ isActive }: { isActive: boolean }) => clsx("side-link", isActive && "active")}
                end={item.to === "/"}
                key={item.label}
                to={item.to}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Match center</p>
            <h1>YanisStream</h1>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input
                aria-label="Rechercher un match"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Equipe, ligue, match"
              />
            </label>
            <input
              className="date-input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-label="Date des matchs"
            />
            <button className="icon-button" type="button" onClick={refreshAll} title="Actualiser">
              <RefreshCw size={18} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Changer de theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <section className="sports-strip" aria-label="Sports">
          {sports.slice(0, 8).map((item) => (
            <button
              className={clsx("sport-chip", item.name === selectedSport && "active")}
              key={item.name}
              type="button"
              onClick={() => setSport(item.name)}
            >
              {item.displayName}
            </button>
          ))}
        </section>

        <section className="filter-strip" aria-label="Filtres de matchs">
          {filters.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={clsx("filter-chip", item.key === filter && "active")}
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
          <span className="timezone-pill">{TIMEZONE_LABEL}</span>
        </section>

        {children}
      </main>
    </div>
  );
}

type DashboardRouteProps = Omit<AppStateProps, "theme" | "setTheme" | "clearCache">;

function DashboardRoute(props: DashboardRouteProps) {
  const params = useParams();
  return <DashboardView {...props} selectedMatchId={params.matchId} />;
}

type DashboardViewProps = DashboardRouteProps & {
  selectedMatchId?: string;
};

function DashboardView({
  selectedSport,
  filter,
  date,
  searchTerm,
  setSearchTerm,
  selectedMatchId,
}: DashboardViewProps) {
  const navigate = useNavigate();
  const matchesQuery = useMatchesQuery(selectedSport, date, filter);
  const detailsQuery = useMatchDetailsQuery(selectedMatchId);
  const topLeaguesQuery = useTopLeaguesQuery(selectedSport);
  const topTeamsQuery = useTopTeamsQuery(selectedSport);
  const newsQuery = useNewsQuery(selectedSport);

  const matches = useMemo(() => {
    const base = matchesQuery.data ?? [];
    return base
      .filter((match) => matchesFilter(match, filter))
      .filter((match) => matchesSearch(match, searchTerm))
      .toSorted(compareMatches);
  }, [filter, matchesQuery.data, searchTerm]);

  const selectedMatch = useMemo(() => {
    const fromRoute = selectedMatchId
      ? matches.find((match) => match.matchId === selectedMatchId) ?? detailsQuery.data
      : undefined;
    return fromRoute ?? bestMatch(matches);
  }, [detailsQuery.data, matches, selectedMatchId]);

  const statsQuery = useMatchStatsQuery(selectedMatch?.matchId);
  const applyQuickSearch = (value: string) => {
    setSearchTerm(value);
    navigate("/");
  };

  return (
    <div className="dashboard">
      <section className="match-column">
        <MatchListPanel
          isLoading={matchesQuery.isLoading}
          matches={matches}
          selectedMatchId={selectedMatch?.matchId}
          onSelect={(match) => navigate(`/match/${match.matchId}`)}
        />
        <UpcomingPanel matches={matchesQuery.data ?? []} onSelect={(match) => navigate(`/match/${match.matchId}`)} />
      </section>

      <section className="center-column">
        <MatchStage match={selectedMatch} stats={statsQuery.data ?? undefined} />
        <MatchDetailPanel
          isStatsLoading={statsQuery.isLoading}
          match={selectedMatch}
          stats={statsQuery.data ?? undefined}
        />
        <SideStatsPanel match={selectedMatch} stats={statsQuery.data ?? undefined} />
      </section>

      <section className="bottom-grid">
        <InfoPanel icon={Globe2} title="Sports">
          <MiniList
            items={fallbackSports.map((sport) => sport.displayName)}
            renderIcon={(index) => ["Football", "Basketball", "Hockey", "Tennis", "Baseball"][index]?.slice(0, 2)}
          />
        </InfoPanel>
        <InfoPanel icon={Trophy} title="Raccourcis ligues">
          <MiniList items={(topLeaguesQuery.data ?? []).slice(0, 6)} onSelect={applyQuickSearch} />
        </InfoPanel>
        <InfoPanel icon={Users} title="Raccourcis equipes">
          <MiniList items={(topTeamsQuery.data ?? []).slice(0, 6).map(toTitleCase)} onSelect={applyQuickSearch} />
        </InfoPanel>
        <InfoPanel icon={Newspaper} title="News">
          <NewsMiniList articles={(newsQuery.data ?? []).slice(0, 3)} />
        </InfoPanel>
      </section>
    </div>
  );
}

function matchesFilter(match: Match, filter: MatchFilter) {
  const phase = getPhase(match.status);
  if (filter === "all") {
    return true;
  }
  if (filter === "live") {
    return phase === "live";
  }
  if (filter === "upcoming") {
    return phase === "upcoming";
  }
  return phase === "finished" || phase === "canceled";
}

function matchesSearch(match: Match, term: string) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    match.title,
    match.league,
    match.teams?.home?.name,
    match.teams?.away?.name,
    match.sport,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalized));
}

function bestMatch(matches: Match[]) {
  return (
    matches.find((match) => getPhase(match.status) === "live" && streamCount(match) > 0) ??
    matches.find((match) => streamCount(match) > 0) ??
    matches.find((match) => getPhase(match.status) === "live") ??
    matches[0]
  );
}

type MatchListPanelProps = {
  matches: Match[];
  selectedMatchId?: string;
  isLoading: boolean;
  onSelect: (match: Match) => void;
};

type MatchLeagueGroup = {
  league: string;
  liveCount: number;
  matches: Match[];
};

function groupMatchesByLeague(matches: Match[]) {
  const groups = new Map<string, MatchLeagueGroup>();

  matches.forEach((match) => {
    const league = leagueLabel(match);
    const group = groups.get(league) ?? { league, liveCount: 0, matches: [] };
    group.matches.push(match);
    if (getPhase(match.status) === "live") {
      group.liveCount += 1;
    }
    groups.set(league, group);
  });

  return Array.from(groups.values());
}

function leagueLabel(match: Match) {
  return match.league?.trim() || toTitleCase(match.sport || "Sport");
}

function MatchListPanel({ matches, selectedMatchId, isLoading, onSelect }: MatchListPanelProps) {
  const groups = useMemo(() => groupMatchesByLeague(matches), [matches]);

  return (
    <section className="panel match-list-panel">
      <PanelHeading icon={Radio} title="Matchs" meta={`${matches.length} matchs`} />
      <div className="match-list">
        {isLoading ? (
          <SkeletonRows count={7} />
        ) : matches.length ? (
          groups.map((group) => (
            <section className="league-group" key={group.league}>
              <div className="league-group-heading">
                <span>{group.league}</span>
                <small>{group.liveCount ? `${group.liveCount} en direct` : `${group.matches.length} matchs`}</small>
              </div>
              {group.matches.map((match) => (
                <button
                  className={clsx("match-row", match.matchId === selectedMatchId && "active")}
                  key={match.matchId}
                  type="button"
                  onClick={() => onSelect(match)}
                >
                  <MatchTimeBadge match={match} />
                  <TeamLogo team={match.teams?.home} compact />
                  <span className="match-row-main">
                    <span className="match-title">{match.title}</span>
                    <span className="match-meta">
                      <span>{phaseLabel(match.status)}</span>
                      <span>Debut {formatKickoffClock(match)}</span>
                      {streamCount(match) ? <span>{streamCount(match)} flux</span> : null}
                    </span>
                  </span>
                  <span className="match-score">{scoreLine(match)}</span>
                  <StatusDot match={match} />
                </button>
              ))}
            </section>
          ))
        ) : (
          <EmptyState icon={Tv} title="Aucun match" text="Change le sport, la date ou le filtre." />
        )}
      </div>
    </section>
  );
}

function MatchTimeBadge({ match }: { match: Match }) {
  const phase = getPhase(match.status);
  const kickoff = formatKickoffClock(match);
  const minute =
    match.currentMinute?.trim() ||
    (typeof match.currentMinuteNumber === "number" ? `${match.currentMinuteNumber}'` : "");
  const primary =
    phase === "live"
      ? minute
        ? `Live ${minute}`
        : "Live"
      : phase === "finished"
        ? "Termine"
        : phase === "canceled"
          ? "Annule"
          : kickoff;
  const secondary = phase === "upcoming" ? "Debut" : `Debut ${kickoff}`;

  return (
    <span className={clsx("match-time-badge", phase)} title={`${phaseLabel(match.status)} - ${TIMEZONE_LABEL}: ${kickoff}`}>
      <strong>{primary}</strong>
      <small>{secondary}</small>
    </span>
  );
}

type UpcomingPanelProps = {
  matches: Match[];
  onSelect: (match: Match) => void;
};

function UpcomingPanel({ matches, onSelect }: UpcomingPanelProps) {
  const upcoming = matches
    .filter((match) => getPhase(match.status) === "upcoming")
    .toSorted(compareMatches)
    .slice(0, 5);

  return (
    <section className="panel compact-panel">
      <PanelHeading icon={Clock} title="A venir" meta={TIMEZONE_LABEL} />
      <div className="stack">
        {upcoming.length ? (
          upcoming.map((match) => (
            <button className="upcoming-row" key={match.matchId} type="button" onClick={() => onSelect(match)}>
              <span>
                <strong>{match.title}</strong>
                <small>{match.league}</small>
              </span>
              <time>{formatKickoffTime(match)}</time>
            </button>
          ))
        ) : (
          <p className="muted">Aucun match programme dans cette selection.</p>
        )}
      </div>
    </section>
  );
}

type MatchStageProps = {
  match?: Match;
  stats?: MatchStats | null;
};

function MatchStage({ match, stats }: MatchStageProps) {
  const [selectedStreamId, setSelectedStreamId] = useState<string>();
  const streams = useMemo(() => sortStreams(match?.streams ?? []), [match?.streams]);
  const activeStream = streams.find((stream) => stream.id === selectedStreamId) ?? streams[0];
  const mergedMatch = stats ?? match;

  useEffect(() => {
    setSelectedStreamId(streams[0]?.id);
  }, [match?.matchId, streams]);

  if (!match) {
    return (
      <section className="panel stage-panel">
        <EmptyState icon={Tv} title="Selection vide" text="Aucun match disponible pour cette vue." />
      </section>
    );
  }

  const score = scoreFor(mergedMatch);

  return (
    <section className="panel stage-panel">
      <div className="scoreboard">
        <TeamIdentity team={match.teams?.home} side="home" />
        <div className="score-center">
          <span className="league-badge">{match.league || toTitleCase(match.sport || "Sport")}</span>
          <strong>
            {score.home} - {score.away}
          </strong>
          <small>{matchClockLabel(match)}</small>
        </div>
        <TeamIdentity team={match.teams?.away} side="away" />
      </div>

      <StreamPlayer match={match} stream={activeStream} />

      {streams.length > 1 ? (
        <div className="stream-strip" aria-label="Sources du stream">
          {streams.slice(0, 12).map((stream, index) => (
            <button
              className={clsx("stream-chip", activeStream?.id === stream.id && "active")}
              key={stream.id}
              type="button"
              onClick={() => setSelectedStreamId(stream.id)}
            >
              <Play size={13} />
              {stream.language || stream.source || `Flux ${index + 1}`}
              <span>{stream.quality || "SD"}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function sortStreams(streams: Stream[]) {
  return streams
    .filter((stream) => !stream.nsfw && Boolean(stream.url))
    .map((stream, index) => ({ stream, index }))
    .toSorted((left, right) => {
      const scoreDiff = streamScore(right.stream) - streamScore(left.stream);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return left.index - right.index;
    })
    .map((item) => item.stream);
}

function streamScore(stream: Stream) {
  return (
    qualityScore(stream.quality) * 10_000 +
    stabilityScore(stream) * 1_000 +
    languageScore(stream.language) * 100
  );
}

function qualityScore(value?: string) {
  const normalized = value?.toLowerCase() ?? "";
  const numeric = Number.parseInt(normalized, 10);

  if (Number.isFinite(numeric)) {
    return numeric;
  }

  if (normalized.includes("4k") || normalized.includes("uhd")) {
    return 2160;
  }
  if (normalized.includes("fhd") || normalized.includes("full")) {
    return 1080;
  }
  if (normalized.includes("hd")) {
    return 720;
  }
  if (normalized.includes("sd")) {
    return 480;
  }

  return 0;
}

function stabilityScore(stream: Stream) {
  const source = stream.source?.toLowerCase() ?? "";
  const sourceScore =
    {
      deluxe: 5,
      prime: 4,
      sigma: 3,
      regular: 2,
    }[source] ?? 1;

  return sourceScore + (stream.isRedirect ? 0 : 2) + (stream.ads ? 0 : 1);
}

function languageScore(value?: string) {
  const normalized = value?.toLowerCase().replace(/[^a-z0-9-]/g, "") ?? "";

  if (
    normalized === "english" ||
    ["en", "gb", "uk", "us", "au", "za"].includes(normalized)
  ) {
    return 3;
  }

  if (normalized === "arabic" || normalized === "arab" || ["ar", "ara", "sa", "mena"].includes(normalized)) {
    return 2;
  }

  return 1;
}

function StreamPlayer({ match, stream }: { match: Match; stream?: Stream }) {
  if (!stream?.url) {
    return (
      <div
        className="stream-placeholder"
        style={{
            backgroundImage: match.poster
              ? `linear-gradient(rgba(3, 6, 5, 0.28), rgba(3, 6, 5, 0.84)), url(${assetUrl(match.poster)})`
              : undefined,
        }}
      >
        <div>
          <Tv size={34} />
          <strong>Stream indisponible</strong>
          <span>{phaseLabel(match.status)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="stream-frame">
      <iframe
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={stream.url}
        title={`Stream ${match.title}`}
      />
    </div>
  );
}

type MatchDetailPanelProps = {
  match?: Match;
  stats?: MatchStats | null;
  isStatsLoading: boolean;
};

function MatchDetailPanel({ match, stats, isStatsLoading }: MatchDetailPanelProps) {
  const [tab, setTab] = useState<DetailTab>("stats");

  if (!match) {
    return null;
  }

  return (
    <section className="panel detail-panel">
      <div className="tab-list" role="tablist" aria-label="Details du match">
        {[
          { key: "stats", label: "Stats", icon: BarChart3 },
          { key: "lineups", label: "Compos", icon: Users },
          { key: "commentary", label: "Commentaires", icon: Activity },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={clsx("tab-button", tab === item.key && "active")}
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as DetailTab)}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "stats" ? <StatsRows stats={stats} isLoading={isStatsLoading} /> : null}
      {tab === "lineups" ? <Lineups stats={stats} /> : null}
      {tab === "commentary" ? <Commentary stats={stats} /> : null}
    </section>
  );
}

function StatsRows({ stats, isLoading }: { stats?: MatchStats | null; isLoading: boolean }) {
  const rows = getStatsRows(stats).slice(0, 8);

  if (isLoading) {
    return <SkeletonRows count={5} />;
  }

  if (!rows.length) {
    return <EmptyState icon={BarChart3} title="Stats indisponibles" text="WatchFooty ne publie pas encore les stats de ce match." />;
  }

  return (
    <div className="stats-table">
      {rows.map((row) => (
        <MetricRow key={row.label} row={row} />
      ))}
    </div>
  );
}

type StatRow = {
  label: string;
  home?: StatItem;
  away?: StatItem;
};

function getStatsRows(stats?: MatchStats | null): StatRow[] {
  const teams = stats?.statistics?.boxscore?.teams ?? [];
  const homeStats = teams[0]?.statistics ?? [];
  const awayStats = teams[1]?.statistics ?? [];
  const labels = Array.from(new Set([...homeStats.map(statLabel), ...awayStats.map(statLabel)]));

  return labels.map((label) => ({
    label,
    home: homeStats.find((stat) => statLabel(stat) === label),
    away: awayStats.find((stat) => statLabel(stat) === label),
  }));
}

function MetricRow({ row }: { row: StatRow }) {
  const homeNumber = statNumber(row.home);
  const awayNumber = statNumber(row.away);
  const max = Math.max(homeNumber, awayNumber, 1);
  const homeWidth = row.label.toLowerCase().includes("possession") ? homeNumber : (homeNumber / max) * 100;
  const awayWidth = row.label.toLowerCase().includes("possession") ? awayNumber : (awayNumber / max) * 100;

  return (
    <div className="metric-row">
      <span className="metric-value">{statValue(row.home)}</span>
      <div className="metric-bars">
        <span>{row.label}</span>
        <div className="dual-bar" aria-hidden="true">
          <i style={{ width: `${Math.min(homeWidth, 100)}%` }} />
          <b style={{ width: `${Math.min(awayWidth, 100)}%` }} />
        </div>
      </div>
      <span className="metric-value right">{statValue(row.away)}</span>
    </div>
  );
}

function SideStatsPanel({ match, stats }: { match?: Match; stats?: MatchStats | null }) {
  const rows = getStatsRows(stats);
  const possession = rows.find((row) => row.label.toLowerCase().includes("possession"));
  const homePossession = Math.round(statNumber(possession?.home));
  const awayPossession = Math.max(0, 100 - homePossession || Math.round(statNumber(possession?.away)));
  const score = scoreFor(stats ?? match);

  return (
    <section className="panel stats-side">
      <PanelHeading icon={BarChart3} title="Statistiques detaillees" meta={match ? phaseLabel(match.status) : ""} />

      {match ? (
        <>
          <div
            className="possession-ring"
            style={{ "--possession": `${homePossession || 50}%` } as CSSProperties}
          >
            <div>
              <strong>{homePossession || 50}%</strong>
              <span>{awayPossession || 50}%</span>
            </div>
          </div>

          <div className="stat-section">
            <h3>Resume</h3>
            <MetricMini label="Score" home={String(score.home)} away={String(score.away)} />
            <MetricMini label="Flux" home={String(streamCount(match))} away="sources" />
            <MetricMini label={TIMEZONE_LABEL} home={matchClockLabel(match)} away={formatKickoffTime(match)} />
          </div>

          <div className="stat-section">
            <h3>Match</h3>
            {rows.slice(0, 6).map((row) => (
              <MetricMini key={row.label} label={row.label} home={statValue(row.home)} away={statValue(row.away)} />
            ))}
            {!rows.length ? <p className="muted">Stats avancees non disponibles.</p> : null}
          </div>
        </>
      ) : (
        <EmptyState icon={BarChart3} title="Aucun match" text="Selectionne un match pour afficher les donnees." />
      )}
    </section>
  );
}

function MetricMini({ label, home, away }: { label: string; home: string; away: string }) {
  return (
    <div className="mini-metric">
      <strong>{home}</strong>
      <span>{label}</span>
      <strong>{away}</strong>
    </div>
  );
}

function Lineups({ stats }: { stats?: MatchStats | null }) {
  const rosters = stats?.statistics?.rosters ?? [];

  if (!rosters.length) {
    return <EmptyState icon={Users} title="Compos indisponibles" text="Aucune composition publiee pour ce match." />;
  }

  return (
    <div className="lineups-grid">
      {rosters.slice(0, 2).map((group, index) => (
        <div className="lineup" key={`${group.formation}-${index}`}>
          <h3>{index === 0 ? "Domicile" : "Exterieur"} {group.formation ? `(${group.formation})` : ""}</h3>
          <div className="player-list">
            {(group.roster ?? []).filter(isStarter).slice(0, 11).map((player) => (
              <PlayerRow key={`${player.jersey}-${player.athlete?.fullName}`} player={player} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function isStarter(player: RosterAthlete) {
  return player.starter !== false;
}

function PlayerRow({ player }: { player: RosterAthlete }) {
  const goal = player.plays?.some((play) => play.scoringPlay);
  const card = player.plays?.find((play) => play.yellowCard || play.redCard);

  return (
    <div className="player-row">
      <span>{player.jersey || "--"}</span>
      <strong>{player.athlete?.fullName || "Joueur"}</strong>
      {goal ? <Zap size={14} className="event-icon" /> : null}
      {card ? <span className={clsx("card-dot", card.redCard && "red")} /> : null}
    </div>
  );
}

function Commentary({ stats }: { stats?: MatchStats | null }) {
  const comments = stats?.statistics?.commentary ?? [];

  if (!comments.length) {
    return <EmptyState icon={Activity} title="Commentaires indisponibles" text="Aucun fil d'evenements pour ce match." />;
  }

  return (
    <div className="commentary-list">
      {comments.slice(0, 12).map((item) => (
        <CommentaryRow item={item} key={`${item.sequence}-${item.time?.displayValue}`} />
      ))}
    </div>
  );
}

function CommentaryRow({ item }: { item: CommentaryItem }) {
  return (
    <div className="commentary-row">
      <time>{item.time?.displayValue || "--"}</time>
      <p>{item.text}</p>
    </div>
  );
}

function TeamIdentity({ team, side }: { team?: TeamSide; side: "home" | "away" }) {
  return (
    <div className={clsx("team-identity", side)}>
      <TeamLogo team={team} />
      <strong>{teamName(team)}</strong>
    </div>
  );
}

function TeamLogo({ team, compact = false }: { team?: TeamSide; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const url = assetUrl(team?.logoUrl);

  return (
    <span className={clsx("team-logo", compact && "compact")}>
      {url && !failed ? <img alt="" src={url} onError={() => setFailed(true)} loading="lazy" /> : <b>{teamInitials(team)}</b>}
    </span>
  );
}

function StatusDot({ match }: { match: Match }) {
  const phase = getPhase(match.status);
  return <span className={clsx("status-dot", phase)} title={phaseLabel(match.status)} />;
}

function scoreLine(match: Match) {
  const score = scoreFor(match);
  if (getPhase(match.status) === "upcoming") {
    return formatKickoffClock(match);
  }
  return `${score.home} - ${score.away}`;
}

function PanelHeading({ icon: Icon, title, meta }: { icon: IconComponent; title: string; meta?: string }) {
  return (
    <div className="panel-heading">
      <span>
        <Icon size={17} />
        {title}
      </span>
      {meta ? <small>{meta}</small> : null}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: IconComponent; title: string; text: string }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="skeleton-stack">
      {Array.from({ length: count }, (_, index) => (
        <span className="skeleton-row" key={index} />
      ))}
    </div>
  );
}

function InfoPanel({ icon, title, children }: { icon: IconComponent; title: string; children: ReactNode }) {
  return (
    <section className="panel info-panel">
      <PanelHeading icon={icon} title={title} />
      {children}
    </section>
  );
}

function MiniList({
  items,
  renderIcon,
  onSelect,
}: {
  items: string[];
  renderIcon?: (index: number) => string | undefined;
  onSelect?: (item: string) => void;
}) {
  return (
    <div className="mini-list">
      {items.map((item, index) => (
        <button key={`${item}-${index}`} type="button" onClick={() => onSelect?.(item)} disabled={!onSelect}>
          <b>{renderIcon?.(index) ?? `${index + 1}`}</b>
          {item}
        </button>
      ))}
    </div>
  );
}

function NewsMiniList({ articles }: { articles: NewsArticle[] }) {
  if (!articles.length) {
    return <p className="muted">Aucune news disponible.</p>;
  }

  return (
    <div className="news-mini-list">
      {articles.map((article) => (
        <article key={article.id}>
          {article.imageUrl ? <img alt="" src={article.imageUrl} loading="lazy" /> : <span className="image-fallback" />}
          <div>
            <strong>{article.headline}</strong>
            <small>{publishedAgo(article.publishedAt)}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function SportsView({ sports, selectedSport, setSport }: AppStateProps) {
  const navigate = useNavigate();

  return (
    <section className="page-panel">
      <PageTitle icon={Globe2} title="Sports" subtitle={`${sports.length} sports disponibles`} />
      <div className="sports-grid">
        {sports.map((sport) => (
          <button
            className={clsx("sport-card", sport.name === selectedSport && "active")}
            key={sport.name}
            type="button"
            onClick={() => {
              setSport(sport.name);
              navigate("/");
            }}
          >
            <Globe2 size={20} />
            <strong>{sport.displayName}</strong>
            <span>{sport.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CollectionView({ selectedSport, type }: AppStateProps & { type: "leagues" | "teams" }) {
  const leaguesQuery = useTopLeaguesQuery(selectedSport);
  const teamsQuery = useTopTeamsQuery(selectedSport);
  const items = type === "leagues" ? leaguesQuery.data ?? [] : (teamsQuery.data ?? []).map(toTitleCase);
  const Icon = type === "leagues" ? Trophy : Users;

  return (
    <section className="page-panel">
      <PageTitle
        icon={Icon}
        title={type === "leagues" ? "Top ligues" : "Equipes populaires"}
        subtitle={toTitleCase(selectedSport)}
      />
      <div className="collection-grid">
        {items.slice(0, 72).map((item, index) => (
          <article className="collection-item" key={`${item}-${index}`}>
            <span>{index + 1}</span>
            <strong>{item}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function NewsView({ selectedSport }: { selectedSport: string }) {
  const newsQuery = useNewsQuery(selectedSport);
  const articles = newsQuery.data ?? [];

  return (
    <section className="page-panel">
      <PageTitle icon={Newspaper} title="News" subtitle={toTitleCase(selectedSport)} />
      <div className="news-grid">
        {articles.slice(0, 18).map((article) => (
          <article className="news-card" key={article.id}>
            {article.imageUrl ? <img alt="" src={article.imageUrl} loading="lazy" /> : <span className="image-fallback" />}
            <div>
              <small>{publishedAgo(article.publishedAt)}</small>
              <h2>{article.headline}</h2>
              <p>{article.description}</p>
              <a href={`https://watchfooty.st/en/news/article/${article.id}`} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                Ouvrir
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsView({
  theme,
  setTheme,
  clearCache,
}: {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  clearCache: () => void;
}) {
  return (
    <section className="page-panel settings-page">
      <PageTitle icon={Settings} title="Configuration" subtitle="Preferences locales" />
      <div className="settings-grid">
        <article className="setting-row">
          <div>
            <Sun size={18} />
            <strong>Theme</strong>
          </div>
          <div className="segmented">
            <button className={clsx(theme === "light" && "active")} type="button" onClick={() => setTheme("light")}>
              Clair
            </button>
            <button className={clsx(theme === "dark" && "active")} type="button" onClick={() => setTheme("dark")}>
              Sombre
            </button>
          </div>
        </article>

        <article className="setting-row">
          <div>
            <Database size={18} />
            <strong>Cache API</strong>
          </div>
          <button className="danger-button" type="button" onClick={clearCache}>
            <Trash2 size={16} />
            Vider le cache
          </button>
        </article>

        <article className="setting-row">
          <div>
            <Shield size={18} />
            <strong>A propos</strong>
          </div>
          <span className="version-pill">YanisStream v1.0</span>
        </article>
      </div>
    </section>
  );
}

function PageTitle({ icon: Icon, title, subtitle }: { icon: IconComponent; title: string; subtitle: string }) {
  return (
    <div className="page-title">
      <span>
        <Icon size={22} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

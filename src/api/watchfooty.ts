export const API_ORIGIN = "https://api.watchfooty.st";
const API_BASE = `${API_ORIGIN}/api/v1`;
const CACHE_PREFIX = "footy-stream:cache:";
const CACHE_VERSION = "1";

export const cacheTtl = {
  sports: 24 * 60 * 60 * 1000,
  matches: 60 * 1000,
  liveMatches: 25 * 1000,
  details: 90 * 1000,
  stats: 90 * 1000,
  collections: 12 * 60 * 60 * 1000,
  news: 2 * 60 * 1000,
};

export type Sport = {
  name: string;
  displayName: string;
  cutoffDate?: string;
};

export type TeamSide = {
  name?: string;
  logoUrl?: string;
  logoId?: string;
};

export type Stream = {
  id: string;
  url: string;
  source?: string;
  quality?: string;
  language?: string;
  isRedirect?: boolean;
  nsfw?: boolean;
  ads?: boolean;
};

export type Match = {
  matchId: string;
  title: string;
  poster?: string;
  teams?: {
    home?: TeamSide;
    away?: TeamSide;
  };
  scores?: {
    home?: number;
    away?: number;
  };
  homeScore?: number;
  awayScore?: number;
  status?: string;
  currentMinute?: string;
  currentMinuteNumber?: number;
  isEvent?: boolean;
  date?: string;
  timestamp?: number;
  league?: string;
  leagueLogo?: string;
  leagueLogoId?: string;
  sport?: string;
  streams?: Stream[];
  venue?: string;
  note?: string;
  eventName?: string;
};

export type StatItem = {
  name?: string;
  label?: string;
  displayValue?: string;
  percentage?: number;
};

export type BoxScoreTeam = {
  team?: {
    displayName?: string;
    logoId?: string;
  };
  statistics?: StatItem[];
};

export type RosterAthlete = {
  starter?: boolean;
  jersey?: string;
  athlete?: {
    fullName?: string;
    headshot?: string;
  };
  plays?: {
    scoringPlay?: boolean;
    yellowCard?: boolean;
    redCard?: boolean;
    clock?: {
      displayValue?: string;
    };
  }[];
};

export type RosterGroup = {
  formation?: string;
  roster?: RosterAthlete[];
};

export type CommentaryItem = {
  sequence?: number;
  time?: {
    displayValue?: string;
    value?: string;
  };
  text?: string;
};

export type MatchStats = Match & {
  statistics?: {
    boxscore?: {
      teams?: BoxScoreTeam[];
      form?: unknown[];
    };
    rosters?: RosterGroup[];
    commentary?: CommentaryItem[];
    venue?: string;
    header?: {
      league?: {
        slug?: string;
      };
    };
  };
};

export type NewsArticle = {
  id: string;
  headline: string;
  description?: string;
  imageUrl?: string;
  publishedAt?: string;
  editedAt?: string | null;
  sport?: string;
  author?: string;
  url?: string;
};

type CacheRecord<T> = {
  value: T;
  expiresAt: number;
  savedAt: number;
  version: string;
};

function localStore() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function cacheKey(path: string) {
  return `${CACHE_PREFIX}${path}`;
}

function readCache<T>(path: string) {
  const store = localStore();
  if (!store) {
    return undefined;
  }

  const raw = store.getItem(cacheKey(path));
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as CacheRecord<T>;
    if (parsed.version !== CACHE_VERSION) {
      store.removeItem(cacheKey(path));
      return undefined;
    }
    return parsed;
  } catch {
    store.removeItem(cacheKey(path));
    return undefined;
  }
}

function writeCache<T>(path: string, value: T, ttlMs: number) {
  const store = localStore();
  if (!store) {
    return;
  }

  const record: CacheRecord<T> = {
    value,
    expiresAt: Date.now() + ttlMs,
    savedAt: Date.now(),
    version: CACHE_VERSION,
  };

  try {
    store.setItem(cacheKey(path), JSON.stringify(record));
  } catch {
    clearExpiredCache();
  }
}

function clearExpiredCache() {
  const store = localStore();
  if (!store) {
    return;
  }

  for (let index = store.length - 1; index >= 0; index -= 1) {
    const key = store.key(index);
    if (!key?.startsWith(CACHE_PREFIX)) {
      continue;
    }

    const raw = store.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as CacheRecord<unknown>;
      if (parsed.expiresAt < Date.now() || parsed.version !== CACHE_VERSION) {
        store.removeItem(key);
      }
    } catch {
      store.removeItem(key);
    }
  }
}

async function fetchJson<T>(path: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`WatchFooty ${response.status} on ${path}`);
  }

  return (await response.json()) as T;
}

async function cachedJson<T>(path: string, ttlMs: number) {
  const cached = readCache<T>(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const fresh = await fetchJson<T>(path);
    writeCache(path, fresh, ttlMs);
    return fresh;
  } catch (error) {
    if (cached) {
      return cached.value;
    }
    throw error;
  }
}

export function clearFootyCache() {
  const store = localStore();
  if (!store) {
    return;
  }

  for (let index = store.length - 1; index >= 0; index -= 1) {
    const key = store.key(index);
    if (key?.startsWith(CACHE_PREFIX)) {
      store.removeItem(key);
    }
  }
}

export function assetUrl(path?: string | null) {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getSports() {
  return cachedJson<Sport[]>("/sports", cacheTtl.sports);
}

export function getMatches(sport: string, date?: string, filter?: "all" | "live" | "upcoming" | "finished") {
  if (filter === "live") {
    return cachedJson<Match[]>(`/matches/${sport}/live`, cacheTtl.liveMatches);
  }

  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const path = `/matches/${sport}${query}`;
  const ttl = cacheTtl.matches;
  return cachedJson<Match[]>(path, ttl);
}

export function getTopLeagues(sport: string) {
  return cachedJson<string[]>(`/top-leagues/${sport}`, cacheTtl.collections);
}

export function getTopTeams(sport: string) {
  return cachedJson<string[]>(`/top-teams/${sport}`, cacheTtl.collections);
}

export async function getMatchDetails(matchId: string) {
  const data = await cachedJson<Match | Match[]>(`/match/${matchId}`, cacheTtl.details);
  return Array.isArray(data) ? data[0] : data;
}

export async function getMatchStats(matchId: string) {
  const path = `/match/${matchId}/stats`;
  const cached = readCache<MatchStats | null>(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      writeCache(path, null, cacheTtl.stats);
      return null;
    }

    if (!response.ok) {
      throw new Error(`WatchFooty ${response.status} on ${path}`);
    }

    const data = (await response.json()) as MatchStats;
    writeCache(path, data, cacheTtl.stats);
    return data;
  } catch (error) {
    if (cached) {
      return cached.value;
    }
    throw error;
  }
}

export async function getNews(sport: string) {
  const payload = await cachedJson<{ articles: NewsArticle[] }>(
    `/news/${sport}`,
    cacheTtl.news,
  );
  return payload.articles ?? [];
}

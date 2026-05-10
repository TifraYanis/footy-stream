import type { Match, StatItem, TeamSide } from "../api/watchfooty";

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

export type MatchPhase = "live" | "upcoming" | "finished" | "canceled" | "unknown";

export function todayInputValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function matchDate(match?: Pick<Match, "date" | "timestamp">) {
  if (!match) {
    return undefined;
  }

  if (match.date) {
    const parsed = new Date(match.date);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof match.timestamp === "number") {
    const normalized = match.timestamp > 9_999_999_999 ? match.timestamp : match.timestamp * 1000;
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
}

export function formatKickoff(match?: Pick<Match, "date" | "timestamp">) {
  const date = matchDate(match);
  return date ? dateTimeFormatter.format(date) : "Date a confirmer";
}

export function formatKickoffTime(match?: Pick<Match, "date" | "timestamp">) {
  const date = matchDate(match);
  return date ? timeFormatter.format(date) : "--:--";
}

export function getPhase(status?: string): MatchPhase {
  const normalized = status?.toLowerCase();
  if (normalized === "in" || normalized === "live") {
    return "live";
  }
  if (normalized === "pre" || normalized === "scheduled") {
    return "upcoming";
  }
  if (normalized === "post" || normalized === "final" || normalized === "finished") {
    return "finished";
  }
  if (normalized === "canceled" || normalized === "cancelled") {
    return "canceled";
  }
  return "unknown";
}

export function phaseLabel(status?: string) {
  const phase = getPhase(status);
  if (phase === "live") {
    return "En direct";
  }
  if (phase === "upcoming") {
    return "A venir";
  }
  if (phase === "finished") {
    return "Termine";
  }
  if (phase === "canceled") {
    return "Annule";
  }
  return "Statut inconnu";
}

export function scoreFor(match?: Match) {
  return {
    home: match?.homeScore ?? match?.scores?.home ?? 0,
    away: match?.awayScore ?? match?.scores?.away ?? 0,
  };
}

export function streamCount(match?: Match) {
  return match?.streams?.filter((stream) => !stream.nsfw).length ?? 0;
}

export function compareMatches(left: Match, right: Match) {
  const phaseRank: Record<MatchPhase, number> = {
    live: 0,
    upcoming: 1,
    finished: 2,
    canceled: 3,
    unknown: 4,
  };

  const phaseDiff = phaseRank[getPhase(left.status)] - phaseRank[getPhase(right.status)];
  if (phaseDiff !== 0) {
    return phaseDiff;
  }

  const streamDiff = streamCount(right) - streamCount(left);
  if (streamDiff !== 0) {
    return streamDiff;
  }

  return (matchDate(left)?.getTime() ?? 0) - (matchDate(right)?.getTime() ?? 0);
}

export function teamName(team?: TeamSide) {
  return team?.name?.trim() || "Equipe";
}

export function teamInitials(team?: TeamSide) {
  const words = teamName(team)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return words.map((word) => word[0]?.toUpperCase()).join("") || "FS";
}

export function toTitleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

export function statLabel(stat: StatItem) {
  return stat.label || stat.name || "Statistique";
}

export function statNumber(stat?: StatItem) {
  if (!stat) {
    return 0;
  }

  if (typeof stat.percentage === "number") {
    return stat.percentage;
  }

  const parsed = Number.parseFloat(stat.displayValue?.replace(",", ".") ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function statValue(stat?: StatItem) {
  if (!stat) {
    return "-";
  }

  return stat.displayValue || String(stat.percentage ?? "-");
}

export function publishedAgo(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60_000));
  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `Il y a ${diffHours} h`;
  }

  return dateTimeFormatter.format(date);
}

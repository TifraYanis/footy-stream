import { useQuery } from "@tanstack/react-query";
import {
  cacheTtl,
  getMatchDetails,
  getMatches,
  getMatchStats,
  getNews,
  getSports,
  getTopLeagues,
  getTopTeams,
} from "../api/watchfooty";

export function useSportsQuery() {
  return useQuery({
    queryKey: ["sports"],
    queryFn: getSports,
    staleTime: cacheTtl.sports,
  });
}

export function useMatchesQuery(sport: string, date: string) {
  return useQuery({
    queryKey: ["matches", sport, date],
    queryFn: () => getMatches(sport, date),
    staleTime: cacheTtl.matches,
    refetchInterval: 60 * 1000,
  });
}

export function useMatchDetailsQuery(matchId?: string) {
  return useQuery({
    queryKey: ["match", matchId],
    queryFn: () => getMatchDetails(matchId ?? ""),
    enabled: Boolean(matchId),
    staleTime: cacheTtl.details,
  });
}

export function useMatchStatsQuery(matchId?: string) {
  return useQuery({
    queryKey: ["match-stats", matchId],
    queryFn: () => getMatchStats(matchId ?? ""),
    enabled: Boolean(matchId),
    staleTime: cacheTtl.stats,
    retry: 1,
  });
}

export function useTopLeaguesQuery(sport: string) {
  return useQuery({
    queryKey: ["top-leagues", sport],
    queryFn: () => getTopLeagues(sport),
    staleTime: cacheTtl.collections,
  });
}

export function useTopTeamsQuery(sport: string) {
  return useQuery({
    queryKey: ["top-teams", sport],
    queryFn: () => getTopTeams(sport),
    staleTime: cacheTtl.collections,
  });
}

export function useNewsQuery(sport: string) {
  return useQuery({
    queryKey: ["news", sport],
    queryFn: () => getNews(sport),
    staleTime: cacheTtl.news,
  });
}

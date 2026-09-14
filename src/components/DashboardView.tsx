import React, { useState, useMemo } from 'react';
import {
  History,
  Calendar,
  Users,
  Trophy,
  Award,
  Flame,
  BarChart3,
  PieChart as PieChartIcon,
  Crown,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { LagaAmalSeasonData, Match, Player, TeamShort } from '../types';
import { ScoreBanner } from './ScoreBanner';
import { PlayerAvatar } from './PlayerAvatar';
import { generateHeuristicPlayerJulukan } from '../utils/julukan';

type TeamFilter = 'all' | 'Pohon' | 'Lobby';

interface DashboardViewProps {
  seasons: LagaAmalSeasonData[];
  selectedSeasonId: string;
  onSeasonChange: (seasonId: string) => void;
  activeSeason: LagaAmalSeasonData;
  seasonMatches: Match[];
  players: Player[];
  onSelectPlayer?: (playerName: string) => void;
}

interface PlayerStatsComputed {
  nickname: string;
  avatar_url?: string;
  tier?: string;
  julukan?: string;
  matches: number;
  mvp: number;
  antam: number; // Gold
  silver: number;
  coklat: number;
  score: number;
  avgScore: number;
  winRate: number;
  teamAffinity?: string;
}

const MEDAL_COLORS = {
  MVP: '#F59E0B',      // Shiny Gold / Amber
  Gold: '#D97706',     // Antam Deep Gold
  Silver: '#94A3B8',   // Slate Silver
  Coklat: '#78350F',   // Cocoa Bronze
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  seasons,
  selectedSeasonId,
  onSeasonChange,
  activeSeason,
  seasonMatches,
  players,
  onSelectPlayer,
}) => {
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');

  // Compute player stats according to the selected season AND team filter
  const computedStats = useMemo(() => {
    // Lookup dictionary from `players` state to get custom avatars, tier, and julukan
    const playerMetaMap = new Map<string, Player>();
    players.forEach((p) => {
      playerMetaMap.set(p.name.trim().toLowerCase(), p);
    });

    if (teamFilter === 'all') {
      // Use the season's official aggregated roster
      const list: PlayerStatsComputed[] = (activeSeason.players || []).map((p) => {
        const meta = playerMetaMap.get(p.nickname.trim().toLowerCase());
        const julukan =
          meta?.julukan ||
          generateHeuristicPlayerJulukan(
            meta || {
              id: p.nickname,
              name: p.nickname,
              status: 'Aktif',
              tier: 'Legend',
              total_match: p.matches,
              medals: { MVP: p.mvp, Gold: p.antam, Silver: p.silver, Coklat: p.coklat },
            },
            p
          );

        return {
          nickname: p.nickname,
          avatar_url: meta?.avatar_url || p.avatar_url,
          tier: meta?.tier || (p.mvp >= 15 ? 'Mythic Glory' : p.mvp >= 5 ? 'Mythic' : 'Legend'),
          julukan,
          matches: p.matches,
          mvp: p.mvp,
          antam: p.antam,
          silver: p.silver,
          coklat: p.coklat,
          score: Math.round(p.score * 10) / 10,
          avgScore: Math.round(p.avgScore * 100) / 100,
          winRate: Math.round(p.winRate * 10) / 10,
        };
      });
      return list;
    }

    // If filtered by Tim Pohon or Tim Lobby:
    // Aggregate from matches in this season where players were on that team
    const targetTeam: TeamShort = teamFilter;
    const targetTeamFull = targetTeam === 'Pohon' ? 'Tim Pohon' : 'Tim Lobby';

    if (seasonMatches.length > 0) {
      const tallyMap = new Map<
        string,
        {
          nickname: string;
          matches: number;
          wins: number;
          mvp: number;
          antam: number;
          silver: number;
          coklat: number;
          scores: number[];
        }
      >();

      seasonMatches.forEach((m) => {
        const isWinner = m.winner === targetTeamFull;
        const roster = targetTeam === 'Pohon' ? m.pohon : m.lobby;

        roster.forEach((mp) => {
          const key = mp.player_name.trim().toLowerCase();
          if (!tallyMap.has(key)) {
            tallyMap.set(key, {
              nickname: mp.player_name,
              matches: 0,
              wins: 0,
              mvp: 0,
              antam: 0,
              silver: 0,
              coklat: 0,
              scores: [],
            });
          }
          const item = tallyMap.get(key)!;
          item.matches += 1;
          if (isWinner) item.wins += 1;
          if (mp.medal === 'MVP') item.mvp += 1;
          else if (mp.medal === 'Gold') item.antam += 1;
          else if (mp.medal === 'Silver') item.silver += 1;
          else if (mp.medal === 'Coklat') item.coklat += 1;

          const s =
            typeof mp.score === 'number' && !isNaN(mp.score)
              ? mp.score
              : mp.medal === 'MVP'
              ? 10.0
              : mp.medal === 'Gold'
              ? 8.5
              : mp.medal === 'Silver'
              ? 6.0
              : 3.5;
          item.scores.push(s);
        });
      });

      const list: PlayerStatsComputed[] = Array.from(tallyMap.values()).map((item) => {
        const meta = playerMetaMap.get(item.nickname.trim().toLowerCase());
        const totalScore = item.scores.reduce((a, b) => a + b, 0);
        const avgScore = item.scores.length > 0 ? totalScore / item.scores.length : 0;
        const winRate = item.matches > 0 ? (item.wins / item.matches) * 100 : 0;

        const julukan =
          meta?.julukan ||
          generateHeuristicPlayerJulukan(
            meta || {
              id: item.nickname,
              name: item.nickname,
              status: 'Aktif',
              tier: 'Legend',
              total_match: item.matches,
              medals: { MVP: item.mvp, Gold: item.antam, Silver: item.silver, Coklat: item.coklat },
            },
            { mvp: item.mvp, coklat: item.coklat, antam: item.antam, winRate }
          );

        return {
          nickname: item.nickname,
          avatar_url: meta?.avatar_url,
          tier: meta?.tier || 'Legend',
          julukan,
          matches: item.matches,
          mvp: item.mvp,
          antam: item.antam,
          silver: item.silver,
          coklat: item.coklat,
          score: Math.round(totalScore * 10) / 10,
          avgScore: Math.round(avgScore * 100) / 100,
          winRate: Math.round(winRate * 10) / 10,
          teamAffinity: targetTeamFull,
        };
      });

      return list;
    }

    // Fallback if season has no individual match records yet (split or estimated)
    return (activeSeason.players || []).map((p) => {
      const meta = playerMetaMap.get(p.nickname.trim().toLowerCase());
      const julukan =
        meta?.julukan ||
        generateHeuristicPlayerJulukan(
          meta || {
            id: p.nickname,
            name: p.nickname,
            status: 'Aktif',
            tier: 'Legend',
            total_match: p.matches,
            medals: { MVP: p.mvp, Gold: p.antam, Silver: p.silver, Coklat: p.coklat },
          },
          p
        );

      return {
        nickname: p.nickname,
        avatar_url: meta?.avatar_url || p.avatar_url,
        tier: meta?.tier || 'Legend',
        julukan,
        matches: p.matches,
        mvp: p.mvp,
        antam: p.antam,
        silver: p.silver,
        coklat: p.coklat,
        score: p.score,
        avgScore: p.avgScore,
        winRate: p.winRate,
        teamAffinity: targetTeamFull,
      };
    });
  }, [teamFilter, activeSeason, seasonMatches, players]);

  // 7 Quick Stat Ribbon Values
  const ribbonStats = useMemo(() => {
    const activeCount = computedStats.length;

    let topCoklat = { player: '-', count: 0, avatar: '' };
    let topSilver = { player: '-', count: 0, avatar: '' };
    let topAntam = { player: '-', count: 0, avatar: '' };
    let topMvp = { player: '-', count: 0, avatar: '' };

    computedStats.forEach((p) => {
      if (p.coklat > topCoklat.count) {
        topCoklat = { player: p.nickname, count: p.coklat, avatar: p.avatar_url || '' };
      }
      if (p.silver > topSilver.count) {
        topSilver = { player: p.nickname, count: p.silver, avatar: p.avatar_url || '' };
      }
      if (p.antam > topAntam.count) {
        topAntam = { player: p.nickname, count: p.antam, avatar: p.avatar_url || '' };
      }
      if (p.mvp > topMvp.count) {
        topMvp = { player: p.nickname, count: p.mvp, avatar: p.avatar_url || '' };
      }
    });

    // Fallbacks if all counts are 0
    if (!topCoklat.player || topCoklat.player === '-') {
      topCoklat.player = computedStats[0]?.nickname || activeSeason.topCoklat?.player || '-';
      topCoklat.count = activeSeason.topCoklat?.count || 0;
    }
    if (!topSilver.player || topSilver.player === '-') {
      topSilver.player = computedStats[0]?.nickname || activeSeason.topSilver?.player || '-';
      topSilver.count = activeSeason.topSilver?.count || 0;
    }
    if (!topAntam.player || topAntam.player === '-') {
      topAntam.player = computedStats[0]?.nickname || activeSeason.topAntam?.player || '-';
      topAntam.count = activeSeason.topAntam?.count || 0;
    }
    if (!topMvp.player || topMvp.player === '-') {
      topMvp.player = computedStats[0]?.nickname || activeSeason.topMvp?.player || '-';
      topMvp.count = activeSeason.topMvp?.count || 0;
    }

    const totalMatches =
      seasonMatches.length > 0
        ? seasonMatches.length
        : activeSeason.totalMatchesRecorded || activeSeason.totalMatches || 0;

    const avgWinRate =
      computedStats.length > 0
        ? Math.round((computedStats.reduce((a, b) => a + b.winRate, 0) / computedStats.length) * 10) / 10
        : activeSeason.averageWinRate || 50;

    const avgScore =
      computedStats.length > 0
        ? Math.round((computedStats.reduce((a, b) => a + b.avgScore, 0) / computedStats.length) * 100) / 100
        : activeSeason.averageScore || 7.5;

    return {
      activeCount,
      topCoklat,
      topSilver,
      topAntam,
      topMvp,
      totalMatches,
      avgWinRate,
      avgScore,
    };
  }, [computedStats, activeSeason, seasonMatches]);

  // KPI Score Chart Data (Players sorted by score descending)
  const scoreChartData = useMemo(() => {
    return [...computedStats]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({
        name: p.nickname,
        shortName: p.nickname.length > 9 ? p.nickname.slice(0, 8) + '…' : p.nickname,
        score: p.score,
        avgScore: p.avgScore,
        matches: p.matches,
      }));
  }, [computedStats]);

  // KPI Total Medal Pie Chart Data
  const medalPieData = useMemo(() => {
    const totalMvp = computedStats.reduce((a, b) => a + b.mvp, 0);
    const totalAntam = computedStats.reduce((a, b) => a + b.antam, 0);
    const totalSilver = computedStats.reduce((a, b) => a + b.silver, 0);
    const totalCoklat = computedStats.reduce((a, b) => a + b.coklat, 0);

    return [
      { name: 'MVP (Emas)', value: totalMvp, color: MEDAL_COLORS.MVP },
      { name: 'Antam (Gold)', value: totalAntam, color: MEDAL_COLORS.Gold },
      { name: 'Silver (Perak)', value: totalSilver, color: MEDAL_COLORS.Silver },
      { name: 'Coklat (Perunggu)', value: totalCoklat, color: MEDAL_COLORS.Coklat },
    ];
  }, [computedStats]);

  const totalAllMedals = useMemo(() => {
    return medalPieData.reduce((a, b) => a + b.value, 0);
  }, [medalPieData]);

  // Best Play (Top MVP) & Bad Play (Top Coklat)
  const bestPlayer = useMemo(() => {
    if (computedStats.length === 0) return null;
    return [...computedStats].sort((a, b) => b.mvp - a.mvp || b.score - a.score)[0];
  }, [computedStats]);

  const badPlayer = useMemo(() => {
    if (computedStats.length === 0) return null;
    return [...computedStats].sort((a, b) => b.coklat - a.coklat || a.winRate - b.winRate)[0];
  }, [computedStats]);

  return (
    <div id="dashboard-view-container" className="space-y-6">
      {/* Top Banner Card: Season Selector + Team Filter*/}
      <section
        id="dashboard-header-card"
        className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 sm:p-6 shadow-xl"
      >
        {/* Top Control Bar: Season Selector (Left) & Team Filter (Right) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#332C25]/60">
          {/* Left: Season dropdown & date string */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#E8B33D]/40 bg-[#E8B33D]/10 px-2.5 py-1.5 text-xs font-bold text-[#E8B33D]">
              <History size={14} className="text-[#E8B33D] shrink-0" />
              <span className="shrink-0 text-[11px] sm:text-xs">Season:</span>
              <select
                id="dashboard-season-dropdown"
                value={selectedSeasonId}
                onChange={(e) => onSeasonChange(e.target.value)}
                className="bg-transparent font-black text-[#F2EDE4] focus:outline-none cursor-pointer pr-1 text-xs sm:text-sm max-w-[130px] sm:max-w-none truncate"
              >
                {seasons.map((s, idx) => (
                  <option key={s.id} value={s.id} className="bg-[#1D1916] text-[#F2EDE4]">
                    {s.title} {idx === 0 ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#9C948A] font-medium shrink-0">
              <Calendar size={13} className="text-[#E8B33D]" />
              <span>{activeSeason.dateStr}</span>
            </div>
          </div>

          {/* Right: Team Filter (Select All, Tim Pohon, Tim Lobby) - 3-column on mobile */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 rounded-xl border border-[#332C25] bg-[#141210] p-1 shadow-inner w-full sm:w-auto">
            <button
              id="filter-team-all"
              type="button"
              onClick={() => setTeamFilter('all')}
              className={`px-2 py-1.5 sm:px-3 text-center justify-center rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-h-[36px] flex items-center ${
                teamFilter === 'all'
                  ? 'bg-[#E8B33D] text-[#161311] shadow-sm font-black'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              Semua Tim
            </button>

            <button
              id="filter-team-pohon"
              type="button"
              onClick={() => setTeamFilter('Pohon')}
              className={`flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                teamFilter === 'Pohon'
                  ? 'bg-[#4F7942] text-white shadow-sm ring-1 ring-[#649455] font-black'
                  : 'text-[#9C948A] hover:text-[#4F7942] hover:bg-[#241F1B]'
              }`}
            >
              <span className="inline-block h-2 w-2 rounded-full bg-[#4F7942] shrink-0" />
              <span className="truncate">Tim Pohon</span>
            </button>

            <button
              id="filter-team-lobby"
              type="button"
              onClick={() => setTeamFilter('Lobby')}
              className={`flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                teamFilter === 'Lobby'
                  ? 'bg-[#C97A3D] text-white shadow-sm ring-1 ring-[#e08f51] font-black'
                  : 'text-[#9C948A] hover:text-[#C97A3D] hover:bg-[#241F1B]'
              }`}
            >
              <span className="inline-block h-2 w-2 rounded-full bg-[#C97A3D] shrink-0" />
              <span className="truncate">Tim Lobby</span>
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <div className="pt-4 pb-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-[#F2EDE4]">
              {activeSeason.title}
            </h1>
            {teamFilter !== 'all' && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  teamFilter === 'Pohon'
                    ? 'bg-[#4F7942]/20 text-[#649455] border border-[#4F7942]/40'
                    : 'bg-[#C97A3D]/20 text-[#e08f51] border border-[#C97A3D]/40'
                }`}
              >
                Hanya {teamFilter === 'Pohon' ? 'Tim Pohon' : 'Tim Lobby'}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#9C948A] max-w-3xl leading-relaxed">
            Papan klasemen performa individu resmi Laga Amal MLBB Pantos. Dihitung berdasarkan perolehan Medali Coklat, Silver, Antam (Gold), dan Gelar MVP.
          </p>
        </div>
      </section>



      {/* KPI Section: Left (KPI Score Bar Chart) & Right (KPI Total Medal Pie Chart) */}
      <section id="section-kpi-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: KPI Score (Grafik Score Setiap Player) */}
        <div
          id="card-kpi-score-chart"
          className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 sm:p-6 shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8B33D]/10 text-[#E8B33D]">
                <BarChart3 size={18} />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#F2EDE4]">KPI Score Pemain</h3>
                <p className="text-xs text-[#9C948A]">
                  Grafik total perolehan skor setiap pemain ({computedStats.length} pemain)
                </p>
              </div>
            </div>
          </div>

          <div className="h-60 sm:h-72 w-full pt-2">
            {scoreChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#9C948A]">
                Tidak ada data score untuk filter ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreChartData} margin={{ top: 10, right: 10, left: -25, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#332C25" opacity={0.6} />
                  <XAxis
                    dataKey="shortName"
                    stroke="#9C948A"
                    fontSize={9}
                    interval={0}
                    angle={-40}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis stroke="#9C948A" fontSize={10} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-[#332C25] bg-[#161311] p-2.5 shadow-xl text-xs">
                          <div className="font-bold text-[#E8B33D]">{data.name}</div>
                          <div className="mt-1 text-[#F2EDE4]">
                            Total Score: <span className="font-bold">{data.score}</span>
                          </div>
                          <div className="text-[#9C948A] text-[11px]">
                            Rata-rata: {data.avgScore} ({data.matches} match)
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="score"
                    fill={teamFilter === 'Pohon' ? '#4F7942' : teamFilter === 'Lobby' ? '#C97A3D' : '#E8B33D'}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: KPI Total Medal (Pie Chart Total Medal) */}
        <div
          id="card-kpi-medal-chart"
          className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-4 sm:p-6 shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8B33D]/10 text-[#E8B33D] shrink-0">
                <PieChartIcon size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#F2EDE4]">KPI Total Medali</h3>
                <p className="text-[11px] sm:text-xs text-[#9C948A]">
                  Distribusi medali ({totalAllMedals} medali)
                </p>
              </div>
            </div>
          </div>

          <div className="h-60 sm:h-72 w-full pt-2">
            {totalAllMedals === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#9C948A]">
                Belum ada perolehan medali untuk filter ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={medalPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="42%"
                    innerRadius={42}
                    outerRadius={72}
                    paddingAngle={4}
                  >
                    {medalPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#1D1916" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0];
                      const pct =
                        totalAllMedals > 0
                          ? ((Number(data.value) / totalAllMedals) * 100).toFixed(1)
                          : '0';
                      return (
                        <div className="rounded-xl border border-[#332C25] bg-[#161311] p-2.5 shadow-xl text-xs">
                          <div className="font-bold" style={{ color: data.payload.color }}>
                            {data.name}
                          </div>
                          <div className="mt-1 text-[#F2EDE4]">
                            Total: <span className="font-bold">{data.value} medali</span> ({pct}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(val) => <span className="text-[11px] sm:text-xs text-[#C5BCAD]">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Best Play & Bad Play Section */}
      <section id="section-best-bad-play" className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: BEST PLAY OF THE SEASON */}
        <div
          id="card-best-play"
          className="rounded-2xl border-2 border-[#E8B33D]/60 bg-gradient-to-br from-[#292015] via-[#1D1916] to-[#161311] p-4 sm:p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Header Tag */}
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8B33D]/20 border border-[#E8B33D]/50 px-2.5 py-1 text-[11px] sm:text-xs font-black text-[#E8B33D] uppercase tracking-wider shadow-sm">
              <Crown size={14} className="text-[#E8B33D]" />
              <span>Best Play of The Season</span>
            </div>
            <span className="text-xs font-bold text-[#9C948A]">Top MVP</span>
          </div>

          {bestPlayer ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
              {/* Big Photo */}
              <div className="relative shrink-0">
                <PlayerAvatar
                  name={bestPlayer.nickname}
                  avatarUrl={bestPlayer.avatar_url}
                  size="xl"
                  className="shadow-2xl ring-4 ring-[#E8B33D]/40 rounded-full sm:w-24 sm:h-24"
                />
                <div className="absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#E8B33D] text-[#161311] font-black shadow-lg text-sm">
                  👑
                </div>
              </div>

              {/* Player Info */}
              <div className="flex-1 text-center sm:text-left space-y-2.5 w-full">
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectPlayer && onSelectPlayer(bestPlayer.nickname)}
                    className="text-xl sm:text-2xl font-black text-[#F2EDE4] hover:text-[#E8B33D] transition-colors cursor-pointer inline-block"
                  >
                    {bestPlayer.nickname}
                  </button>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                    <span className="rounded bg-[#251F1B] px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-[#9C948A] border border-[#332C25]">
                      {bestPlayer.tier || 'Sepuh Pantos'}
                    </span>
                    <span className="text-[11px] sm:text-xs text-emerald-400 font-bold">
                      Win Rate {bestPlayer.winRate}%
                    </span>
                  </div>
                </div>

                {/* JULUKAN JADI HIGHLIGHT */}
                <div
                  id="best-play-julukan-highlight"
                  className="rounded-xl border border-[#E8B33D]/60 bg-gradient-to-r from-[#E8B33D]/25 via-[#3D2C17]/40 to-[#E8B33D]/10 px-3.5 py-2.5 shadow-md"
                >
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] uppercase tracking-wider font-bold text-[#E8B33D]">
                    <Sparkles size={12} />
                    <span>Julukan Resmi:</span>
                  </div>
                  <div className="text-sm sm:text-lg font-black text-[#F2EDE4] italic tracking-wide mt-0.5 text-center sm:text-left">
                    "{bestPlayer.julukan}"
                  </div>
                </div>

                {/* Total MVP Stat Pill */}
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-3 pt-1">
                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#E8B33D] px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-black text-[#161311] shadow-md">
                    <Trophy size={15} />
                    <span>{bestPlayer.mvp}x Gelar MVP</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#9C948A]">
                    Total Skor: <strong className="text-[#F2EDE4]">{bestPlayer.score}</strong> ({bestPlayer.matches} Match)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#9C948A]">Belum ada data pemain</p>
          )}
        </div>

        {/* Right: BAD PLAY OF THE SEASON */}
        <div
          id="card-bad-play"
          className="rounded-2xl border-2 border-[#8B4513]/60 bg-gradient-to-br from-[#2B1B14] via-[#1D1916] to-[#161311] p-4 sm:p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Header Tag */}
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#8B4513]/25 border border-[#8B4513]/60 px-2.5 py-1 text-[11px] sm:text-xs font-black text-[#D97706] uppercase tracking-wider shadow-sm">
              <AlertTriangle size={14} className="text-[#D97706]" />
              <span>Bad Play of The Season</span>
            </div>
            <span className="text-xs font-bold text-[#9C948A]">Kolektor Coklat</span>
          </div>

          {badPlayer ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
              {/* Big Photo */}
              <div className="relative shrink-0">
                <PlayerAvatar
                  name={badPlayer.nickname}
                  avatarUrl={badPlayer.avatar_url}
                  size="xl"
                  className="shadow-2xl ring-4 ring-[#8B4513]/50 rounded-full sm:w-24 sm:h-24"
                />
                <div className="absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#8B4513] text-[#F2EDE4] font-black shadow-lg text-sm">
                  🍫
                </div>
              </div>

              {/* Player Info */}
              <div className="flex-1 text-center sm:text-left space-y-2.5 w-full">
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectPlayer && onSelectPlayer(badPlayer.nickname)}
                    className="text-xl sm:text-2xl font-black text-[#F2EDE4] hover:text-[#D97706] transition-colors cursor-pointer inline-block"
                  >
                    {badPlayer.nickname}
                  </button>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                    <span className="rounded bg-[#251F1B] px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-[#9C948A] border border-[#332C25]">
                      {badPlayer.tier || 'Warga Kelas Semen'}
                    </span>
                    <span className="text-[11px] sm:text-xs text-rose-400 font-bold">
                      Win Rate {badPlayer.winRate}%
                    </span>
                  </div>
                </div>

                {/* JULUKAN JADI HIGHLIGHT */}
                <div
                  id="bad-play-julukan-highlight"
                  className="rounded-xl border border-[#8B4513]/60 bg-gradient-to-r from-amber-950/40 via-[#3D1E14]/40 to-rose-950/20 px-3.5 py-2.5 shadow-md"
                >
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] uppercase tracking-wider font-bold text-[#D97706]">
                    <ShieldAlert size={12} />
                    <span>Julukan Resmi:</span>
                  </div>
                  <div className="text-sm sm:text-lg font-black text-[#F2EDE4] italic tracking-wide mt-0.5 text-center sm:text-left">
                    "{badPlayer.julukan}"
                  </div>
                </div>

                {/* Total Coklat Stat Pill */}
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-3 pt-1">
                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B4513] px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-black text-[#F2EDE4] shadow-md">
                    <span>🍫 {badPlayer.coklat}x Medali Coklat</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#9C948A]">
                    Total MVP: <strong className="text-[#E8B33D]">{badPlayer.mvp}x</strong> ({badPlayer.matches} Match)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#9C948A]">Belum ada data pemain</p>
          )}
        </div>
      </section>
    </div>
  );
};

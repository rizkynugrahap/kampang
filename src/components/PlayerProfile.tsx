import React, { useState } from 'react';
import {
  UserRound,
  TrendingUp,
  PieChart as PieIcon,
  Sparkles,
  Trophy,
  Award,
  Shield,
  Zap,
  ChevronRight,
  Camera,
  Calendar,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts';
import { Player, Match, LagaAmalSeasonData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import { getPlayerTopHeroes, getPlayerPerformanceTrend } from '../utils/stats';
import { UpdateAvatarModal } from './UpdateAvatarModal';

interface PlayerProfileProps {
  players: Player[];
  selectedPlayerId?: number | string;
  onSelectPlayer?: (id: number | string) => void;
  activeSeason?: LagaAmalSeasonData;
  matches?: Match[];
  onUpdatePlayerAvatar?: (playerId: number | string, newAvatarUrl: string) => Promise<boolean> | boolean;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({
  players,
  selectedPlayerId,
  onSelectPlayer,
  activeSeason,
  matches = [],
  onUpdatePlayerAvatar,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<number | string>(
    selectedPlayerId || (players[0] ? players[0].id : 1)
  );
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState<boolean>(false);
  const [trendMetric, setTrendMetric] = useState<'performa' | 'rating'>('performa');

  const activeId = selectedPlayerId !== undefined ? selectedPlayerId : internalSelectedId;
  const player =
    players.find((p) => String(p.id) === String(activeId) || p.name.toLowerCase() === String(activeId).toLowerCase()) ||
    players[0];

  const handleSelect = (id: number | string) => {
    setInternalSelectedId(id);
    if (onSelectPlayer) {
      onSelectPlayer(id);
    }
  };

  if (!player) {
    return (
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-8 text-center text-[#9C948A]">
        Belum ada data pemain. Silakan input pertandingan atau data pemain terlebih dahulu.
      </div>
    );
  }

  // Find season-specific stat from activeSeason
  const seasonPlayerStat = activeSeason?.players.find(
    (p) => p.nickname.toLowerCase() === player.name.toLowerCase()
  );

  // Find rank in active season
  const seasonRank = activeSeason?.players
    ? activeSeason.players.findIndex(
        (p) => p.nickname.toLowerCase() === player.name.toLowerCase()
      ) + 1
    : 0;

  // Medals calculation (prefer season stat if available)
  const mvpCount = seasonPlayerStat ? seasonPlayerStat.mvp : player.medals.MVP;
  const goldCount = seasonPlayerStat ? seasonPlayerStat.antam : player.medals.Gold;
  const silverCount = seasonPlayerStat ? seasonPlayerStat.silver : player.medals.Silver;
  const coklatCount = seasonPlayerStat ? seasonPlayerStat.coklat : player.medals.Coklat;
  const totalMatches = seasonPlayerStat ? seasonPlayerStat.matches : player.total_match;
  const totalScore = seasonPlayerStat ? seasonPlayerStat.score : player.score || 0;
  const avgScore = seasonPlayerStat ? seasonPlayerStat.avgScore : player.avgScore || 0;
  const winRate = seasonPlayerStat ? seasonPlayerStat.winRate : player.winRate || 0;

  const totalMedals = mvpCount + goldCount + silverCount + coklatCount;

  // Pie chart data
  const pieData = [
    { name: 'MVP', value: mvpCount, color: '#E8B33D' },
    { name: 'Antam (Gold)', value: goldCount, color: '#D8A93A' },
    { name: 'Silver', value: silverCount, color: '#B9B2A8' },
    { name: 'Coklat', value: coklatCount, color: '#6B4226' },
  ].filter((d) => d.value > 0);

  // Top heroes
  const topHeroes = getPlayerTopHeroes(player.name, matches, activeSeason);

  // Daily Trend score & performa calculation
  const dailyTrendData = getPlayerPerformanceTrend(player.name, matches, activeSeason);

  // Dynamic status title
  const getPlayerTitle = () => {
    if (seasonRank === 1) return 'Pemuncak Klasemen Laga Amal (Raja Pantos)';
    if (mvpCount >= 8) return 'Sang Penggendong Sejati (Tulang Punggung)';
    if (coklatCount >= 5) return 'Warga Kehormatan Kelas Semen';
    if (goldCount >= 6) return 'Kolektor Antam Konsisten (Anti Beban)';
    if (silverCount >= 7) return 'Spesialis Runner-up (Cukup Rapi)';
    return 'Peserta Aktif Laga Amal Pantos';
  };

  return (
    <div id="player-profile-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#332C25] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241F1B] text-[#E8B33D] border border-[#332C25]">
            <UserRound size={18} />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#F2EDE4] sm:text-lg flex items-center gap-2">
              Profil & Statistik Pemain
              {activeSeason && (
                <span className="rounded-full bg-[#E8B33D]/15 border border-[#E8B33D]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#E8B33D]">
                  {activeSeason.title}
                </span>
              )}
            </h2>
            <p className="text-xs text-[#9C948A]">
              Data tersinkronisasi langsung dengan Papan Klasemen Laga Amal
            </p>
          </div>
        </div>

        {seasonRank > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-[#332C25] bg-[#1D1916] px-3.5 py-1.5 self-start sm:self-auto">
            <Trophy size={14} className="text-[#E8B33D]" />
            <span className="text-xs text-[#9C948A]">Peringkat Klasemen:</span>
            <span className="font-black text-sm text-[#E8B33D]">#{seasonRank}</span>
          </div>
        )}
      </div>

      {/* Player selector chips */}
      <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1 pb-1">
        {players.map((p) => {
          const isCurrent = String(p.id) === String(player.id) || p.name === player.name;
          return (
            <button
              key={p.id}
              id={`profile-selector-${p.id}`}
              onClick={() => handleSelect(p.id)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium text-xs transition-all cursor-pointer ${
                isCurrent
                  ? 'border border-[#E8B33D] bg-[#E8B33D] text-[#161311] shadow-md font-bold'
                  : 'border border-[#332C25] bg-[#1D1916] text-[#F2EDE4] hover:border-[#9C948A]'
              }`}
            >
              <PlayerAvatar name={p.name} avatarUrl={p.avatar_url} size="xs" />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Player overview card */}
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 sm:p-6 shadow-lg space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#332C25] pb-5">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <PlayerAvatar
                name={player.name}
                avatarUrl={player.avatar_url}
                size="xl"
                status={player.status}
                showStatusDot
              />
              <button
                id={`btn-edit-photo-${player.id}`}
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-[#E8B33D] cursor-pointer"
                title="Ganti Foto Profil"
              >
                <Camera size={20} />
                <span className="text-[9px] font-bold mt-0.5">Ubah</span>
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-black text-2xl text-[#F2EDE4] tracking-tight">
                  {player.name}
                </h3>
                <span className="rounded bg-[#241F1B] px-2 py-0.5 text-xs text-[#9C948A]">
                  {player.status}
                </span>
                <span className="rounded bg-[#E8B33D]/10 px-2 py-0.5 text-xs font-semibold text-[#E8B33D] border border-[#E8B33D]/20">
                  {player.tier}
                </span>
                <button
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#332C25] bg-[#241F1B] hover:bg-[#2A241E] hover:border-[#E8B33D]/50 px-2.5 py-1 text-[11px] font-bold text-[#E8B33D] transition-colors cursor-pointer"
                >
                  <Camera size={12} />
                  <span>Update Foto Profil</span>
                </button>
              </div>
              <p className="mt-1 text-xs text-[#9C948A]">
                Julukan Pantos: <span className="text-[#F2EDE4] font-medium italic">"{getPlayerTitle()}"</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics from Laga Amal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-center min-w-[75px]">
              <span className="block font-black text-lg text-[#F2EDE4]">
                {totalMatches}
              </span>
              <span className="text-[10px] text-[#9C948A] uppercase font-semibold">Match</span>
            </div>
            <div className="rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-center min-w-[75px]">
              <span className="block font-black text-lg text-[#E8B33D]">
                {totalScore}
              </span>
              <span className="text-[10px] text-[#9C948A] uppercase font-semibold">Total Skor</span>
            </div>
            <div className="rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-center min-w-[75px]">
              <span className="block font-black text-lg text-emerald-400">
                {winRate}%
              </span>
              <span className="text-[10px] text-[#9C948A] uppercase font-semibold">Win Rate</span>
            </div>
            <div className="rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-center min-w-[75px]">
              <span className="block font-black text-lg text-amber-300">
                {avgScore}
              </span>
              <span className="text-[10px] text-[#9C948A] uppercase font-semibold">AVG Skor</span>
            </div>
          </div>
        </div>

        {/* 4 Medals Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#E8B33D]/30 bg-[#2A2218] p-3 text-center">
            <span className="block text-[10px] font-bold text-[#E8B33D] uppercase tracking-wider">👑 MVP</span>
            <span className="text-2xl font-black text-[#F2EDE4] mt-0.5 block">{mvpCount}</span>
            <span className="text-[10px] text-[#9C948A]">Gelar MVP</span>
          </div>
          <div className="rounded-xl border border-[#D8A93A]/30 bg-[#251E17] p-3 text-center">
            <span className="block text-[10px] font-bold text-[#D8A93A] uppercase tracking-wider">🥇 Antam (Gold)</span>
            <span className="text-2xl font-black text-[#F2EDE4] mt-0.5 block">{goldCount}</span>
            <span className="text-[10px] text-[#9C948A]">Medali Gold</span>
          </div>
          <div className="rounded-xl border border-[#B9B2A8]/30 bg-[#211E1B] p-3 text-center">
            <span className="block text-[10px] font-bold text-[#B9B2A8] uppercase tracking-wider">🥈 Silver</span>
            <span className="text-2xl font-black text-[#F2EDE4] mt-0.5 block">{silverCount}</span>
            <span className="text-[10px] text-[#9C948A]">Medali Silver</span>
          </div>
          <div className="rounded-xl border border-[#6B4226]/40 bg-[#2A1D15] p-3 text-center">
            <span className="block text-[10px] font-bold text-[#b8764a] uppercase tracking-wider">🍫 Coklat (Semen)</span>
            <span className="text-2xl font-black text-[#F2EDE4] mt-0.5 block">{coklatCount}</span>
            <span className="text-[10px] text-[#b8764a]">Medali Coklat</span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pie Chart: Distribusi Medali */}
          <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
                <PieIcon size={14} /> Distribusi Medali Laga Amal
              </span>
              <span className="text-[11px] text-[#9C948A]">
                Total {totalMedals} Medali
              </span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={3}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={entry.color}
                        stroke="#1D1916"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1D1916',
                      borderColor: '#332C25',
                      color: '#F2EDE4',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend pills */}
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[#F2EDE4]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E8B33D]" />
                MVP: {mvpCount}
              </span>
              <span className="flex items-center gap-1.5 text-[#F2EDE4]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D8A93A]" />
                Antam: {goldCount}
              </span>
              <span className="flex items-center gap-1.5 text-[#F2EDE4]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B9B2A8]" />
                Silver: {silverCount}
              </span>
              <span className="flex items-center gap-1.5 text-[#F2EDE4]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#6B4226]" />
                Coklat: {coklatCount}
              </span>
            </div>
          </div>

          {/* Line Chart: Tren Skor & Performa Harian (Daily) */}
          <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-4 flex flex-col justify-between">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="flex items-center gap-1.5 font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
                  <TrendingUp size={14} /> Tren Skor & Performa Harian (Daily)
                </span>
                <span className="text-[11px] text-[#9C948A] block">
                  Dihitung dari riwayat skor harian (Daily Trend)
                </span>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center rounded-lg border border-[#332C25] bg-[#1D1916] p-0.5 text-[11px]">
                <button
                  id="btn-metric-performa"
                  onClick={() => setTrendMetric('performa')}
                  className={`rounded-md px-2.5 py-1 font-bold transition-all cursor-pointer ${
                    trendMetric === 'performa'
                      ? 'bg-[#E8B33D] text-[#161311] shadow'
                      : 'text-[#9C948A] hover:text-[#F2EDE4]'
                  }`}
                >
                  Poin Performa (0-3)
                </button>
                <button
                  id="btn-metric-rating"
                  onClick={() => setTrendMetric('rating')}
                  className={`rounded-md px-2.5 py-1 font-bold transition-all cursor-pointer ${
                    trendMetric === 'rating'
                      ? 'bg-[#E8B33D] text-[#161311] shadow'
                      : 'text-[#9C948A] hover:text-[#F2EDE4]'
                  }`}
                >
                  Rating Skor (0-10)
                </button>
              </div>
            </div>

            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrendData}>
                  <XAxis
                    dataKey="label"
                    stroke="#9C948A"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#332C25' }}
                  />
                  <YAxis
                    domain={trendMetric === 'performa' ? [0, 3] : [0, 10]}
                    ticks={trendMetric === 'performa' ? [0, 1, 2, 3] : [0, 2, 4, 6, 8, 10]}
                    stroke="#9C948A"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1D1916',
                      borderColor: '#332C25',
                      color: '#F2EDE4',
                      borderRadius: '10px',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                    formatter={(val: any, name: any, item: any) => {
                      const payload = item.payload;
                      if (trendMetric === 'performa') {
                        return [
                          <div key="tooltip-performa" className="space-y-1">
                            <p className="font-bold text-[#E8B33D]">{val} Poin Performa</p>
                            <p className="text-[11px] text-[#9C948A]">Rating Skor MLBB: <span className="text-[#F2EDE4] font-semibold">{payload.rating}</span></p>
                            <p className="text-[11px] text-[#9C948A]">{payload.detail}</p>
                          </div>,
                          'Daily Score'
                        ];
                      }
                      return [
                        <div key="tooltip-rating" className="space-y-1">
                          <p className="font-bold text-[#E8B33D]">{val} (Rating MLBB)</p>
                          <p className="text-[11px] text-[#9C948A]">Poin Performa: <span className="text-[#F2EDE4] font-semibold">{payload.score} Poin</span></p>
                          <p className="text-[11px] text-[#9C948A]">{payload.detail}</p>
                        </div>,
                        'Daily Score'
                      ];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={trendMetric === 'performa' ? 'score' : 'rating'}
                    stroke="#E8B33D"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#E8B33D', stroke: '#1D1916', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#F2EDE4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-[#9C948A] border-t border-[#332C25]/50 pt-2">
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-[#E8B33D]" />
                <span>Tren skor diakumulasi harian (Daily)</span>
              </span>
              <span>{trendMetric === 'performa' ? 'MVP=3, Gold=2, Silver=1, Coklat=0' : 'Skala Skor Standar MLBB'}</span>
            </div>
          </div>
        </div>

        {/* Top 3 Hero andalan */}
        <div className="border-t border-[#332C25] pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
              <Sparkles size={14} /> Top Hero Pilihan {player.name}
            </h4>
            <span className="text-xs text-[#9C948A]">
              Berdasarkan rasio pick & medali di Laga Amal
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {topHeroes.map((h, i) => (
              <div
                key={h.hero}
                className="rounded-xl border border-[#332C25] bg-[#241F1B] p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-[#161311] font-bold text-xs text-[#E8B33D]">
                      #{i + 1}
                    </span>
                    <HeroAvatar heroName={h.hero} size="sm" shape="rounded" />
                    <span className="font-bold text-sm text-[#F2EDE4]">
                      {h.hero}
                    </span>
                  </div>
                  <span className="font-bold text-xs text-[#E8B33D]">
                    {h.mvpRate}% MVP
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-[#9C948A]">
                  <span>{h.games} Pertandingan</span>
                  <span>{h.mvpCount} Kali MVP</span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#161311]">
                  <div
                    className="h-full rounded-full bg-[#E8B33D]"
                    style={{ width: `${Math.max(8, h.mvpRate)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Update Avatar Modal */}
      {isAvatarModalOpen && (
        <UpdateAvatarModal
          isOpen={isAvatarModalOpen}
          player={player}
          onClose={() => setIsAvatarModalOpen(false)}
          onSave={async (playerId, newAvatarUrl) => {
            if (onUpdatePlayerAvatar) {
              const res = await onUpdatePlayerAvatar(playerId, newAvatarUrl);
              return Boolean(res);
            }
            return true;
          }}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  UserRound,
  Trophy,
  Sparkles,
  TrendingUp,
  PieChart as PieIcon,
  Shield,
  Award,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Player, Match, Medal } from '../types';
import { getPlayerTopHeroes, getPlayerPerformanceTrend } from '../utils/stats';

interface PlayerProfileProps {
  players: Player[];
  matches: Match[];
  selectedPlayerId?: number | string;
  onSelectPlayerId?: (id: number | string) => void;
}

const MEDAL_COLORS: Record<Medal, string> = {
  MVP: '#E8B33D',
  Gold: '#D8A93A',
  Silver: '#B9B2A8',
  Coklat: '#6B4226',
};

export const PlayerProfile: React.FC<PlayerProfileProps> = ({
  players,
  matches,
  selectedPlayerId,
  onSelectPlayerId,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<number | string>(
    selectedPlayerId || players[0]?.id || 1
  );

  const activeId = selectedPlayerId || internalSelectedId;
  const player = players.find((p) => p.id === activeId) || players[0];

  const handleSelect = (id: number | string) => {
    setInternalSelectedId(id);
    if (onSelectPlayerId) onSelectPlayerId(id);
  };

  if (!player) {
    return <div className="p-8 text-center text-[#9C948A]">Data pemain belum tersedia.</div>;
  }

  const topHeroes = getPlayerTopHeroes(player.name, matches);
  const trendData = getPlayerPerformanceTrend(player.name, matches);

  const pieData = [
    { name: 'MVP', value: player.medals.MVP, color: MEDAL_COLORS.MVP },
    { name: 'Gold', value: player.medals.Gold, color: MEDAL_COLORS.Gold },
    { name: 'Silver', value: player.medals.Silver, color: MEDAL_COLORS.Silver },
    { name: 'Coklat', value: player.medals.Coklat, color: MEDAL_COLORS.Coklat },
  ];

  const totalMedals =
    player.medals.MVP +
    player.medals.Gold +
    player.medals.Silver +
    player.medals.Coklat || 1;

  // Funny community nickname generator based on medals
  const getPlayerTitle = () => {
    if (player.medals.MVP >= 8) return 'Sang Penggendong Sejati (Tulang Punggung)';
    if (player.medals.Coklat >= 6) return 'Pelanggan Tetap Kelas Semen';
    if (player.medals.Gold >= 6) return 'Pengisi Slot Konsisten (Anti Beban)';
    if (player.medals.Silver >= 7) return 'Spesialis Runner-up (Cukup Rapi)';
    return 'Peserta Aktif Laga Amal';
  };

  return (
    <div id="player-profile-view" className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#241F1B] text-[#E8B33D]">
          <UserRound size={18} />
        </div>
        <div>
          <h2 className="font-bold text-base text-[#F2EDE4] sm:text-lg">
            Profil & Statistik Individu
          </h2>
          <p className="text-xs text-[#9C948A]">
            Analisis sebaran medali, hero andalan, dan tren performa mingguan
          </p>
        </div>
      </div>

      {/* Player selector chips */}
      <div className="flex flex-wrap gap-2">
        {players.map((p) => {
          const isCurrent = p.id === player.id;
          return (
            <button
              key={p.id}
              id={`profile-selector-${p.id}`}
              onClick={() => handleSelect(p.id)}
              className={`rounded-full px-4 py-1.5 font-medium text-xs transition-all ${
                isCurrent
                  ? 'border border-[#E8B33D] bg-[#E8B33D] text-[#161311] shadow-md'
                  : 'border border-[#332C25] bg-[#1D1916] text-[#F2EDE4] hover:border-[#9C948A]'
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Player overview card */}
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#332C25] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-black text-2xl text-[#F2EDE4] tracking-tight">
                {player.name}
              </h3>
              <span className="rounded bg-[#241F1B] px-2 py-0.5 text-xs text-[#9C948A]">
                {player.status}
              </span>
              <span className="rounded bg-[#E8B33D]/10 px-2 py-0.5 text-xs font-semibold text-[#E8B33D]">
                {player.tier}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#9C948A]">
              Julukan Pantos: <span className="text-[#F2EDE4] font-medium italic">"{getPlayerTitle()}"</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-center">
              <span className="block font-black text-lg text-[#F2EDE4]">
                {player.total_match}
              </span>
              <span className="text-[10px] text-[#9C948A] uppercase">Total Match</span>
            </div>
            <div className="rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-center">
              <span className="block font-black text-lg text-[#E8B33D]">
                {player.medals.MVP}
              </span>
              <span className="text-[10px] text-[#9C948A] uppercase">MVP Diraih</span>
            </div>
            <div className="rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-center">
              <span className="block font-black text-lg text-[#b8764a]">
                {player.medals.Coklat}
              </span>
              <span className="text-[10px] text-[#9C948A] uppercase">Coklat</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pie Chart: Distribusi Medali */}
          <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
                <PieIcon size={14} /> Distribusi Medali
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
                MVP: {player.medals.MVP}
              </span>
              <span className="flex items-center gap-1.5 text-[#F2EDE4]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D8A93A]" />
                Gold: {player.medals.Gold}
              </span>
              <span className="flex items-center gap-1.5 text-[#F2EDE4]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B9B2A8]" />
                Silver: {player.medals.Silver}
              </span>
              <span className="flex items-center gap-1.5 text-[#F2EDE4]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#6B4226]" />
                Coklat: {player.medals.Coklat}
              </span>
            </div>
          </div>

          {/* Line Chart: Tren Performa Mingguan */}
          <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
                <TrendingUp size={14} /> Tren Performa (MVP=3, Gold=2, Silver=1, Coklat=0)
              </span>
              <span className="text-[11px] text-[#9C948A]">
                Poin / Laga
              </span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis
                    dataKey="label"
                    stroke="#9C948A"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#332C25' }}
                  />
                  <YAxis
                    domain={[0, 3]}
                    ticks={[0, 1, 2, 3]}
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
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val} Poin`, 'Performa']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#E8B33D"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#E8B33D', stroke: '#1D1916', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#F2EDE4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-2 text-center text-[11px] text-[#9C948A]">
              Grafik menunjukkan fluktuasi kontribusi dalam pertandingan terkini.
            </p>
          </div>
        </div>

        {/* Top 3 Hero andalan */}
        <div className="mt-6 border-t border-[#332C25] pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
              <Sparkles size={14} /> Top 3 Hero Andalan {player.name}
            </h4>
            <span className="text-xs text-[#9C948A]">
              Urutan berdasarkan jumlah main & rasio MVP
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {topHeroes.map((h, i) => (
              <div
                key={h.hero}
                className="rounded-xl border border-[#332C25] bg-[#241F1B] p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-[#161311] font-bold text-xs text-[#E8B33D]">
                      #{i + 1}
                    </span>
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
    </div>
  );
};

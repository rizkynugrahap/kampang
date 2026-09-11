import React from 'react';
import { Trophy, Award, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
import { Player } from '../types';
import { sortKelasSemen } from '../utils/stats';

interface KelasSemenTableProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
}

export const KelasSemenTable: React.FC<KelasSemenTableProps> = ({
  players,
  onSelectPlayer,
}) => {
  const sorted = sortKelasSemen(players);

  return (
    <section id="section-kelas-semen" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F1B] text-[#E8B33D]">
            <Trophy size={16} />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#F2EDE4] sm:text-lg">
              Klasemen Resmi "Kelas Semen"
            </h2>
            <p className="text-xs text-[#9C948A]">
              Urutan: MVP terbanyak · Tie-breaker: Coklat tersedikit
            </p>
          </div>
        </div>
        <span className="hidden rounded-md border border-[#332C25] bg-[#241F1B] px-2.5 py-1 text-[11px] font-medium text-[#9C948A] sm:inline-block">
          Klik baris untuk Top Hero
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#332C25] bg-[#1D1916]">
        {/* Table Header */}
        <div className="grid grid-cols-12 items-center border-b border-[#332C25] bg-[#191513] px-3 py-2 text-[11px] font-semibold text-[#9C948A] sm:px-4">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-5 sm:col-span-4">Pemain</div>
          <div className="col-span-3 sm:col-span-4">Proporsi Medali</div>
          <div className="col-span-3 text-right">MVP / Coklat</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#332C25]/70">
          {sorted.map((player, idx) => {
            const isLeader = idx === 0;
            const isBottom = idx === sorted.length - 1 && sorted.length > 2;
            const total =
              player.medals.MVP +
                player.medals.Gold +
                player.medals.Silver +
                player.medals.Coklat || 1;

            const mvpPct = (player.medals.MVP / total) * 100;
            const goldPct = (player.medals.Gold / total) * 100;
            const silverPct = (player.medals.Silver / total) * 100;
            const coklatPct = (player.medals.Coklat / total) * 100;

            return (
              <button
                key={player.id}
                id={`player-row-${player.id}`}
                onClick={() => onSelectPlayer(player)}
                className="group grid w-full grid-cols-12 items-center px-3 py-3 text-left transition-colors hover:bg-[#241F1B] sm:px-4"
              >
                {/* Rank number */}
                <div className="col-span-1 flex items-center justify-center">
                  {isLeader ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8B33D]/20 font-bold text-xs text-[#E8B33D]">
                      1
                    </span>
                  ) : isBottom ? (
                    <span
                      title="Warga Kehormatan Kelas Semen"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6B4226]/30 font-bold text-xs text-[#b8764a]"
                    >
                      {idx + 1}
                    </span>
                  ) : (
                    <span className="font-semibold text-xs text-[#9C948A]">
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Player details */}
                <div className="col-span-5 pr-2 sm:col-span-4">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-sm text-[#F2EDE4] group-hover:text-[#E8B33D]">
                      {player.name}
                    </span>
                    {player.status === 'Cabutan' && (
                      <span className="rounded bg-[#332C25] px-1.5 py-0.2 text-[10px] text-[#9C948A]">
                        Cabutan
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#9C948A]">
                    <span>{player.tier}</span>
                    <span>·</span>
                    <span>{player.total_match} match</span>
                  </div>
                </div>

                {/* Medal proportion mini bar */}
                <div className="col-span-3 pr-2 sm:col-span-4">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#2a241f]">
                    {player.medals.MVP > 0 && (
                      <div
                        style={{ width: `${mvpPct}%` }}
                        className="bg-[#E8B33D]"
                        title={`MVP: ${player.medals.MVP}`}
                      />
                    )}
                    {player.medals.Gold > 0 && (
                      <div
                        style={{ width: `${goldPct}%` }}
                        className="bg-[#D8A93A]"
                        title={`Gold: ${player.medals.Gold}`}
                      />
                    )}
                    {player.medals.Silver > 0 && (
                      <div
                        style={{ width: `${silverPct}%` }}
                        className="bg-[#B9B2A8]"
                        title={`Silver: ${player.medals.Silver}`}
                      />
                    )}
                    {player.medals.Coklat > 0 && (
                      <div
                        style={{ width: `${coklatPct}%` }}
                        className="bg-[#6B4226]"
                        title={`Coklat: ${player.medals.Coklat}`}
                      />
                    )}
                  </div>
                  <div className="mt-1 hidden items-center gap-2 text-[10px] text-[#9C948A] sm:flex">
                    <span className="flex items-center gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#E8B33D]" /> {player.medals.MVP}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D8A93A]" /> {player.medals.Gold}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#B9B2A8]" /> {player.medals.Silver}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6B4226]" /> {player.medals.Coklat}
                    </span>
                  </div>
                </div>

                {/* MVP / Coklat count & action */}
                <div className="col-span-3 flex items-center justify-end gap-2 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-xs text-[#E8B33D]">
                      {player.medals.MVP} MVP
                    </span>
                    <span className="font-medium text-[11px] text-[#A66336]">
                      {player.medals.Coklat} Coklat
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-[#9C948A]/50 transition-transform group-hover:translate-x-0.5 group-hover:text-[#F2EDE4]"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

import React, { useState } from 'react';
import {
  X,
  Download,
  Database,
  Users,
  Swords,
  Trophy,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowDownToLine,
  FileText,
} from 'lucide-react';
import { Player, Match, TournamentData, LagaAmalSeasonData } from '../types';
import {
  downloadCsvFile,
  generatePlayersCsv,
  generateMatchesCsv,
  generateMatchDetailsCsv,
  generateTournamentsCsv,
  generateLagaAmalCsv,
  generateAllInOneDatabaseCsv,
} from '../utils/csvExport';

interface ExportDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  matches: Match[];
  tournaments: TournamentData[];
  lagaAmal?: LagaAmalSeasonData;
}

export const ExportDatabaseModal: React.FC<ExportDatabaseModalProps> = ({
  isOpen,
  onClose,
  players,
  matches,
  tournaments,
  lagaAmal,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerFeedback = (message: string) => {
    setDownloadSuccess(message);
    setTimeout(() => {
      setDownloadSuccess(null);
    }, 3000);
  };

  const handleExportMaster = () => {
    const csv = generateAllInOneDatabaseCsv({
      players,
      matches,
      tournaments,
      lagaAmal,
    });
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(`database_pantos_master_${dateStr}.csv`, csv);
    triggerFeedback('File Master Database CSV berhasil diunduh!');
  };

  const handleExportPlayers = () => {
    const csv = generatePlayersCsv(players);
    downloadCsvFile('pantos_database_pemain.csv', csv);
    triggerFeedback('Data Pemain (CSV) berhasil diunduh!');
  };

  const handleExportMatches = () => {
    const csv = generateMatchesCsv(matches);
    downloadCsvFile('pantos_riwayat_pertandingan.csv', csv);
    triggerFeedback('Data Riwayat Pertandingan (CSV) berhasil diunduh!');
  };

  const handleExportMatchDetails = () => {
    const csv = generateMatchDetailsCsv(matches);
    downloadCsvFile('pantos_detail_partisipasi_pemain_match.csv', csv);
    triggerFeedback('Data Detail Performa Hero & Match (CSV) berhasil diunduh!');
  };

  const handleExportTournaments = () => {
    const csv = generateTournamentsCsv(tournaments);
    downloadCsvFile('pantos_turnamen_klasemen_fixtures.csv', csv);
    triggerFeedback('Data Turnamen & Klasemen Tim (CSV) berhasil diunduh!');
  };

  const handleExportLagaAmal = () => {
    if (lagaAmal) {
      const csv = generateLagaAmalCsv(lagaAmal);
      downloadCsvFile(`pantos_klasemen_laga_amal_${lagaAmal.id}.csv`, csv);
      triggerFeedback('Data Klasemen Laga Amal (CSV) berhasil diunduh!');
    }
  };

  const handleExportAllIndividual = () => {
    handleExportPlayers();
    setTimeout(() => handleExportMatches(), 250);
    setTimeout(() => handleExportMatchDetails(), 500);
    setTimeout(() => handleExportTournaments(), 750);
    if (lagaAmal) {
      setTimeout(() => handleExportLagaAmal(), 1000);
    }
    triggerFeedback('Semua file CSV terpisah sedang diunduh bersamaan!');
  };

  const totalTeams = tournaments.reduce((acc, t) => acc + (t.standings?.length || 0), 0);

  return (
    <div
      id="export-csv-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="export-csv-modal-content"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#332C25] bg-[#161311] shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#332C25] bg-[#1D1916] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2A241E] text-[#E8B33D] ring-1 ring-[#44382C]">
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F2EDE4] sm:text-lg">
                  Export Database ke CSV
                </h3>
                <span className="rounded-full bg-[#4F7942]/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-[#4F7942]/40">
                  Excel & Sheets Ready
                </span>
              </div>
              <p className="text-xs text-[#9C948A]">
                Unduh seluruh data Pantos E-Sport dalam format tabel CSV (UTF-8)
              </p>
            </div>
          </div>
          <button
            id="btn-close-export-modal"
            onClick={onClose}
            className="rounded-lg p-2 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success toast inside modal */}
        {downloadSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-[#4F7942] bg-[#4F7942]/15 px-4 py-2.5 text-xs font-semibold text-emerald-200 animate-in slide-in-from-top-2">
            <CheckCircle2 size={16} className="text-[#4F7942] shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-[#332C25] bg-[#1D1916] p-3 text-center">
              <div className="flex justify-center text-[#9C948A] mb-1">
                <Users size={16} />
              </div>
              <div className="text-base font-bold text-[#F2EDE4]">{players.length}</div>
              <div className="text-[10px] text-[#9C948A]">Pemain Terdaftar</div>
            </div>

            <div className="rounded-xl border border-[#332C25] bg-[#1D1916] p-3 text-center">
              <div className="flex justify-center text-[#9C948A] mb-1">
                <Swords size={16} />
              </div>
              <div className="text-base font-bold text-[#F2EDE4]">{matches.length}</div>
              <div className="text-[10px] text-[#9C948A]">Riwayat Pertandingan</div>
            </div>

            <div className="rounded-xl border border-[#332C25] bg-[#1D1916] p-3 text-center">
              <div className="flex justify-center text-[#9C948A] mb-1">
                <Trophy size={16} />
              </div>
              <div className="text-base font-bold text-[#F2EDE4]">{tournaments.length} Turnamen</div>
              <div className="text-[10px] text-[#9C948A]">{totalTeams} Tim Peserta</div>
            </div>

            <div className="rounded-xl border border-[#332C25] bg-[#1D1916] p-3 text-center">
              <div className="flex justify-center text-[#9C948A] mb-1">
                <FileSpreadsheet size={16} />
              </div>
              <div className="text-base font-bold text-[#F2EDE4]">
                {lagaAmal?.players?.length || 14} Pemain
              </div>
              <div className="text-[10px] text-[#9C948A]">Klasemen Laga Amal</div>
            </div>
          </div>

          {/* Master Full Database Option */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-[#E8B33D]/60 bg-gradient-to-r from-[#2B231B] to-[#1D1916] p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#E8B33D]/20 px-2 py-0.5 text-[10px] font-bold text-[#E8B33D] uppercase tracking-wider">
                    <Sparkles size={11} /> Rekomendasi Utama
                  </span>
                </div>
                <h4 className="text-base font-bold text-[#F2EDE4]">
                  Master Database Lengkap (All-in-One CSV)
                </h4>
                <p className="text-xs text-[#C5BCAD] max-w-md">
                  Menggabungkan seluruh database (Pemain, Pertandingan, Detail Partisipasi, Turnamen, dan Laga Amal) ke dalam 1 file master terstruktur.
                </p>
              </div>

              <button
                id="btn-export-master-csv"
                onClick={handleExportMaster}
                className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#E8B33D] px-5 py-3 font-bold text-xs text-[#161311] shadow-md transition-all hover:bg-[#F3C256] hover:scale-105 active:scale-95"
              >
                <ArrowDownToLine size={16} />
                <span>Unduh Master CSV</span>
              </button>
            </div>
          </div>

          {/* Individual Exports Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#9C948A] uppercase tracking-wider">
                Unduh Data Spesifik per Kategori
              </h4>
              <button
                id="btn-export-all-individual-csv"
                onClick={handleExportAllIndividual}
                className="text-[11px] font-semibold text-[#E8B33D] hover:underline"
              >
                Unduh Semua File Terpisah
              </button>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {/* Option 1: Players */}
              <div className="flex items-center justify-between rounded-xl border border-[#332C25] bg-[#1D1916] p-3.5 transition-colors hover:border-[#4A3F35]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2A241E] text-blue-400">
                    <Users size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#F2EDE4]">Data Pemain & Medali</div>
                    <div className="text-[11px] text-[#9C948A]">
                      {players.length} Pemain · MVP, Antam, Silver, Coklat
                    </div>
                  </div>
                </div>
                <button
                  id="btn-export-players-csv"
                  onClick={handleExportPlayers}
                  title="Unduh pantos_database_pemain.csv"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#241F1B] text-[#E8B33D] hover:bg-[#302822] hover:text-[#F2EDE4]"
                >
                  <Download size={14} />
                </button>
              </div>

              {/* Option 2: Matches */}
              <div className="flex items-center justify-between rounded-xl border border-[#332C25] bg-[#1D1916] p-3.5 transition-colors hover:border-[#4A3F35]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2A241E] text-amber-400">
                    <Swords size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#F2EDE4]">Ringkasan Pertandingan</div>
                    <div className="text-[11px] text-[#9C948A]">
                      {matches.length} Laga · Skor, MVP & Analisis AI
                    </div>
                  </div>
                </div>
                <button
                  id="btn-export-matches-csv"
                  onClick={handleExportMatches}
                  title="Unduh pantos_riwayat_pertandingan.csv"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#241F1B] text-[#E8B33D] hover:bg-[#302822] hover:text-[#F2EDE4]"
                >
                  <Download size={14} />
                </button>
              </div>

              {/* Option 3: Match Details */}
              <div className="flex items-center justify-between rounded-xl border border-[#332C25] bg-[#1D1916] p-3.5 transition-colors hover:border-[#4A3F35]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2A241E] text-emerald-400">
                    <FileText size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#F2EDE4]">Detail Performa Hero Tiap Laga</div>
                    <div className="text-[11px] text-[#9C948A]">
                      Baris per pemain, hero, medali, hasil W/L
                    </div>
                  </div>
                </div>
                <button
                  id="btn-export-match-details-csv"
                  onClick={handleExportMatchDetails}
                  title="Unduh pantos_detail_partisipasi_pemain_match.csv"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#241F1B] text-[#E8B33D] hover:bg-[#302822] hover:text-[#F2EDE4]"
                >
                  <Download size={14} />
                </button>
              </div>

              {/* Option 4: Tournaments */}
              <div className="flex items-center justify-between rounded-xl border border-[#332C25] bg-[#1D1916] p-3.5 transition-colors hover:border-[#4A3F35]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2A241E] text-purple-400">
                    <Trophy size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#F2EDE4]">Turnamen & Klasemen Tim</div>
                    <div className="text-[11px] text-[#9C948A]">
                      Klasemen poin tim & seluruh jadwal fixture
                    </div>
                  </div>
                </div>
                <button
                  id="btn-export-tournaments-csv"
                  onClick={handleExportTournaments}
                  title="Unduh pantos_turnamen_klasemen_fixtures.csv"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#241F1B] text-[#E8B33D] hover:bg-[#302822] hover:text-[#F2EDE4]"
                >
                  <Download size={14} />
                </button>
              </div>

              {/* Option 5: Laga Amal S41 */}
              {lagaAmal && (
                <div className="flex items-center justify-between rounded-xl border border-[#332C25] bg-[#1D1916] p-3.5 transition-colors hover:border-[#4A3F35] sm:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2A241E] text-rose-400">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#F2EDE4]">
                        Klasemen Laga Amal (Musim 41)
                      </div>
                      <div className="text-[11px] text-[#9C948A]">
                        Format standar benchmark spreadsheet (Klasemen, Most Hero Pick by User, Hero Pool)
                      </div>
                    </div>
                  </div>
                  <button
                    id="btn-export-laga-amal-csv"
                    onClick={handleExportLagaAmal}
                    title="Unduh pantos_klasemen_laga_amal_s41.csv"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#241F1B] text-[#E8B33D] hover:bg-[#302822] hover:text-[#F2EDE4]"
                  >
                    <Download size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info note */}
          <div className="rounded-xl border border-[#332C25] bg-[#1A1714] p-3.5 text-[11px] text-[#9C948A] space-y-1">
            <div className="font-semibold text-[#F2EDE4] flex items-center gap-1.5">
              <Layers size={13} className="text-[#E8B33D]" />
              <span>Kompatibilitas Format CSV:</span>
            </div>
            <p>
              Semua file diekspor menggunakan standar UTF-8 BOM sehingga langsung terbaca rapi dengan pemisah kolom yang tepat di Microsoft Excel, Google Sheets, LibreOffice Calc, dan Apple Numbers.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#332C25] bg-[#1D1916] px-6 py-3.5">
          <span className="text-[11px] text-[#9C948A]">
            Pantos E-Sport Hub Database Exporter
          </span>
          <button
            id="btn-close-export-modal-bottom"
            onClick={onClose}
            className="rounded-lg border border-[#332C25] bg-[#241F1B] px-4 py-1.5 text-xs font-medium text-[#F2EDE4] hover:bg-[#302822]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

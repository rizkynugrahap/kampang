import { Player, Match, TournamentData, LagaAmalSeasonData } from '../types';

/**
 * Escapes a single CSV cell value according to RFC 4180
 */
export function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Triggers a browser download of a CSV string with UTF-8 BOM
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  // UTF-8 BOM (\uFEFF) ensures Excel and Sheets properly read UTF-8 characters and symbols
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates CSV string for Players database
 */
export function generatePlayersCsv(players: Player[]): string {
  const headers = [
    'ID Pemain',
    'Nama Pemain',
    'Status',
    'Tier',
    'Total Match',
    'Medali MVP',
    'Medali Antam (Gold)',
    'Medali Silver',
    'Medali Coklat',
    'Total Skor Medali',
    'Win Rate (%)',
  ];

  const rows = players.map((p) => {
    const totalMatch = p.total_match || 0;
    const mvp = p.medals?.MVP || 0;
    const gold = p.medals?.Gold || 0;
    const silver = p.medals?.Silver || 0;
    const coklat = p.medals?.Coklat || 0;
    // Standard score weight: MVP: 10, Gold: 7, Silver: 5, Coklat: 1
    const totalScore = mvp * 10 + gold * 7 + silver * 5 + coklat * 1;
    const winRate = totalMatch > 0 ? (((mvp + gold) / totalMatch) * 100).toFixed(1) : '0.0';

    return [
      escapeCsvCell(p.id),
      escapeCsvCell(p.name),
      escapeCsvCell(p.status),
      escapeCsvCell(p.tier),
      escapeCsvCell(totalMatch),
      escapeCsvCell(mvp),
      escapeCsvCell(gold),
      escapeCsvCell(silver),
      escapeCsvCell(coklat),
      escapeCsvCell(totalScore),
      escapeCsvCell(`${winRate}%`),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generates CSV string for Match summaries
 */
export function generateMatchesCsv(matches: Match[]): string {
  const headers = [
    'Match ID',
    'Tanggal',
    'Musim',
    'Tipe Match',
    'Stage Turnamen',
    'Tim Pemenang',
    'Tim Kalah',
    'MVP Match',
    'Lineup Tim Pohon',
    'Lineup Tim Lobby',
    'Analisis AI E-sport',
  ];

  const rows = matches.map((m) => {
    const winner = m.winner;
    const loser = winner === 'Tim Pohon' ? 'Tim Lobby' : 'Tim Pohon';

    // Find MVP player name
    const allPlayers = [...(m.pohon || []), ...(m.lobby || [])];
    const mvpPlayer = allPlayers.find((p) => p.medal === 'MVP');
    const mvpName = mvpPlayer ? `${mvpPlayer.player_name} (${mvpPlayer.hero_name})` : '-';

    const pohonLineup = (m.pohon || [])
      .map((p) => `${p.player_name} [${p.hero_name} - ${p.medal}]`)
      .join('; ');

    const lobbyLineup = (m.lobby || [])
      .map((p) => `${p.player_name} [${p.hero_name} - ${p.medal}]`)
      .join('; ');

    return [
      escapeCsvCell(m.id),
      escapeCsvCell(m.date),
      escapeCsvCell(m.season),
      escapeCsvCell(m.type),
      escapeCsvCell(m.tournament_stage || '-'),
      escapeCsvCell(winner),
      escapeCsvCell(loser),
      escapeCsvCell(mvpName),
      escapeCsvCell(pohonLineup),
      escapeCsvCell(lobbyLineup),
      escapeCsvCell(m.ai_analysis ? m.ai_analysis.replace(/\n+/g, ' ') : '-'),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generates granular per-player match participation detail CSV
 */
export function generateMatchDetailsCsv(matches: Match[]): string {
  const headers = [
    'Match ID',
    'Tanggal',
    'Musim',
    'Tipe Match',
    'Tim',
    'Nama Pemain',
    'Hero',
    'Medali',
    'Poin Medali',
    'Hasil Tim',
  ];

  const rows: string[] = [];

  matches.forEach((m) => {
    const processTeam = (players: typeof m.pohon, teamName: 'Tim Pohon' | 'Tim Lobby') => {
      const isWon = m.winner === teamName;
      players.forEach((p) => {
        let points = 5;
        if (p.medal === 'MVP') points = 10;
        else if (p.medal === 'Gold') points = 7;
        else if (p.medal === 'Silver') points = 5;
        else if (p.medal === 'Coklat') points = 1;

        rows.push(
          [
            escapeCsvCell(m.id),
            escapeCsvCell(m.date),
            escapeCsvCell(m.season),
            escapeCsvCell(m.type),
            escapeCsvCell(teamName),
            escapeCsvCell(p.player_name),
            escapeCsvCell(p.hero_name),
            escapeCsvCell(p.medal),
            escapeCsvCell(points),
            escapeCsvCell(isWon ? 'MENANG' : 'KALAH'),
          ].join(',')
        );
      });
    };

    processTeam(m.pohon || [], 'Tim Pohon');
    processTeam(m.lobby || [], 'Tim Lobby');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generates CSV string for Tournament standings and fixtures
 */
export function generateTournamentsCsv(tournaments: TournamentData[]): string {
  const lines: string[] = [];

  tournaments.forEach((t, tIdx) => {
    lines.push(`=== TURNAMEN ${t.name.toUpperCase()} (MUSIM: ${t.season}) ===`);
    lines.push(
      `Format: ${t.format},Status: ${t.status},Prize Pool: ${t.prizePool},Total Tim: ${t.standings?.length || 0}`
    );
    lines.push('');

    // Standings table
    lines.push('--- KLASEMEN TIM TURNAMEN ---');
    lines.push(
      'Peringkat,Nama Tim,Singkatan,Poin,Main (P),Menang (W),Kalah (L),Game Wins,Game Losses,Diff,MVP,Gold,Silver,Coklat,Form'
    );

    const sortedStandings = [...(t.standings || [])].sort((a, b) => b.points - a.points);
    sortedStandings.forEach((s, idx) => {
      const diff = s.gameWins - s.gameLosses;
      const formStr = s.form ? s.form.join('-') : '-';
      lines.push(
        [
          escapeCsvCell(idx + 1),
          escapeCsvCell(s.name),
          escapeCsvCell(s.shortName),
          escapeCsvCell(s.points),
          escapeCsvCell(s.played),
          escapeCsvCell(s.won),
          escapeCsvCell(s.lost),
          escapeCsvCell(s.gameWins),
          escapeCsvCell(s.gameLosses),
          escapeCsvCell(diff > 0 ? `+${diff}` : diff),
          escapeCsvCell(s.mvpCount || 0),
          escapeCsvCell(s.goldCount || 0),
          escapeCsvCell(s.silverCount || 0),
          escapeCsvCell(s.coklatCount || 0),
          escapeCsvCell(formStr),
        ].join(',')
      );
    });

    lines.push('');

    // Fixtures table
    lines.push('--- JADWAL & HASIL FIXTURES ---');
    lines.push('ID Fixture,Ronde,Tanggal,Tim A,Tim B,Skor Tim A,Skor Tim B,Status,Pemenang');

    (t.fixtures || []).forEach((f) => {
      lines.push(
        [
          escapeCsvCell(f.id),
          escapeCsvCell(f.round),
          escapeCsvCell(f.date),
          escapeCsvCell(f.teamA),
          escapeCsvCell(f.teamB),
          escapeCsvCell(f.scoreA),
          escapeCsvCell(f.scoreB),
          escapeCsvCell(f.status),
          escapeCsvCell(f.winner || '-'),
        ].join(',')
      );
    });

    if (tIdx < tournaments.length - 1) {
      lines.push('');
      lines.push('====================================================');
      lines.push('');
    }
  });

  return lines.join('\n');
}

/**
 * Generates CSV string for Laga Amal Season (matching Excel benchmark)
 */
export function generateLagaAmalCsv(season: LagaAmalSeasonData): string {
  const lines: string[] = [];
  lines.push(`${escapeCsvCell(season.title)},,,,,,,,,,,,,,,,,,,`);
  lines.push(`,"${escapeCsvCell(season.dateStr)}",,,,,,,,,,,,,,,,,,,`);
  lines.push(',ACTIVE PLAYER,TOP COKLAT🥉,TOP SILVER 🥈,TOP ANTAM🥇,MVP👑,TOTAL MATCHES,TOTAL SCORE,,,,,,,,,,,,,');
  lines.push(
    `,${season.activePlayersCount},${escapeCsvCell(season.topCoklat.player)},${escapeCsvCell(
      season.topSilver.player
    )},${escapeCsvCell(season.topAntam.player)},${escapeCsvCell(season.topMvp.player)},${
      season.totalMatches
    }," ${season.totalScore.toLocaleString()} ",,,,,,,,,,,,,`
  );
  lines.push(',Nickname,Sum of Makan Coklat,Sum of Silver,Sum of Antam,Sum of MVP,Count of Ikut Main,Sum of Score,Sum of WR,Sum of AVG,,,,,,,,,,');

  season.players.forEach((p) => {
    lines.push(
      `,${escapeCsvCell(p.nickname)},${p.coklat},${p.silver},${p.antam},${p.mvp},${p.matches}, ${p.score.toFixed(
        1
      )} ,${p.winRate.toFixed(2)}%,${p.avgScore.toFixed(2)},,,,,,,,,,`
    );
  });

  lines.push(',,,,,,,,,,,,,,,,,,,,');
  lines.push(',MOST HERO PICK BY USER,,,,,,,,,,,,,,,,,,,');
  lines.push(',Player,Hero,1. COKLAT,2. SILVER,3. ANTAM,4. MVP,Total Result,,,,,,,,,,,,,');

  season.heroPicksByUser.forEach((hp) => {
    lines.push(
      `,${escapeCsvCell(hp.player)},${escapeCsvCell(hp.hero)},${hp.coklat || ''},${hp.silver || ''},${
        hp.antam || ''
      },${hp.mvp || ''},${hp.total},,,,,,,,,,,,,`
    );
  });

  if (season.heroPool && season.heroPool.length > 0) {
    lines.push(',,,,,,,,,,,,,,,,,,,,');
    lines.push(',HERO POOL DISTRIBUTION,,,,,,,,,,,,,,,,,,,');
    lines.push(',Hero,Total Picked,,,,,,,,,,,,,,,,,,');
    season.heroPool.forEach((h) => {
      lines.push(`,${escapeCsvCell(h.hero)},${h.picked},,,,,,,,,,,,,,,,,,`);
    });
  }

  return lines.join('\n');
}

/**
 * Generates an All-in-One Master Database Backup in a single comprehensive CSV
 */
export function generateAllInOneDatabaseCsv(data: {
  players: Player[];
  matches: Match[];
  tournaments: TournamentData[];
  lagaAmal?: LagaAmalSeasonData;
}): string {
  const sections: string[] = [];

  const timestamp = new Date().toLocaleString('id-ID');
  sections.push(`### PANTOS E-SPORT DATABASE MASTER BACKUP ###`);
  sections.push(`Diekspor pada: "${timestamp}"`);
  sections.push(`Total Pemain: ${data.players.length} | Total Matches: ${data.matches.length} | Total Turnamen: ${data.tournaments.length}`);
  sections.push('');

  // 1. Players Section
  sections.push('####################################################');
  sections.push('### BAGIAN 1: DATABASE PEMAIN & MEDALI PANTOS ###');
  sections.push('####################################################');
  sections.push(generatePlayersCsv(data.players));
  sections.push('');

  // 2. Matches Summary Section
  sections.push('####################################################');
  sections.push('### BAGIAN 2: DATABASE RIWAYAT PERTANDINGAN (MATCHES) ###');
  sections.push('####################################################');
  sections.push(generateMatchesCsv(data.matches));
  sections.push('');

  // 3. Match Player Details Section
  sections.push('####################################################');
  sections.push('### BAGIAN 3: DETAIL PERFORMA HERO & PEMAIN PER MATCH ###');
  sections.push('####################################################');
  sections.push(generateMatchDetailsCsv(data.matches));
  sections.push('');

  // 4. Tournaments Section
  sections.push('####################################################');
  sections.push('### BAGIAN 4: DATABASE KLASEMEN & FIXTURES TURNAMEN ###');
  sections.push('####################################################');
  sections.push(generateTournamentsCsv(data.tournaments));
  sections.push('');

  // 5. Laga Amal Section if available
  if (data.lagaAmal) {
    sections.push('####################################################');
    sections.push('### BAGIAN 5: KLASEMEN LAGA AMAL (BENCHMARK S41) ###');
    sections.push('####################################################');
    sections.push(generateLagaAmalCsv(data.lagaAmal));
    sections.push('');
  }

  return sections.join('\n');
}

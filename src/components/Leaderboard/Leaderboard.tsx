import type { LeaderboardEntry, TournamentFormat } from '../../types';
import { formatRank } from '../../utils/scoring';
import './Leaderboard.css';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onGenerateMatch?: () => void;
  title?: string;
  isAllTime?: boolean;
  format?: TournamentFormat;
}

export function Leaderboard({ entries, onGenerateMatch, title = 'Leaderboard', isAllTime = false, format }: LeaderboardProps) {
  if (entries.length === 0) return null;

  const showPointsScored = format === 'americano' || format === 'mexicano';

  const getRankClass = (rank: number) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <section className={`leaderboard-section ${isAllTime ? 'leaderboard-all-time' : ''}`}>
      <div className="leaderboard-header">
        <h2 className="section-title">{title}</h2>
        <div className="leaderboard-header-actions">
          {onGenerateMatch && (
            <button type="button" className="generate-match-btn" onClick={onGenerateMatch}>
              Generate Match
            </button>
          )}
          <span className="participant-count">
            {entries.length} Players
          </span>
        </div>
      </div>
      <div className="leaderboard-table-wrapper">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="col-rank">Rank</th>
              <th className="col-name">Player</th>
              <th className="col-stat">MP</th>
              <th className="col-stat">W</th>
              <th className="col-stat">L</th>
              <th className="col-stat">D</th>
              {showPointsScored && <th className="col-points">PS</th>}
              <th className="col-points">Pts</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.playerId} className={getRankClass(entry.rank)}>
                <td className="cell-rank">
                  <span className="rank-badge">
                    {getRankIcon(entry.rank) || formatRank(entry.rank)}
                  </span>
                </td>
                <td className="cell-name">{entry.name}</td>
                <td className="cell-stat">{entry.matchesPlayed}</td>
                <td className="cell-stat">{entry.wins}</td>
                <td className="cell-stat">{entry.losses}</td>
                <td className="cell-stat">{entry.draws}</td>
                {showPointsScored && <td className="cell-points">{entry.pointsScored}</td>}
                <td className="cell-points">{entry.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

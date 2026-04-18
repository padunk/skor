import type { Match } from '../../types';
import { MatchCard } from './MatchCard';
import './CourtCard.css';

interface CourtCardProps {
  court: number;
  matches: Match[];
  onScoreUpdate: (matchId: string, scoreA: number, scoreB: number) => void;
}

export function CourtCard({ court, matches, onScoreUpdate }: CourtCardProps) {
  if (matches.length === 0) return null;

  return (
    <div className="court-card">
      <div className="court-header">
        <div className="court-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M12 3v18" />
            <path d="M3 12h18" />
          </svg>
        </div>
        <h3 className="court-title">Court {court}</h3>
        <span className="court-match-count">{matches.length} matches</span>
      </div>
      <div className="court-matches">
        {matches.map((match, idx) => (
          <div key={match.id} className="court-match-row">
            <span className="match-slot">{idx + 1}</span>
            <div className="match-info">
              <MatchCard
                match={match}
                onScoreUpdate={onScoreUpdate}
                animationDelay={idx * 50}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

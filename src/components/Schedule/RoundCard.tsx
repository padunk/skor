import type { Match } from '../../types';
import { MatchCard } from './MatchCard';
import './RoundCard.css';

interface RoundCardProps {
  round: number;
  matches: Match[];
  courts: 1 | 2;
  onScoreUpdate: (matchId: string, scoreA: number, scoreB: number) => void;
}

export function RoundCard({ round, matches, courts, onScoreUpdate }: RoundCardProps) {
  return (
    <div className="round-card">
      <div className="round-header">
        <h3 className="round-title">Round {round}</h3>
        <div className="round-courts">
          {courts === 2 && matches.length > 1 ? (
            <>
              <span className="court-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M12 3v18" />
                </svg>
                Court 1
              </span>
              <span className="court-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M12 3v18" />
                </svg>
                Court 2
              </span>
            </>
          ) : (
            <span className="court-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              Court {matches[0]?.court || 1}
            </span>
          )}
        </div>
      </div>
      <div className={`round-matches ${matches.length > 1 ? 'multi-match' : ''}`}>
        {matches.map((match, idx) => (
          <MatchCard
            key={match.id}
            match={match}
            onScoreUpdate={onScoreUpdate}
            animationDelay={idx * 100}
          />
        ))}
      </div>
    </div>
  );
}

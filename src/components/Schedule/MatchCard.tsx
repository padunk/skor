import { useEffect, useState } from 'react';
import type { Match, Team } from '../../types';
import './MatchCard.css';

interface MatchCardProps {
  match: Match;
  onScoreUpdate: (matchId: string, scoreA: number, scoreB: number) => void;
  animationDelay?: number;
}

export function MatchCard({ match, onScoreUpdate, animationDelay = 0 }: MatchCardProps) {
  const hasScore = match.scoreA !== null && match.scoreB !== null;
  const [isEditing, setIsEditing] = useState(!hasScore);
  const [scoreA, setScoreA] = useState(match.scoreA?.toString() ?? '');
  const [scoreB, setScoreB] = useState(match.scoreB?.toString() ?? '');

  useEffect(() => {
    setScoreA(match.scoreA?.toString() ?? '');
    setScoreB(match.scoreB?.toString() ?? '');
    if (match.scoreA !== null && match.scoreB !== null) {
      setIsEditing(false);
    }
  }, [match.id, match.scoreA, match.scoreB]);

  const handleScoreSubmit = () => {
    const numA = parseInt(scoreA, 10);
    const numB = parseInt(scoreB, 10);
    
    if (!isNaN(numA) && !isNaN(numB) && numA >= 0 && numB >= 0) {
      onScoreUpdate(match.id, numA, numB);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScoreSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setScoreA(match.scoreA?.toString() ?? '');
      setScoreB(match.scoreB?.toString() ?? '');
    }
  };

  const handleBlur = () => {
    if (scoreA !== '' && scoreB !== '') {
      handleScoreSubmit();
    }
  };

  const getWinnerClass = (team: 'A' | 'B') => {
    if (!match.winner) return '';
    if (match.winner === 'draw') return 'team-draw';
    return match.winner === team ? 'team-winner' : 'team-loser';
  };

  const renderTeam = (team: Team, side: 'A' | 'B') => (
    <div className={`team ${getWinnerClass(side)}`}>
      <div className="team-players">
        {team.players.map((player, idx) => (
          <span key={player.id} className="player-name">
            {player.name}
            {idx < team.players.length - 1 && <span className="player-separator">&</span>}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div 
      className={`match-card ${match.winner ? 'match-complete' : ''}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="match-content">
        {renderTeam(match.teamA, 'A')}
        
        <div className="match-vs">
          {isEditing ? (
            <div className="score-input-group">
              <input
                type="number"
                className="score-input"
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                min="0"
                placeholder="0"
                autoFocus
              />
              <span className="score-separator">-</span>
              <input
                type="number"
                className="score-input"
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                min="0"
                placeholder="0"
              />
              <button type="button" className="score-submit" onClick={handleScoreSubmit}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="score-display"
              onClick={() => setIsEditing(true)}
            >
              {match.scoreA !== null && match.scoreB !== null ? (
                <>
                  <span className={`score ${getWinnerClass('A')}`}>{match.scoreA}</span>
                  <span className="score-divider">:</span>
                  <span className={`score ${getWinnerClass('B')}`}>{match.scoreB}</span>
                </>
              ) : (
                <span className="score-placeholder">Set Score</span>
              )}
            </button>
          )}
        </div>
        
        {renderTeam(match.teamB, 'B')}
      </div>
    </div>
  );
}

import type { Match } from '../../types';
import { getMatchesForCourt } from '../../utils/roundRobin';
import { CourtCard } from './CourtCard';
import './Schedule.css';

interface ScheduleProps {
  matches: Match[];
  courts: 1 | 2;
  onScoreUpdate: (matchId: string, scoreA: number, scoreB: number) => void;
  onAddMatch: () => void;
}

export function Schedule({ matches, courts, onScoreUpdate, onAddMatch }: ScheduleProps) {
  if (matches.length === 0) return null;

  const courtNumbers = Array.from({ length: courts }, (_, i) => i + 1);

  return (
    <section className="schedule-section">
      <div className="schedule-header">
        <h2 className="section-title">Match Schedule</h2>
        <button type="button" className="add-match-btn" onClick={onAddMatch}>
          Add Match
        </button>
      </div>
      <div className="schedule-courts">
        {courtNumbers.map((court) => (
          <CourtCard
            key={court}
            court={court}
            matches={getMatchesForCourt(matches, court)}
            onScoreUpdate={onScoreUpdate}
          />
        ))}
      </div>
    </section>
  );
}

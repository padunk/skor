import { useState } from 'react';
import { Button } from '../Button';
import { Select } from '../Select';
import { parseParticipants, validateParticipants } from '../../utils/parser';
import type { Player } from '../../types';
import './InputSection.css';

const SPORTS = [
  { value: 'Tennis', label: 'Tennis' },
  { value: 'Padel', label: 'Padel' },
  { value: 'Badminton', label: 'Badminton' },
  { value: 'Squash', label: 'Squash' },
  { value: 'Pickleball', label: 'Pickleball' },
  { value: 'Table Tennis', label: 'Table Tennis' }
];

const DURATIONS = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' }
];

interface InputSectionProps {
  sport: string;
  courts: 1 | 2;
  teamSize: 'single' | 'double';
  durationMinutes: number;
  onSportChange: (sport: string) => void;
  onCourtsChange: (courts: 1 | 2) => void;
  onTeamSizeChange: (size: 'single' | 'double') => void;
  onDurationChange: (duration: number) => void;
  onGenerate: (players: Player[], warnings: string[]) => void;
  disabled?: boolean;
}

export function InputSection({
  sport,
  courts,
  teamSize,
  durationMinutes,
  onSportChange,
  onCourtsChange,
  onTeamSizeChange,
  onDurationChange,
  onGenerate,
  disabled = false
}: InputSectionProps) {
  const [participants, setParticipants] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = () => {
    const validation = validateParticipants(participants);
    if (!validation.valid) {
      setError(validation.error || 'Invalid input');
      return;
    }

    setError(null);
    const { players, warnings } = parseParticipants(participants);
    onGenerate(players, warnings);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <section className="input-section">
      <div className="input-header">
        <h2 className="input-title">Configuration</h2>
        <button
          className="help-toggle"
          onClick={() => setShowHelp(!showHelp)}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
          </svg>
          Format Help
        </button>
      </div>

      {showHelp && (
        <div className="help-panel">
          <p>Enter participants in this format:</p>
          <code>1. Mark (M) 2. Bob (M) 3. Alice (F) 4. Sinta (F)</code>
          <p>Variations accepted:</p>
          <ul>
            <li><code>1. mark(m)</code></li>
            <li><code>2. Alice F</code></li>
            <li><code>3. bob [f]</code></li>
          </ul>
          <p><strong>M</strong> = Male, <strong>F</strong> = Female</p>
        </div>
      )}

      <div className="input-grid">
        <div className="input-field textarea-field">
          <label htmlFor="participants" className="input-label">
            Participants
          </label>
          <textarea
            id="participants"
            className={`input-textarea ${error ? 'input-error' : ''}`}
            placeholder="1. Mark (M)&#10;2. Bob (M)&#10;3. Alice (F)&#10;4. Sinta (F)"
            value={participants}
            onChange={(e) => {
              setParticipants(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            rows={6}
            disabled={disabled}
          />
          {error && <span className="error-message">{error}</span>}
        </div>

        <div className="input-settings">
          <Select
            label="Sport"
            options={SPORTS}
            value={sport}
            onChange={onSportChange}
          />

          <Select
            label="Courts"
            options={[
              { value: '1', label: '1 Court' },
              { value: '2', label: '2 Courts' }
            ]}
            value={String(courts)}
            onChange={(v) => onCourtsChange(Number(v) as 1 | 2)}
          />

          <Select
            label="Team Size"
            options={[
              { value: 'double', label: 'Doubles (2v2)' },
              { value: 'single', label: 'Singles (1v1)' }
            ]}
            value={teamSize}
            onChange={(v) => onTeamSizeChange(v as 'single' | 'double')}
          />

          <Select
            label="Duration"
            options={DURATIONS}
            value={String(durationMinutes)}
            onChange={(v) => onDurationChange(Number(v))}
          />
        </div>
      </div>

      <div className="input-actions">
        <Button
          variant="primary"
          size="large"
          onClick={handleSubmit}
          disabled={disabled || !participants.trim()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Generate Teams
        </Button>
        <span className="hint">Press Ctrl+Enter to generate</span>
      </div>
    </section>
  );
}

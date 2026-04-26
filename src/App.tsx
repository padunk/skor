import { useReducer, useState, useCallback, useEffect } from "react";
import type { GameState, GameAction, Toast, LeaderboardEntry } from "./types";
import {
  generateAdditionalMatches,
  generateTimeBasedSchedule,
} from "./utils/roundRobin";
import {
  updateMatchScore,
  generateLeaderboard,
  mergeLeaderboards,
} from "./utils/scoring";
import {
  saveLeaderboard,
  getAllLeaderboardEntries,
  clearExpiredHistory,
  clearAllHistory,
} from "./utils/db";
import { Header } from "./components/Header";
import { InputSection } from "./components/InputSection";
import { Schedule } from "./components/Schedule";
import { Leaderboard } from "./components/Leaderboard";
import { Button } from "./components/Button";
import { Modal } from "./components/Modal";
import { ToastContainer } from "./components/Toast";
import "./styles/variables.css";
import "./App.css";

const initialState: GameState = {
  sport: "Padel",
  courts: 2,
  teamSize: "double",
  durationMinutes: 120,
  format: "round_robin",
  pointsPerMatch: 24,
  participants: [],
  matches: [],
  isGenerated: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_SPORT":
      return { ...state, sport: action.payload };
    case "SET_COURTS":
      return { ...state, courts: action.payload };
    case "SET_TEAM_SIZE":
      return { ...state, teamSize: action.payload };
    case "SET_DURATION":
      return { ...state, durationMinutes: action.payload };
    case "SET_FORMAT":
      return { ...state, format: action.payload };
    case "SET_POINTS_PER_MATCH":
      return { ...state, pointsPerMatch: action.payload };
    case "SET_PARTICIPANTS":
      return { ...state, participants: action.payload };
    case "GENERATE_MATCHES":
      return { ...state, matches: action.payload, isGenerated: true };
    case "APPEND_MATCHES":
      return { ...state, matches: action.payload, isGenerated: true };
    case "UPDATE_SCORE":
      return {
        ...state,
        matches: state.matches.map((m) =>
          m.id === action.payload.matchId
            ? updateMatchScore(m, action.payload.scoreA, action.payload.scoreB)
            : m,
        ),
      };
    case "RESET":
      return {
        ...state,
        matches: state.matches.map((m) => ({
          ...m,
          scoreA: null,
          scoreB: null,
          winner: null,
        })),
      };
    case "RESTART":
      return {
        ...state,
        matches: [],
        isGenerated: false,
      };
    case "NEW_TEAMS": {
      const matches = generateTimeBasedSchedule(
        state.participants,
        state.courts,
        state.durationMinutes,
        {
          format: state.format,
          teamSize: state.teamSize,
          pointsPerMatch: state.pointsPerMatch,
        },
      );
      return { ...state, matches, isGenerated: true };
    }
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showNewTeamsModal, setShowNewTeamsModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<
    LeaderboardEntry[]
  >([]);

  useEffect(() => {
    const loadAllTimeLeaderboard = async () => {
      await clearExpiredHistory();
      const entries = await getAllLeaderboardEntries();
      if (entries.length > 0) {
        const leaderboards = entries.map((e) => e.leaderboard);
        const merged = mergeLeaderboards(leaderboards);
        setAllTimeLeaderboard(merged);
      }
    };
    loadAllTimeLeaderboard();
  }, []);

  useEffect(() => {
    const currentLeaderboard: LeaderboardEntry[] = state.isGenerated
      ? generateLeaderboard(state.matches, state.participants, state.format)
      : [];
    if (currentLeaderboard.length > 0) {
      saveLeaderboard(currentLeaderboard).catch(console.error);
    }
  }, [state.matches, state.participants, state.isGenerated, state.format]);

  const handleClearHistory = async () => {
    await clearAllHistory();
    setAllTimeLeaderboard([]);
    setShowRestartModal(false);
    dispatch({ type: "RESTART" });
    addToast("History cleared", "info");
  };

  const addToast = (message: string, type: Toast["type"]) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleGenerate = (
    players: import("./types").Player[],
    warnings: string[],
  ) => {
    dispatch({ type: "SET_PARTICIPANTS", payload: players });

    const matches = generateTimeBasedSchedule(
      players,
      state.courts,
      state.durationMinutes,
      {
        format: state.format,
        teamSize: state.teamSize,
        pointsPerMatch: state.pointsPerMatch,
      },
    );
    dispatch({ type: "GENERATE_MATCHES", payload: matches });

    warnings.forEach((w) => addToast(w, "info"));
    addToast(
      `Generated ${matches.length} matches for ${players.length} players`,
      "success",
    );
  };

  const handleScoreUpdate = (
    matchId: string,
    scoreA: number,
    scoreB: number,
  ) => {
    dispatch({ type: "UPDATE_SCORE", payload: { matchId, scoreA, scoreB } });
  };

  const handleReset = () => {
    dispatch({ type: "RESET" });
    setShowResetModal(false);
    addToast("Scores have been reset", "info");
  };

  const handleRestart = () => {
    dispatch({ type: "RESTART" });
    setShowRestartModal(false);
    addToast("Game restarted. Ready for new participants.", "info");
  };

  const handleNewTeams = () => {
    dispatch({ type: "NEW_TEAMS" });
    setShowNewTeamsModal(false);
    addToast("New teams have been generated!", "success");
  };

  const handleGenerateMatch = () => {
    dispatch({ type: "NEW_TEAMS" });
    addToast("Generated a fresh match schedule", "success");
  };

  const handleAddMatch = () => {
    const updated = generateAdditionalMatches(
      state.participants,
      state.courts,
      state.matches,
      1,
      {
        format: state.format,
        teamSize: state.teamSize,
        pointsPerMatch: state.pointsPerMatch,
      },
    );

    if (updated.length === state.matches.length) {
      addToast("Could not add a new match with current constraints", "warning");
      return;
    }

    dispatch({ type: "APPEND_MATCHES", payload: updated });
    addToast("Added 1 match to schedule", "success");
  };

  const handlePrint = () => {
    window.print();
  };

  const leaderboard: LeaderboardEntry[] = state.isGenerated
    ? generateLeaderboard(state.matches, state.participants, state.format)
    : [];

  return (
    <div className="app">
      <div className="container">
        <Header sport={state.sport} />

        <InputSection
          sport={state.sport}
          courts={state.courts}
          teamSize={state.teamSize}
          durationMinutes={state.durationMinutes}
          format={state.format}
          pointsPerMatch={state.pointsPerMatch}
          onSportChange={(sport) =>
            dispatch({ type: "SET_SPORT", payload: sport })
          }
          onCourtsChange={(courts) =>
            dispatch({ type: "SET_COURTS", payload: courts })
          }
          onTeamSizeChange={(size) =>
            dispatch({ type: "SET_TEAM_SIZE", payload: size })
          }
          onDurationChange={(duration) =>
            dispatch({ type: "SET_DURATION", payload: duration })
          }
          onFormatChange={(format) =>
            dispatch({ type: "SET_FORMAT", payload: format })
          }
          onPointsPerMatchChange={(p) =>
            dispatch({ type: "SET_POINTS_PER_MATCH", payload: p })
          }
          onGenerate={handleGenerate}
          disabled={state.isGenerated}
        />

        {state.isGenerated && (
          <>
            <Schedule
              matches={state.matches}
              courts={state.courts}
              onScoreUpdate={handleScoreUpdate}
              onAddMatch={handleAddMatch}
            />

            <Leaderboard
              entries={leaderboard}
              onGenerateMatch={handleGenerateMatch}
              format={state.format}
            />

            {allTimeLeaderboard.length > 0 && (
              <Leaderboard
                entries={allTimeLeaderboard}
                onGenerateMatch={() => {}}
                title="All-Time Leaderboard"
                isAllTime
              />
            )}

            <div className="action-bar">
              <Button variant="primary" onClick={handlePrint}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print Schedule
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowNewTeamsModal(true)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                New Teams
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowResetModal(true)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Reset Scores
              </Button>
              <Button
                variant="danger"
                onClick={() => setShowRestartModal(true)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Restart
              </Button>
            </div>
          </>
        )}

        <footer className="app-footer">
          <p>Sunday Padel Skor</p>
        </footer>
      </div>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Scores?"
        onConfirm={handleReset}
        confirmText="Reset"
        variant="danger"
      >
        <p>
          This will clear all match scores but keep the current team
          assignments. Are you sure?
        </p>
      </Modal>

      <Modal
        isOpen={showRestartModal}
        onClose={() => setShowRestartModal(false)}
        title="Restart Game?"
        onConfirm={handleRestart}
        confirmText="Restart"
        variant="danger"
      >
        <p>
          This will clear all matches and scores, but keep your participants.
          You can enter new participants and generate new teams.
        </p>
      </Modal>

      <Modal
        isOpen={showNewTeamsModal}
        onClose={() => setShowNewTeamsModal(false)}
        title="Generate New Teams?"
        onConfirm={handleNewTeams}
        confirmText="Generate"
        variant="danger"
      >
        <p>
          This will create new random team assignments and clear all scores.
          Continue?
        </p>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <button
        className="hidden-clear-btn"
        onClick={handleClearHistory}
        type="button"
      >
        Clear All History
      </button>
    </div>
  );
}

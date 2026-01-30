'use client';

import { Round } from '@/types/bracket';
import { MatchupCard } from './MatchupCard';

interface BracketRoundProps {
  round: Round;
  selections: Record<string, string>; // matchupId -> contestantId
  onSelectWinner: (matchupId: string, contestantId: string) => void;
  isVotingEnabled: boolean;
  eliminatedContestants?: Set<string>; // IDs of contestants eliminated in previous rounds
}

export function BracketRound({
  round,
  selections,
  onSelectWinner,
  isVotingEnabled,
  eliminatedContestants = new Set(),
}: BracketRoundProps) {
  const isDisabled = !isVotingEnabled || !round.isActive;
  const allMatchupsHaveContestants = round.matchups.every(
    (m) => m.contestant1 && m.contestant2
  );

  return (
    <section
      aria-labelledby={`round-${round.roundNumber}-heading`}
      className="mb-8"
    >
      <header className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h2
            id={`round-${round.roundNumber}-heading`}
            className="text-2xl font-bold text-text"
          >
            {round.name}
          </h2>
          <RoundStatusBadge round={round} />
        </div>
        {round.startDate && (
          <p className="text-sm text-text/60 mt-1">
            {formatDateRange(round.startDate, round.endDate)}
          </p>
        )}
      </header>

      {!allMatchupsHaveContestants && !round.isActive && (
        <div
          className="bg-surface border border-border rounded-xl p-6 text-center"
          role="status"
        >
          <p className="text-text/70">
            Matchups will be revealed after the previous round is complete.
          </p>
        </div>
      )}

      <div
        className="grid gap-6 md:grid-cols-2"
        role="list"
        aria-label={`${round.name} matchups`}
      >
        {round.matchups.map((matchup, index) => (
          <div
            key={matchup.id}
            role="listitem"
            className={`animate-fade-in stagger-${index + 1}`}
            style={{ opacity: 0 }}
          >
            <MatchupCard
              matchup={matchup}
              selectedWinner={selections[matchup.id] || null}
              onSelectWinner={onSelectWinner}
              isDisabled={isDisabled}
              showResult={round.isComplete}
              eliminatedContestants={eliminatedContestants}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function RoundStatusBadge({ round }: { round: Round }) {
  if (round.isComplete) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-success/20 text-success rounded-full">
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Complete
      </span>
    );
  }

  if (round.isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-primary/20 text-primary-dark rounded-full animate-pulse">
        <span className="w-2 h-2 bg-primary rounded-full" aria-hidden="true" />
        Voting Open
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-surface text-text/60 rounded-full">
      Upcoming
    </span>
  );
}

function formatDateRange(startDate: string, endDate?: string): string {
  const start = new Date(startDate);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC', // Force UTC interpretation to match admin input
  };

  if (!endDate || startDate === endDate) {
    return start.toLocaleDateString('en-US', options);
  }

  const end = new Date(endDate);
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

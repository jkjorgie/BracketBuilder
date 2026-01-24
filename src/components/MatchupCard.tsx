'use client';

import { useState } from 'react';
import { Contestant, Matchup } from '@/types/bracket';

interface MatchupCardProps {
  matchup: Matchup;
  selectedWinner: string | null;
  onSelectWinner: (matchupId: string, contestantId: string) => void;
  isDisabled?: boolean;
  showResult?: boolean;
  eliminatedContestants?: Set<string>; // IDs of contestants eliminated in previous rounds
}

export function MatchupCard({
  matchup,
  selectedWinner,
  onSelectWinner,
  isDisabled = false,
  showResult = false,
  eliminatedContestants = new Set(),
}: MatchupCardProps) {
  const { contestant1, contestant2 } = matchup;
  const [expanded1, setExpanded1] = useState(false);
  const [expanded2, setExpanded2] = useState(false);

  // If contestants are not yet determined (future rounds)
  if (!contestant1 || !contestant2) {
    return (
      <div
        className="matchup-card bg-surface border-2 border-dashed border-border rounded-xl p-4 opacity-60"
        aria-label="Matchup to be determined"
      >
        <div className="text-center text-text/60 py-8">
          <p className="font-medium">To Be Determined</p>
          <p className="text-sm mt-1">Winners from previous round</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="matchup-card bg-white border-2 border-border rounded-xl overflow-hidden shadow-sm"
      role="group"
      aria-labelledby={`matchup-${matchup.id}-label`}
    >
      <div id={`matchup-${matchup.id}-label`} className="sr-only">
        Matchup: {contestant1.name} versus {contestant2.name}
      </div>

      <fieldset disabled={isDisabled}>
        <legend className="sr-only">
          Select the winner between {contestant1.name} and {contestant2.name}
        </legend>

        <ContestantOption
          contestant={contestant1}
          matchupId={matchup.id}
          isSelected={selectedWinner === contestant1.id}
          onSelect={() => onSelectWinner(matchup.id, contestant1.id)}
          isDisabled={isDisabled}
          isWinner={showResult && matchup.winner?.id === contestant1.id}
          isEliminated={eliminatedContestants.has(contestant1.id)}
          position="top"
          isExpanded={expanded1}
          onToggleExpand={setExpanded1}
        />
      </fieldset>

      {/* Read More Button for contestant1 - outside fieldset so it always works */}
      <ReadMoreButton
        matchupId={matchup.id}
        contestantId={contestant1.id}
        isExpanded={expanded1}
        onToggle={() => setExpanded1(!expanded1)}
        isEliminated={eliminatedContestants.has(contestant1.id)}
        needsExpansion={!!(contestant1.description && contestant1.description.length > 100)}
        position="top"
      />

      <div className="flex items-center justify-center py-2 bg-surface">
        <span
          className="text-sm font-bold text-text/60 uppercase tracking-wider"
          aria-hidden="true"
        >
          VS
        </span>
      </div>

      <fieldset disabled={isDisabled}>
        <ContestantOption
          contestant={contestant2}
          matchupId={matchup.id}
          isSelected={selectedWinner === contestant2.id}
          onSelect={() => onSelectWinner(matchup.id, contestant2.id)}
          isDisabled={isDisabled}
          isWinner={showResult && matchup.winner?.id === contestant2.id}
          isEliminated={eliminatedContestants.has(contestant2.id)}
          position="bottom"
          isExpanded={expanded2}
          onToggleExpand={setExpanded2}
        />
      </fieldset>

      {/* Read More Button for contestant2 - outside fieldset so it always works */}
      <ReadMoreButton
        matchupId={matchup.id}
        contestantId={contestant2.id}
        isExpanded={expanded2}
        onToggle={() => setExpanded2(!expanded2)}
        isEliminated={eliminatedContestants.has(contestant2.id)}
        needsExpansion={!!(contestant2.description && contestant2.description.length > 100)}
        position="bottom"
      />
    </div>
  );
}

interface ContestantOptionProps {
  contestant: Contestant;
  matchupId: string;
  isSelected: boolean;
  onSelect: () => void;
  isDisabled: boolean;
  isWinner: boolean;
  isEliminated: boolean;
  position: 'top' | 'bottom';
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
}

function ContestantOption({
  contestant,
  matchupId,
  isSelected,
  onSelect,
  isDisabled,
  isWinner,
  isEliminated,
  position,
  isExpanded,
  onToggleExpand,
}: ContestantOptionProps) {
  const inputId = `${matchupId}-${contestant.id}`;

  // Check if description is long enough to need expansion (rough estimate: > 100 chars)
  const needsExpansion = contestant.description && contestant.description.length > 100;

  return (
    <div
      className={`
        contestant-option relative p-4
        ${isSelected && !isEliminated ? 'selected bg-primary/10' : ''}
        ${isWinner ? 'bg-success/10' : ''}
        ${isEliminated ? 'bg-error/5' : ''}
        ${position === 'top' ? 'rounded-t-lg' : 'rounded-b-lg'}
        ${!isDisabled && !isEliminated ? 'cursor-pointer hover:bg-secondary/5' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <label
          htmlFor={inputId}
          className={`flex items-start gap-3 flex-1 ${!isDisabled && !isEliminated ? 'cursor-pointer' : ''}`}
        >
          <input
            type="radio"
            id={inputId}
            name={`matchup-${matchupId}`}
            value={contestant.id}
            checked={isSelected}
            onChange={onSelect}
            disabled={isDisabled || isEliminated}
            className="mt-1 w-5 h-5 accent-primary focus:ring-2 focus:ring-focus focus:ring-offset-2"
            aria-describedby={`${inputId}-description`}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className={`font-semibold text-lg ${
                  isEliminated 
                    ? 'text-text/40 line-through decoration-error decoration-2' 
                    : 'text-text'
                }`}
              >
                {contestant.name}
              </span>
              {contestant.seed && (
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
                    isEliminated 
                      ? 'bg-text/20 text-text/40' 
                      : 'bg-secondary text-white'
                  }`}
                  aria-label={`Seed ${contestant.seed}`}
                >
                  {contestant.seed}
                </span>
              )}
              {isWinner && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/20 px-2 py-0.5 rounded-full">
                  <svg
                    className="w-3 h-3"
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
                  Winner
                </span>
              )}
              {isEliminated && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-error bg-error/20 px-2 py-0.5 rounded-full">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Eliminated
                </span>
              )}
            </div>
          </div>
        </label>

        {isSelected && !isDisabled && !isEliminated && (
          <div
            className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4 text-text"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Description - moved outside label */}
      <div className="ml-11 mt-1">
        <p
          id={`${inputId}-description`}
          className={`text-sm ${
            isExpanded ? '' : 'line-clamp-2'
          } ${
            isEliminated ? 'text-text/40' : 'text-text/70'
          }`}
        >
          {contestant.description}
        </p>
      </div>
    </div>
  );
}

// Read More Button Component - separate to render outside fieldset
function ReadMoreButton({
  matchupId,
  contestantId,
  isExpanded,
  onToggle,
  isEliminated,
  needsExpansion,
  position,
}: {
  matchupId: string;
  contestantId: string;
  isExpanded: boolean;
  onToggle: () => void;
  isEliminated: boolean;
  needsExpansion: boolean;
  position: 'top' | 'bottom';
}) {
  const inputId = `${matchupId}-${contestantId}`;
  
  if (!needsExpansion) {
    return null;
  }

  return (
    <div className={`px-4 ${position === 'top' ? 'pb-2' : 'pt-2'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`ml-11 text-xs font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-focus rounded ${
          isEliminated ? 'text-text/40' : 'text-secondary'
        }`}
        aria-expanded={isExpanded}
        aria-controls={`${inputId}-description`}
      >
        {isExpanded ? 'Show less' : 'Read more...'}
      </button>
    </div>
  );
}

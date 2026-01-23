'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BracketRound, SubmissionForm, SuccessModal } from '@/components';
import { mockBracket } from '@/data/mockBracket';
import { Bracket } from '@/types/bracket';
import {
  getUserProfile,
  saveUserProfile,
  getCurrentSelections,
  saveCurrentSelections,
  getSubmission,
  saveSubmission,
  hasSubmittedForSource,
  StoredBracketSubmission,
} from '@/lib/storage';

function VotePageContent() {
  const searchParams = useSearchParams();
  const source = searchParams.get('source') || 'direct';

  const [bracket] = useState<Bracket>(mockBracket);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [eliminatedContestants, setEliminatedContestants] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Get the active round
  const activeRound = bracket.rounds.find((r) => r.isActive);
  const activeMatchups = activeRound?.matchups || [];
  const totalMatchups = activeMatchups.filter(
    (m) => m.contestant1 && m.contestant2
  ).length;
  const selectedCount = Object.keys(selections).length;
  const isComplete = selectedCount === totalMatchups && totalMatchups > 0;

  // Calculate eliminated contestants from previous rounds
  const calculateEliminatedContestants = useCallback((): Set<string> => {
    const eliminated = new Set<string>();
    
    // Go through all completed rounds and find losers
    for (const round of bracket.rounds) {
      if (round.isComplete) {
        for (const matchup of round.matchups) {
          if (matchup.winner && matchup.contestant1 && matchup.contestant2) {
            // The loser is the one who isn't the winner
            const loserId = matchup.winner.id === matchup.contestant1.id 
              ? matchup.contestant2.id 
              : matchup.contestant1.id;
            eliminated.add(loserId);
          }
        }
      }
    }
    
    return eliminated;
  }, [bracket.rounds]);

  // Load user data and check submission status on mount
  useEffect(() => {
    // Calculate eliminated contestants
    setEliminatedContestants(calculateEliminatedContestants());

    // Load user profile
    const profile = getUserProfile();
    if (profile) {
      setUserName(profile.name);
      setUserEmail(profile.email);
    }

    // Check if already submitted for this source
    const existingSubmission = getSubmission(bracket.id, bracket.currentRound, source);
    if (existingSubmission) {
      setHasSubmitted(true);
      setSelections(existingSubmission.selections);
      setUserName(existingSubmission.name);
      setUserEmail(existingSubmission.email);
    } else {
      // Try to load previous selections for quick resubmit
      const savedSelections = getCurrentSelections(bracket.id, bracket.currentRound);
      if (savedSelections) {
        setSelections(savedSelections);
      }
    }

    setIsLoaded(true);
  }, [bracket.id, bracket.currentRound, source, calculateEliminatedContestants]);

  const handleSelectWinner = (matchupId: string, contestantId: string) => {
    if (hasSubmitted) return;
    
    const newSelections = {
      ...selections,
      [matchupId]: contestantId,
    };
    
    setSelections(newSelections);
    
    // Save selections as user makes them (for persistence across sources)
    saveCurrentSelections(bracket.id, bracket.currentRound, newSelections);
  };

  const handleSubmit = async (email: string, name: string) => {
    if (!isComplete || isSubmitting || hasSubmitted) return;

    // Double-check they haven't already submitted for this source
    if (hasSubmittedForSource(bracket.id, bracket.currentRound, source)) {
      setHasSubmitted(true);
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Save user profile for future use
    saveUserProfile({ name, email });

    // Save the submission
    const submission: StoredBracketSubmission = {
      bracketId: bracket.id,
      roundNumber: bracket.currentRound,
      selections,
      source,
      name,
      email,
      submittedAt: new Date().toISOString(),
    };
    saveSubmission(submission);

    // Also save as current selections (for quick resubmit on other sources)
    saveCurrentSelections(bracket.id, bracket.currentRound, selections);

    setUserName(name);
    setUserEmail(email);
    setIsSubmitting(false);
    setHasSubmitted(true);
    setShowSuccess(true);
  };

  // Don't render until we've loaded from localStorage
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!activeRound) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-surface rounded-full mb-4">
          <svg
            className="w-8 h-8 text-text/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-text mb-2">
          No Active Voting Round
        </h2>
        <p className="text-text/70 max-w-md mx-auto">
          There&apos;s no active voting round at the moment. Check back later or view
          the current results.
        </p>
        <a href="/results" className="btn btn-primary mt-6 inline-flex">
          View Results
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Source indicator */}
      {source !== 'direct' && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4 mb-8">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-secondary"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-text">
              Voting via:{' '}
              <span className="text-secondary font-bold">{source}</span>
            </span>
          </div>
        </div>
      )}

      {/* Already submitted message */}
      {hasSubmitted && !showSuccess && (
        <div
          className="bg-success/10 border border-success/30 rounded-lg p-4 mb-8"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-success flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium text-text">
                You&apos;ve already submitted your bracket for this link!
              </p>
              <p className="text-sm text-text/70 mt-1">
                Your selections are shown below. Come back tomorrow to vote in
                the next round.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pre-filled selections notice */}
      {!hasSubmitted && Object.keys(selections).length > 0 && (
        <div
          className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-8"
          role="status"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium text-text">
                Your previous selections have been loaded
              </p>
              <p className="text-sm text-text/70 mt-1">
                Review your picks and submit to record your vote for this link.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bracket info */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-text mb-2">
          {bracket.name}
        </h1>
        <p className="text-lg text-text/70">{bracket.description}</p>
      </div>

      {/* Voting grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <BracketRound
            round={activeRound}
            selections={selections}
            onSelectWinner={handleSelectWinner}
            isVotingEnabled={!hasSubmitted}
            eliminatedContestants={eliminatedContestants}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <SubmissionForm
              isComplete={isComplete}
              totalMatchups={totalMatchups}
              selectedCount={selectedCount}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              hasAlreadySubmitted={hasSubmitted}
              initialName={userName}
              initialEmail={userEmail}
            />

            {hasSubmitted && (
              <p className="text-sm text-text/60 text-center mt-4">
                Submitted as <strong>{userName}</strong> for source: <strong>{source}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Success modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        roundName={activeRound.name}
      />
    </>
  );
}

export default function VotePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <VotePageContent />
    </Suspense>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Contestant } from '@/types/bracket';

interface MatchupData {
  id: string;
  matchupIndex: number;
  contestant1: Contestant | null;
  contestant2: Contestant | null;
  winner: { id: string; name: string } | null;
  competitor1Votes: number;
  competitor2Votes: number;
}

interface RoundData {
  roundNumber: number;
  name: string;
  isActive: boolean;
  isComplete: boolean;
  matchups: MatchupData[];
}

interface ResultsData {
  campaign: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    currentRound: number;
    isDemo: boolean;
  };
  siteConfig: {
    siteName: string;
    eventName: string;
  } | null;
  rounds: RoundData[];
  statistics: {
    totalVotes: number;
    uniqueVoters: number;
    totalCompetitors: number;
    votesBySource: { source: string; count: number }[];
  };
  eliminatedCompetitorIds: string[];
  champion: Contestant | null;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export default function ResultsPage() {
  const [data, setData] = useState<ResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        
        // Fetch results and session in parallel
        const [resultsResponse, sessionResponse] = await Promise.all([
          fetch('/api/results'),
          fetch('/api/auth/session'),
        ]);

        // Check admin status
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setIsAdmin(sessionData.authenticated && sessionData.user?.role === 'admin');
        }

        // Process results
        if (!resultsResponse.ok) {
          if (resultsResponse.status === 404) {
            setError('No campaign found');
          } else {
            setError('Failed to load results');
          }
          return;
        }
        const result = await resultsResponse.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Failed to load results');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-text mb-2">
          {error || 'No Results Available'}
        </h2>
        <p className="text-text/70 max-w-md mx-auto">
          There are no results to display at the moment.
        </p>
        <a href="/vote" className="btn btn-primary mt-6 inline-flex">
          Go Vote
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-text mb-2">
          {data.campaign.name} - Results
        </h1>
        <p className="text-lg text-text/70">
          Track the progress of the competition and see which features are
          advancing.
        </p>
      </div>

      {/* Champion display (when complete) */}
      {data.champion && (
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            <span className="text-4xl" aria-hidden="true">
              🏆
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Champion</h2>
          <p className="text-3xl font-bold text-white">
            {data.champion.name}
          </p>
          <p className="text-white/80 mt-2 max-w-md mx-auto">
            {data.champion.description}
          </p>
        </div>
      )}

      {/* Bracket visualization */}
      <div className="bg-white border-2 border-border rounded-xl p-6 overflow-x-auto">
        <h2 className="text-xl font-bold text-text mb-6">Bracket Overview</h2>

        {/* Desktop bracket view */}
        <div className="hidden md:block">
          <BracketVisualization data={data} />
        </div>

        {/* Mobile list view */}
        <div className="md:hidden space-y-6">
          {data.rounds.map((round) => (
            <div key={round.roundNumber}>
              <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                {round.name}
                {round.isActive && (
                  <span className="text-xs bg-primary/20 text-primary-dark px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
                {round.isComplete && (
                  <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                    Complete
                  </span>
                )}
              </h3>
              <div className="space-y-3">
                {round.matchups.map((matchup) => (
                  <div
                    key={matchup.id}
                    className="bg-surface rounded-lg p-4 border border-border"
                  >
                    <MobileMatchup
                      contestant1={matchup.contestant1}
                      contestant2={matchup.contestant2}
                      winner={matchup.winner}
                      competitor1Votes={matchup.competitor1Votes}
                      competitor2Votes={matchup.competitor2Votes}
                      showVotes={round.isComplete || round.isActive}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voting statistics */}
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Votes"
          value={data.statistics.totalVotes.toString()}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
        />
        <StatCard
          label="Current Round"
          value={data.rounds.find((r) => r.isActive)?.name || 'Complete'}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          }
        />
        <StatCard
          label="Unique Voters"
          value={data.statistics.uniqueVoters.toString()}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
      </div>

      {/* Votes by source - Admin only */}
      {isAdmin && data.statistics.votesBySource.length > 0 && (
        <div className="mt-8 bg-white border-2 border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
            Votes by Source
            <span className="text-xs bg-primary/20 text-primary-dark px-2 py-0.5 rounded-full">
              Admin Only
            </span>
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.statistics.votesBySource.map((item) => (
              <div
                key={item.source}
                className="bg-surface rounded-lg p-3 border border-border"
              >
                <p className="text-sm text-text/60">{item.source}</p>
                <p className="text-lg font-bold text-text">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BracketVisualization({ data }: { data: ResultsData }) {
  return (
    <div
      className="flex items-center justify-center gap-8 min-w-max"
      role="img"
      aria-label="Tournament bracket visualization"
    >
      {data.rounds.map((round, roundIndex) => (
        <div
          key={round.roundNumber}
          className="flex flex-col justify-around"
          style={{
            gap: `${Math.pow(2, roundIndex) * 2}rem`,
          }}
        >
          <div className="text-center mb-4">
            <span className="text-sm font-semibold text-text/60 uppercase tracking-wider">
              {round.name}
            </span>
          </div>
          {round.matchups.map((matchup) => (
            <div
              key={matchup.id}
              className="flex flex-col gap-1 relative"
            >
              <ContestantSlot
                contestant={matchup.contestant1}
                isWinner={matchup.winner?.id === matchup.contestant1?.id}
                votes={matchup.competitor1Votes}
                showVotes={round.isComplete || round.isActive}
              />
              <ContestantSlot
                contestant={matchup.contestant2}
                isWinner={matchup.winner?.id === matchup.contestant2?.id}
                votes={matchup.competitor2Votes}
                showVotes={round.isComplete || round.isActive}
              />
              {/* Connector line */}
              {roundIndex < data.rounds.length - 1 && (
                <div
                  className="absolute right-0 top-1/2 w-8 h-px bg-border -translate-y-1/2 translate-x-full"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Champion slot */}
      <div className="flex flex-col items-center">
        <span className="text-sm font-semibold text-text/60 uppercase tracking-wider mb-4">
          Champion
        </span>
        <div
          className={`
            w-48 p-4 rounded-lg border-2 text-center
            ${
              data.champion
                ? 'bg-gradient-to-r from-primary/20 to-secondary/20 border-primary'
                : 'bg-surface border-dashed border-border'
            }
          `}
        >
          {data.champion ? (
            <>
              <span className="text-2xl mb-2 block" aria-hidden="true">
                🏆
              </span>
              <span className="font-bold text-text">
                {data.champion.name}
              </span>
            </>
          ) : (
            <span className="text-text/50">TBD</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ContestantSlot({
  contestant,
  isWinner,
  votes,
  showVotes,
}: {
  contestant: Contestant | null;
  isWinner: boolean;
  votes: number;
  showVotes: boolean;
}) {
  return (
    <div
      className={`
        w-48 px-3 py-2 rounded border-2 transition-colors
        ${
          isWinner
            ? 'bg-success/10 border-success'
            : contestant
            ? 'bg-white border-border'
            : 'bg-surface border-dashed border-border'
        }
      `}
    >
      {contestant ? (
        <div className="flex items-center gap-2">
          {contestant.seed && (
            <span className="text-xs font-bold text-secondary">
              {contestant.seed}
            </span>
          )}
          <span
            className={`text-sm truncate flex-1 ${isWinner ? 'font-bold text-success' : 'text-text'}`}
          >
            {contestant.name}
          </span>
          {showVotes && (
            <span className="text-xs text-text/60 font-medium">
              {votes}
            </span>
          )}
          {isWinner && (
            <svg
              className="w-4 h-4 text-success flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-label="Winner"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      ) : (
        <span className="text-sm text-text/50">TBD</span>
      )}
    </div>
  );
}

function MobileMatchup({
  contestant1,
  contestant2,
  winner,
  competitor1Votes,
  competitor2Votes,
  showVotes,
}: {
  contestant1: Contestant | null;
  contestant2: Contestant | null;
  winner: { id: string; name: string } | null;
  competitor1Votes: number;
  competitor2Votes: number;
  showVotes: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <MobileContestant
          contestant={contestant1}
          isWinner={winner?.id === contestant1?.id}
        />
        {showVotes && (
          <span className="text-sm font-medium text-text/60">
            {competitor1Votes}
          </span>
        )}
      </div>
      <div className="text-center text-xs font-bold text-text/40">VS</div>
      <div className="flex items-center justify-between gap-3">
        <MobileContestant
          contestant={contestant2}
          isWinner={winner?.id === contestant2?.id}
        />
        {showVotes && (
          <span className="text-sm font-medium text-text/60">
            {competitor2Votes}
          </span>
        )}
      </div>
    </div>
  );
}

function MobileContestant({
  contestant,
  isWinner,
}: {
  contestant: Contestant | null;
  isWinner: boolean;
}) {
  if (!contestant) {
    return <span className="text-sm text-text/50">TBD</span>;
  }

  return (
    <div
      className={`flex items-center gap-2 ${isWinner ? 'text-success font-semibold' : ''}`}
    >
      {contestant.seed && (
        <span className="text-xs font-bold text-secondary">
          {contestant.seed}
        </span>
      )}
      <span className="text-sm truncate">{contestant.name}</span>
      {isWinner && (
        <svg
          className="w-4 h-4 text-success flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-label="Winner"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border-2 border-border rounded-xl p-4 flex items-center gap-4">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm text-text/60">{label}</p>
        <p className="text-xl font-bold text-text">{value}</p>
      </div>
    </div>
  );
}

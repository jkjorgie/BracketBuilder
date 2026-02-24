'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { storeVotingSource } from '@/lib/votingSource';

interface Contestant {
  id: string;
  name: string;
  description: string;
  seed: number | null;
}

interface Matchup {
  id: string;
  contestant1: Contestant | null;
  contestant2: Contestant | null;
}

interface Round {
  roundNumber: number;
  name: string;
  isActive: boolean;
  isComplete: boolean;
  startDate?: string;
  matchups: Matchup[];
}

interface CampaignData {
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
    description: string | null;
  } | null;
  rounds: Round[];
}

export default function CampaignHomePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignSlug = params.campaignSlug as string;

  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Capture and store voting source if present in URL
  useEffect(() => {
    const source = searchParams.get('source');
    if (source) {
      storeVotingSource(source);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchCampaign() {
      try {
        const response = await fetch(`/api/campaigns/${campaignSlug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setNotFound(true);
          }
          return;
        }
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching campaign:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchCampaign();
  }, [campaignSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text/60">Loading tournament...</p>
        </div>
      </div>
    );
  }

  // Redirect to root if campaign not found
  if (notFound || !data) {
    router.push('/');
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text/60">Redirecting...</p>
        </div>
      </div>
    );
  }

  const activeRound = data.rounds.find((r) => r.isActive);
  const contestantCount = data.rounds[0]?.matchups.length ? data.rounds[0].matchups.length * 2 : 0;
  const campaignName = data.campaign.name;
  const campaignDescription = data.campaign.description || data.siteConfig?.description || 
    'Help us decide which feature to build next!';

  return (
    <div className="space-y-12">
      {/* Hero Section - March Madness Theme */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-light to-secondary p-8 md:p-12 lg:p-16">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-text font-semibold px-4 py-2 rounded-full text-sm mb-6">
            {activeRound ? `${activeRound.name} - Voting Open!` : 'Tournament Active'}
          </span>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text mb-4 leading-tight">
            {campaignName}
          </h1>

          <p className="text-lg md:text-xl text-text mb-8 max-w-2xl bg-white/40 backdrop-blur-sm rounded-lg px-4 py-3">
            {campaignDescription}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href={`/${campaignSlug}/vote`}
              className="btn btn-secondary text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-shadow"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              Vote for Your Favorites
            </Link>
            <Link
              href={`/${campaignSlug}/results`}
              className="btn bg-white/90 text-text hover:bg-white text-lg px-8 py-4"
            >
              View Results
            </Link>
          </div>
        </div>

        {/* Bracket decorative element */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 opacity-20 hidden lg:block"
          aria-hidden="true"
        >
          <svg
            width="300"
            height="400"
            viewBox="0 0 300 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="10" y="20" width="80" height="40" rx="8" fill="currentColor" />
            <rect x="10" y="80" width="80" height="40" rx="8" fill="currentColor" />
            <rect x="10" y="160" width="80" height="40" rx="8" fill="currentColor" />
            <rect x="10" y="220" width="80" height="40" rx="8" fill="currentColor" />
            <rect x="10" y="300" width="80" height="40" rx="8" fill="currentColor" />
            <rect x="10" y="360" width="80" height="40" rx="8" fill="currentColor" />
            <rect x="120" y="50" width="80" height="40" rx="8" fill="currentColor" />
            <rect x="120" y="190" width="80" height="40" rx="8" fill="currentColor" />
            <rect x="120" y="330" width="80" height="40" rx="8" fill="currentColor" />
            <rect x="230" y="120" width="80" height="40" rx="8" fill="currentColor" />
            <rect x="230" y="260" width="80" height="40" rx="8" fill="currentColor" />
            <path d="M90 40H110V70H120" stroke="currentColor" strokeWidth="3" />
            <path d="M90 100H110V70H120" stroke="currentColor" strokeWidth="3" />
            <path d="M90 180H110V210H120" stroke="currentColor" strokeWidth="3" />
            <path d="M90 240H110V210H120" stroke="currentColor" strokeWidth="3" />
            <path d="M200 70H220V140H230" stroke="currentColor" strokeWidth="3" />
            <path d="M200 210H220V140H230" stroke="currentColor" strokeWidth="3" />
          </svg>
        </div>
      </section>

      {/* How It Works - March Madness Style */}
      <section aria-labelledby="how-it-works-heading">
        <h2
          id="how-it-works-heading"
          className="text-2xl md:text-3xl font-bold text-text mb-2 text-center"
        >
          How the Tournament Works
        </h2>
        <p className="text-text/80 text-center mb-8 max-w-2xl mx-auto">
          Vote for your favorite features each round! The winning feature will be built by GT — your votes decide what gets developed!
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <StepCard
            number={1}
            title="Get Your Game Day Pass"
            description="Visit our booth each day for a vote, plus earn bonus votes at every GT session. More appearances = more influence on the next feature GT will build!"
            icon={
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                />
              </svg>
            }
          />
          <StepCard
            number={2}
            title="Vote for Your Favorites"
            description="Review each matchup and vote for the features you want GT to build! Each vote helps your favorite advance to the next round."
            icon={
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StepCard
            number={3}
            title="Keep Voting Each Round"
            description="Come to the booth each day and to as many GT sessions as you can to cast additional votes! Your continued support helps your favorite features advance all the way to becoming GT's next development project."
            icon={
              <svg
                className="w-8 h-8"
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
        </div>
      </section>

      {/* Current Contestants - sorted by seed ascending */}
      {data && data.rounds[0] && (
        <section aria-labelledby="contestants-heading">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h2
                id="contestants-heading"
                className="text-2xl md:text-3xl font-bold text-text"
              >
                The Tournament Field
              </h2>
              <p className="text-text/80 mt-1">Which feature should GT build next? Vote for your favorites!</p>
            </div>
            <span className="text-sm font-medium text-text/80 bg-surface px-3 py-1 rounded-full whitespace-nowrap">
              {contestantCount} Competitors
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.rounds[0].matchups.flatMap((matchup) => [
              matchup.contestant1,
              matchup.contestant2,
            ]).filter(Boolean)
              .sort((a, b) => (a!.seed ?? 999) - (b!.seed ?? 999))
              .map((contestant, index) => (
              <div
                key={contestant!.id}
                className="bg-white border-2 border-border rounded-xl p-5 hover:border-primary transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 text-sm font-bold bg-secondary text-text rounded-full flex-shrink-0">
                    #{contestant!.seed}
                  </span>
                  <div>
                    <h3 className="font-semibold text-text">{contestant!.name}</h3>
                    <p className="text-sm text-text/70 mt-1">
                      {contestant!.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Schedule - Tournament Bracket Style */}
      {data && (
        <section
          aria-labelledby="schedule-heading"
          className="bg-surface rounded-2xl p-8"
        >
          <h2
            id="schedule-heading"
            className="text-2xl md:text-3xl font-bold text-text mb-2"
          >
            Tournament Schedule
          </h2>
          <p className="text-text/80 mb-6">One round per day — don&apos;t miss your window to vote!</p>

          <div className="space-y-4">
            {data.rounds.map((round) => (
              <div
                key={round.roundNumber}
                className={`flex flex-wrap sm:flex-nowrap items-center gap-4 p-4 rounded-xl transition-colors ${
                  round.isActive
                    ? 'bg-primary/20 border-2 border-primary'
                    : round.isComplete
                    ? 'bg-white border-2 border-success'
                    : 'bg-white border-2 border-border'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    round.isActive
                      ? 'bg-primary text-text'
                      : round.isComplete
                      ? 'bg-success-bg text-text'
                      : 'bg-border text-text/80'
                  }`}
                >
                  {round.isComplete ? (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="font-bold">{round.roundNumber}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text">{round.name}</h3>
                  <p className="text-sm text-text/80">
                    {round.matchups.length} matchup
                    {round.matchups.length !== 1 ? 's' : ''}
                    {round.startDate && ` • ${formatDate(round.startDate)}`}
                  </p>
                </div>

                {round.isActive && (
                  <Link
                    href={`/${campaignSlug}/vote`}
                    className="btn btn-primary text-sm flex-shrink-0 w-full sm:w-auto"
                  >
                    Vote Now
                  </Link>
                )}
                {round.isComplete && (
                  <span className="text-sm font-medium text-success flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                    <span>✓</span> Complete
                  </span>
                )}
                {!round.isActive && !round.isComplete && (
                  <span className="text-sm text-text/80 flex-shrink-0 whitespace-nowrap">Upcoming</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA Section - March Madness Theme */}
      <section className="text-center py-8">
        <div className="text-5xl mb-4" aria-hidden="true">🏆</div>
        <h2 className="text-2xl md:text-3xl font-bold text-text mb-4">
          Ready to Vote?
        </h2>
        <p className="text-text/70 mb-6 max-w-xl mx-auto">
          Your votes matter! Help GT decide which feature to build next by voting for your favorites. 
          The champion feature will become GT's next development project!
        </p>
        <Link
          href={`/${campaignSlug}/vote`}
          className="btn btn-primary text-lg px-8 py-4 inline-flex"
        >
          Cast Your Votes
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>
      </section>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  icon,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border-2 border-border rounded-xl p-6 text-center hover:border-secondary transition-colors">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary/10 text-secondary-text rounded-full mb-4">
        {icon}
      </div>
      <div className="inline-flex items-center justify-center w-8 h-8 bg-primary text-text font-bold rounded-full text-sm mb-3">
        {number}
        </div>
      <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
      <p className="text-text/70 text-sm">{description}</p>
    </div>
  );
}

function formatDate(dateString: string): string {
  // Parse date without timezone conversion to avoid date shifting
  // dateString is in ISO format from database (e.g., "2026-01-26T00:00:00.000Z")
  const date = new Date(dateString);
  
  // Use UTC methods to ensure consistent date display
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC', // Force UTC interpretation
  });
}

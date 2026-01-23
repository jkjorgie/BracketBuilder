'use client';

import Link from 'next/link';
import { mockBracket } from '@/data/mockBracket';

export default function HomePage() {
  const bracket = mockBracket;
  const activeRound = bracket.rounds.find((r) => r.isActive);
  const contestantCount = bracket.rounds[0].matchups.length * 2;

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-light to-secondary p-8 md:p-12 lg:p-16">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-text font-semibold px-4 py-2 rounded-full text-sm mb-6">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            {activeRound ? `${activeRound.name} - Voting Open` : 'Competition Active'}
          </span>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text mb-4 leading-tight">
            {bracket.name}
          </h1>

          <p className="text-lg md:text-xl text-text/80 mb-8 max-w-2xl">
            {bracket.description}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/vote"
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
              Vote Now
            </Link>
            <Link
              href="/results"
              className="btn bg-white/90 text-text hover:bg-white text-lg px-8 py-4"
            >
              View Results
            </Link>
          </div>
        </div>

        {/* Decorative bracket illustration */}
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

      {/* How It Works */}
      <section aria-labelledby="how-it-works-heading">
        <h2
          id="how-it-works-heading"
          className="text-2xl md:text-3xl font-bold text-text mb-8 text-center"
        >
          How It Works
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <StepCard
            number={1}
            title="Get Your Link"
            description="Visit our booth or attend a session to get your unique voting link for that day."
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
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            }
          />
          <StepCard
            number={2}
            title="Cast Your Votes"
            description="Select your winner for each matchup in the current round. Your voice matters!"
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
            title="Return Daily"
            description="Come back each day to vote on the next round until we crown a champion!"
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
          />
        </div>
      </section>

      {/* Current Contestants */}
      <section aria-labelledby="contestants-heading">
        <div className="flex items-center justify-between mb-8">
          <h2
            id="contestants-heading"
            className="text-2xl md:text-3xl font-bold text-text"
          >
            Alliance 2026 Contestants
          </h2>
          <span className="text-sm font-medium text-text/60 bg-surface px-3 py-1 rounded-full">
            {contestantCount} Features
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {bracket.rounds[0].matchups.flatMap((matchup) => [
            matchup.contestant1,
            matchup.contestant2,
          ]).filter(Boolean).map((contestant, index) => (
            <div
              key={contestant!.id}
              className="bg-white border-2 border-border rounded-xl p-5 hover:border-primary transition-colors animate-fade-in"
              style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 text-sm font-bold bg-secondary text-white rounded-full flex-shrink-0">
                  {contestant!.seed}
                </span>
                <div>
                  <h3 className="font-semibold text-text">{contestant!.name}</h3>
                  <p className="text-sm text-text/70 mt-1 line-clamp-2">
                    {contestant!.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Schedule */}
      <section
        aria-labelledby="schedule-heading"
        className="bg-surface rounded-2xl p-8"
      >
        <h2
          id="schedule-heading"
          className="text-2xl md:text-3xl font-bold text-text mb-6"
        >
          Voting Schedule
        </h2>

        <div className="space-y-4">
          {bracket.rounds.map((round) => (
            <div
              key={round.roundNumber}
              className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
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
                    ? 'bg-success text-white'
                    : 'bg-border text-text/50'
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

              <div className="flex-1">
                <h3 className="font-semibold text-text">{round.name}</h3>
                <p className="text-sm text-text/60">
                  {round.matchups.length} matchup
                  {round.matchups.length !== 1 ? 's' : ''}
                  {round.startDate && ` • ${formatDate(round.startDate)}`}
                </p>
              </div>

              {round.isActive && (
                <Link
                  href="/vote"
                  className="btn btn-primary text-sm"
                >
                  Vote Now
                </Link>
              )}
              {round.isComplete && (
                <span className="text-sm font-medium text-success">
                  Complete
                </span>
              )}
              {!round.isActive && !round.isComplete && (
                <span className="text-sm text-text/50">Upcoming</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-text mb-4">
          Ready to Make Your Voice Heard?
        </h2>
        <p className="text-text/70 mb-6 max-w-xl mx-auto">
          Your vote helps shape the future of our product. Don&apos;t miss your
          chance to influence what gets built next!
        </p>
        <Link
          href="/vote"
          className="btn btn-primary text-lg px-8 py-4 inline-flex"
        >
          Start Voting
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
      <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary/10 text-secondary rounded-full mb-4">
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
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

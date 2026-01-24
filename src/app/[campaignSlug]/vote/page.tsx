'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { BracketRound, SubmissionForm, SuccessModal } from '@/components';
import { Contestant, Round } from '@/types/bracket';
import {
  getUserProfile,
  saveUserProfile,
  getCurrentSelections,
  saveCurrentSelections,
  getSubmission,
  saveSubmission,
  StoredBracketSubmission,
} from '@/lib/storage';

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
  eliminatedCompetitorIds: string[];
  champion: Contestant | null;
}

function VotePageContent() {
  const params = useParams();
  const router = useRouter();
  const campaignSlug = params.campaignSlug as string;
  const searchParams = useSearchParams();
  const source = searchParams.get('source') || 'direct';

  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        if (data.authenticated && data.user) {
          setIsAdmin(true);
        }
      } catch (err) {
        // Not admin or not logged in
        setIsAdmin(false);
      }
    }
    checkAdmin();
  }, []);

  // Validate vote source - must belong to this campaign
  useEffect(() => {
    async function validateSource() {
      // Skip validation for 'direct' source
      if (source === 'direct') {
        return;
      }

      try {
        // Fetch sources for this specific campaign
        const response = await fetch(`/api/sources?campaignSlug=${campaignSlug}`);
        if (!response.ok) {
          console.error('Failed to fetch sources');
          return;
        }
        
        const sources = await response.json();
        const voteSource = sources.find((s: any) => s.code === source);
        
        if (!voteSource) {
          // Source doesn't exist for this campaign - redirect to base vote page
          console.log('Invalid source for this campaign, redirecting to vote page');
          window.location.href = `/${campaignSlug}/vote`;
          return;
        }
        
        if (!voteSource.isActive) {
          setSourceError('This voting link is not currently active. Please use a different link or contact an administrator.');
          return;
        }

        // Check validity period
        if (voteSource.validFrom || voteSource.validUntil) {
          const now = new Date();
          if (voteSource.validFrom && now < new Date(voteSource.validFrom)) {
            setSourceError('This voting link is not yet available. Please check back later.');
            return;
          }
          if (voteSource.validUntil && now > new Date(voteSource.validUntil)) {
            setSourceError('This voting link has expired. Please use a different link or contact an administrator.');
            return;
          }
        }
      } catch (err) {
        console.error('Error validating source:', err);
      }
    }
    
    validateSource();
  }, [source, campaignSlug]);

  // Fetch campaign data from API
  useEffect(() => {
    async function fetchCampaign() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/campaigns/${campaignSlug}`);
        if (!response.ok) {
          if (response.status === 404) {
            // Campaign not found - redirect to root
            router.push('/');
            return;
          } else {
            setError('Failed to load campaign');
          }
          return;
        }
        const data = await response.json();
        setCampaignData(data);
      } catch (err) {
        console.error('Error fetching campaign:', err);
        setError('Failed to load campaign');
      } finally {
        setIsLoading(false);
      }
    }
    fetchCampaign();
  }, [campaignSlug, router]);

  // Get the active round
  const activeRound = campaignData?.rounds.find((r) => r.isActive);
  const activeMatchups = activeRound?.matchups || [];
  const totalMatchups = activeMatchups.filter(
    (m) => m.contestant1 && m.contestant2
  ).length;
  const selectedCount = Object.keys(selections).length;
  const isComplete = selectedCount === totalMatchups && totalMatchups > 0;

  // Eliminated contestants from API response
  const eliminatedContestants = new Set(campaignData?.eliminatedCompetitorIds || []);

  // Load user data and check submission status on mount
  useEffect(() => {
    if (!campaignData) return;

    // Load user profile
    const profile = getUserProfile();
    if (profile) {
      setUserName(profile.name);
      setUserEmail(profile.email);
    }

    // Check if already submitted for this source (local storage check)
    const existingSubmission = getSubmission(
      campaignData.campaign.slug,
      campaignData.campaign.currentRound,
      source
    );
    if (existingSubmission) {
      setHasSubmitted(true);
      setSelections(existingSubmission.selections);
      setUserName(existingSubmission.name);
      setUserEmail(existingSubmission.email);
    } else {
      // Try to load previous selections for quick resubmit
      const savedSelections = getCurrentSelections(
        campaignData.campaign.slug,
        campaignData.campaign.currentRound
      );
      if (savedSelections) {
        setSelections(savedSelections);
      }
    }

    setIsLoaded(true);
  }, [campaignData, source]);

  const handleSelectWinner = (matchupId: string, contestantId: string) => {
    if (hasSubmitted || !campaignData) return;

    const newSelections = {
      ...selections,
      [matchupId]: contestantId,
    };

    setSelections(newSelections);

    // Save selections as user makes them (for persistence across sources)
    saveCurrentSelections(
      campaignData.campaign.slug,
      campaignData.campaign.currentRound,
      newSelections
    );
  };

  const handleSubmit = useCallback(async (email: string, name: string) => {
    if (!isComplete || isSubmitting || hasSubmitted || !campaignData) return;

    setIsSubmitting(true);

    try {
      // Submit to the API
      const response = await fetch('/api/vote/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignSlug: campaignData.campaign.slug,
          selections,
          voterName: name,
          voterEmail: email,
          source,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Already voted
          setHasSubmitted(true);
        } else if (result.invalidSource) {
          // Invalid source - redirect to base vote page
          alert('This voting link is invalid. You will be redirected to the main voting page.');
          window.location.href = `/${campaignSlug}/vote`;
          return;
        } else if (result.inactiveSource) {
          // Inactive source
          setSourceError(result.error || 'This voting link is not currently active.');
          return;
        } else {
          throw new Error(result.error || 'Failed to submit vote');
        }
        return;
      }

      // Save user profile for future use
      saveUserProfile({ name, email });

      // Save the submission to local storage
      const submission: StoredBracketSubmission = {
        bracketId: campaignData.campaign.slug,
        roundNumber: campaignData.campaign.currentRound,
        selections,
        source,
        name,
        email,
        submittedAt: new Date().toISOString(),
      };
      saveSubmission(submission);

      // Also save as current selections (for quick resubmit on other sources)
      saveCurrentSelections(
        campaignData.campaign.slug,
        campaignData.campaign.currentRound,
        selections
      );

      setUserName(name);
      setUserEmail(email);
      setHasSubmitted(true);
      setShowSuccess(true);
    } catch (err) {
      console.error('Error submitting vote:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  }, [campaignData, campaignSlug, hasSubmitted, isComplete, isSubmitting, selections, source]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Error state
  if (error || !campaignData) {
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
          {error || 'Campaign Not Found'}
        </h2>
        <p className="text-text/70 max-w-md mx-auto">
          There&apos;s an issue with this campaign. Please check your link or contact an administrator.
        </p>
        <a href="/" className="btn btn-primary mt-6 inline-flex">
          Go Home
        </a>
      </div>
    );
  }

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
        <a href={`/${campaignSlug}/results`} className="btn btn-primary mt-6 inline-flex">
          View Results
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Source indicator - only shown to admins */}
      {isAdmin && source !== 'direct' && (
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

      {/* Source error message */}
      {sourceError && (
        <div
          className="bg-error/10 border border-error/30 rounded-lg p-4 mb-8"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium text-text">Voting Link Issue</p>
              <p className="text-sm text-text/70 mt-1">{sourceError}</p>
              <a
                href={`/${campaignSlug}/vote`}
                className="text-sm text-error font-medium hover:underline mt-2 inline-block"
              >
                Try the main voting page →
              </a>
            </div>
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
          {campaignData.campaign.name}
        </h1>
        <p className="text-lg text-text/70">{campaignData.campaign.description}</p>
      </div>

      {/* Voting grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <BracketRound
            round={activeRound}
            selections={selections}
            onSelectWinner={handleSelectWinner}
            isVotingEnabled={!hasSubmitted && !sourceError}
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
              hasAlreadySubmitted={hasSubmitted || !!sourceError}
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
        campaignSlug={campaignSlug}
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

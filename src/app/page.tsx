'use client';

import Link from 'next/link';

export default function InvalidCampaignPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-lg px-4">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-surface rounded-full mb-6">
          <svg
            className="w-10 h-10 text-text/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-text mb-4">
          Invalid Campaign Link
        </h1>

        {/* Description */}
        <p className="text-lg text-text/70 mb-8">
          The link you used isn&apos;t valid or the campaign doesn&apos;t exist. 
          Please contact GT for a valid campaign link.
        </p>

        {/* Contact info */}
        <div className="bg-surface rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-text mb-3">
            Need Help?
          </h2>
          <p className="text-text/70 text-sm mb-4">
            If you believe you should have access to a campaign, please reach out to the GT team 
            or check that you&apos;ve entered the correct URL.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:support@gideontaylor.com"
              className="btn btn-primary"
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Contact Support
            </a>
          </div>
        </div>

        {/* Admin link */}
        <p className="text-sm text-text/50">
          Are you an administrator?{' '}
          <Link href="/admin" className="text-secondary hover:underline">
            Go to Admin Portal
          </Link>
        </p>
      </div>
    </div>
  );
}

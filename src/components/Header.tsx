'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();

  // Extract campaign slug from pathname (e.g., /eforms-2026/vote -> eforms-2026)
  const campaignMatch = pathname.match(/^\/([^\/]+)/);
  const campaignSlug = campaignMatch?.[1];
  
  // Check if we're on a campaign page (not admin or root)
  const reservedPaths = ['admin'];
  const isOnCampaignPage = campaignSlug && !reservedPaths.includes(campaignSlug) && pathname !== '/';

  // Build dynamic routes based on whether we're on a campaign page
  const homeHref = isOnCampaignPage ? `/${campaignSlug}` : '/';
  const voteHref = isOnCampaignPage ? `/${campaignSlug}/vote` : '/';
  const resultsHref = isOnCampaignPage ? `/${campaignSlug}/results` : '/';

  // Determine active states
  const isHomeActive = isOnCampaignPage 
    ? pathname === `/${campaignSlug}` 
    : pathname === '/';
  const isVoteActive = isOnCampaignPage 
    ? pathname.startsWith(`/${campaignSlug}/vote`)
    : false;
  const isResultsActive = isOnCampaignPage 
    ? pathname.startsWith(`/${campaignSlug}/results`)
    : false;

  return (
    <>
      {/* Skip link for keyboard navigation - WCAG 2.1 AA */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border"
        role="banner"
      >
        <div className="container">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link
              href={homeHref}
              className="flex items-center gap-2 text-xl font-bold text-text hover:text-primary transition-colors"
              aria-label="GT eForms Feature Face Off - Home"
            >
              <svg
                className="w-8 h-8 text-primary"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect
                  x="2"
                  y="4"
                  width="12"
                  height="8"
                  rx="2"
                  fill="currentColor"
                />
                <rect
                  x="2"
                  y="20"
                  width="12"
                  height="8"
                  rx="2"
                  fill="currentColor"
                />
                <rect
                  x="18"
                  y="12"
                  width="12"
                  height="8"
                  rx="2"
                  fill="#00B2E3"
                />
                <path
                  d="M14 8H16V16H14V8Z"
                  fill="currentColor"
                  opacity="0.5"
                />
                <path
                  d="M14 24H16V16H14V24Z"
                  fill="currentColor"
                  opacity="0.5"
                />
                <path
                  d="M16 16H18"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.5"
                />
              </svg>
              <span className="hidden sm:inline">GT eForms Feature Face Off</span>
            </Link>

            {/* Navigation - only show campaign links when on a campaign page */}
            {isOnCampaignPage ? (
              <nav aria-label="Main navigation">
                <ul className="flex items-center gap-1 sm:gap-2">
                  <li>
                    <NavLink href={homeHref} isActive={isHomeActive}>
                      Home
                    </NavLink>
                  </li>
                  <li>
                    <NavLink href={voteHref} isActive={isVoteActive}>
                      Vote
                    </NavLink>
                  </li>
                  <li>
                    <NavLink href={resultsHref} isActive={isResultsActive}>
                      Results
                    </NavLink>
                  </li>
                </ul>
              </nav>
            ) : (
              <nav aria-label="Main navigation">
                <ul className="flex items-center gap-1 sm:gap-2">
                  <li>
                    <NavLink href="/admin" isActive={pathname.startsWith('/admin')}>
                      Admin
                    </NavLink>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

interface NavLinkProps {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}

function NavLink({ href, isActive, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`
        px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${
          isActive
            ? 'bg-primary text-text'
            : 'text-text/70 hover:text-text hover:bg-surface'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}

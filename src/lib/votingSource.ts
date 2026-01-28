/**
 * Utility functions for managing voting source persistence across page navigation
 */

const VOTING_SOURCE_KEY = 'current_voting_source';

/**
 * Store the voting source in session storage
 * This persists across page navigation but clears when the tab is closed
 */
export function storeVotingSource(source: string): void {
  if (typeof window === 'undefined') return;
  
  if (source && source !== 'direct') {
    sessionStorage.setItem(VOTING_SOURCE_KEY, source);
  }
}

/**
 * Retrieve the stored voting source from session storage
 * Returns 'direct' if no source is stored
 */
export function getStoredVotingSource(): string {
  if (typeof window === 'undefined') return 'direct';
  
  const stored = sessionStorage.getItem(VOTING_SOURCE_KEY);
  return stored || 'direct';
}

/**
 * Clear the stored voting source
 */
export function clearVotingSource(): void {
  if (typeof window === 'undefined') return;
  
  sessionStorage.removeItem(VOTING_SOURCE_KEY);
}

/**
 * Check if a voting source is currently stored
 */
export function hasStoredVotingSource(): boolean {
  if (typeof window === 'undefined') return false;
  
  const stored = sessionStorage.getItem(VOTING_SOURCE_KEY);
  return !!stored && stored !== 'direct';
}

// Local storage utilities for bracket voting

export interface UserProfile {
  name: string;
  email: string;
}

export interface StoredBracketSubmission {
  bracketId: string;
  roundNumber: number;
  selections: Record<string, string>; // matchupId -> contestantId
  source: string;
  submittedAt: string;
  name: string;
  email: string;
}

export interface StoredSelections {
  bracketId: string;
  roundNumber: number;
  selections: Record<string, string>;
  lastUpdated: string;
}

const STORAGE_KEYS = {
  USER_PROFILE: 'bracket-user-profile',
  CURRENT_SELECTIONS: 'bracket-current-selections',
  SUBMISSIONS_PREFIX: 'bracket-submission-',
};

// User Profile Management
export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to save user profile:', error);
  }
}

export function getUserProfile(): UserProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (stored) {
      return JSON.parse(stored) as UserProfile;
    }
  } catch (error) {
    console.error('Failed to load user profile:', error);
  }
  return null;
}

// Current Selections Management (for quick resubmit across sources)
export function saveCurrentSelections(
  bracketId: string,
  roundNumber: number,
  selections: Record<string, string>
): void {
  try {
    const data: StoredSelections = {
      bracketId,
      roundNumber,
      selections,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_SELECTIONS, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save selections:', error);
  }
}

export function getCurrentSelections(
  bracketId: string,
  roundNumber: number
): Record<string, string> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_SELECTIONS);
    if (stored) {
      const data = JSON.parse(stored) as StoredSelections;
      // Only return if it matches the current bracket and round
      if (data.bracketId === bracketId && data.roundNumber === roundNumber) {
        return data.selections;
      }
    }
  } catch (error) {
    console.error('Failed to load selections:', error);
  }
  return null;
}

// Submission Management (per source URL)
export function getSubmissionKey(bracketId: string, roundNumber: number, source: string): string {
  return `${STORAGE_KEYS.SUBMISSIONS_PREFIX}${bracketId}-round${roundNumber}-${source}`;
}

export function saveSubmission(submission: StoredBracketSubmission): void {
  try {
    const key = getSubmissionKey(submission.bracketId, submission.roundNumber, submission.source);
    localStorage.setItem(key, JSON.stringify(submission));
  } catch (error) {
    console.error('Failed to save submission:', error);
  }
}

export function getSubmission(
  bracketId: string,
  roundNumber: number,
  source: string
): StoredBracketSubmission | null {
  try {
    const key = getSubmissionKey(bracketId, roundNumber, source);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as StoredBracketSubmission;
    }
  } catch (error) {
    console.error('Failed to load submission:', error);
  }
  return null;
}

export function hasSubmittedForSource(
  bracketId: string,
  roundNumber: number,
  source: string
): boolean {
  return getSubmission(bracketId, roundNumber, source) !== null;
}

// Get all submissions for a bracket (useful for showing history)
export function getAllSubmissionsForBracket(
  bracketId: string,
  roundNumber: number
): StoredBracketSubmission[] {
  const submissions: StoredBracketSubmission[] = [];
  try {
    const prefix = `${STORAGE_KEYS.SUBMISSIONS_PREFIX}${bracketId}-round${roundNumber}-`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          submissions.push(JSON.parse(stored) as StoredBracketSubmission);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load submissions:', error);
  }
  return submissions;
}

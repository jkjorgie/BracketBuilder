'use client';

import { useState, useEffect } from 'react';
import { getUserProfile } from '@/lib/storage';

interface SubmissionFormProps {
  isComplete: boolean;
  totalMatchups: number;
  selectedCount: number;
  onSubmit: (email: string, name: string) => void;
  isSubmitting: boolean;
  hasAlreadySubmitted: boolean;
  initialName?: string;
  initialEmail?: string;
}

export function SubmissionForm({
  isComplete,
  totalMatchups,
  selectedCount,
  onSubmit,
  isSubmitting,
  hasAlreadySubmitted,
  initialName = '',
  initialEmail = '',
}: SubmissionFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');
  const [touched, setTouched] = useState({ email: false, name: false });

  // Load saved profile on mount
  useEffect(() => {
    const profile = getUserProfile();
    if (profile) {
      if (!initialName) setName(profile.name);
      if (!initialEmail) setEmail(profile.email);
    }
  }, [initialName, initialEmail]);

  const progress = (selectedCount / totalMatchups) * 100;
  const canSubmit = isComplete && !isSubmitting && !hasAlreadySubmitted && !emailError && !nameError && email && name;

  const validateEmail = (value: string): string => {
    if (!value.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validateName = (value: string): string => {
    if (!value.trim()) {
      return 'Name is required';
    }
    if (value.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      setEmailError(validateEmail(value));
    }
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    setEmailError(validateEmail(email));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (touched.name) {
      setNameError(validateName(value));
    }
  };

  const handleNameBlur = () => {
    setTouched((prev) => ({ ...prev, name: true }));
    setNameError(validateName(name));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newEmailError = validateEmail(email);
    const newNameError = validateName(name);
    
    setEmailError(newEmailError);
    setNameError(newNameError);
    setTouched({ email: true, name: true });

    if (newEmailError || newNameError || !isComplete || isSubmitting || hasAlreadySubmitted) {
      return;
    }

    onSubmit(email.trim(), name.trim());
  };

  return (
    <div className="bg-white border-2 border-border rounded-xl p-6 shadow-sm">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text">
            Selection Progress
          </span>
          <span className="text-sm text-text/60">
            {selectedCount} of {totalMatchups} matchups
          </span>
        </div>
        <div
          className="h-3 bg-surface rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={selectedCount}
          aria-valuemin={0}
          aria-valuemax={totalMatchups}
          aria-label={`${selectedCount} of ${totalMatchups} matchups selected`}
        >
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Status message */}
      {!isComplete && !hasAlreadySubmitted && (
        <div
          className="flex items-start gap-3 p-4 bg-secondary/10 rounded-lg mb-6"
          role="status"
        >
          <svg
            className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5"
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
          <p className="text-sm text-text">
            Select a winner for each matchup to complete your bracket. You have{' '}
            <strong>{totalMatchups - selectedCount}</strong> remaining.
          </p>
        </div>
      )}

      {isComplete && !hasAlreadySubmitted && (
        <div
          className="flex items-start gap-3 p-4 bg-success/10 rounded-lg mb-6"
          role="status"
        >
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
          <p className="text-sm text-text">
            <strong>All selections complete!</strong> Enter your details below to submit.
          </p>
        </div>
      )}

      {hasAlreadySubmitted && (
        <div
          className="flex items-start gap-3 p-4 bg-warning/10 rounded-lg mb-6"
          role="alert"
        >
          <svg
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-text">
            <strong>Already submitted!</strong> You&apos;ve already submitted your bracket for this link.
          </p>
        </div>
      )}

      {/* Contact info form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4 mb-6">
          <div>
            <label
              htmlFor="voter-name"
              className="block text-sm font-medium text-text mb-1"
            >
              Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="voter-name"
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              disabled={hasAlreadySubmitted}
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition-colors ${
                nameError && touched.name
                  ? 'border-error focus:border-error bg-error/5'
                  : 'border-border focus:border-primary'
              } ${hasAlreadySubmitted ? 'bg-surface cursor-not-allowed' : ''}`}
              placeholder="Enter your name"
              autoComplete="name"
              required
              aria-invalid={nameError && touched.name ? 'true' : 'false'}
              aria-describedby={nameError && touched.name ? 'name-error' : undefined}
            />
            {nameError && touched.name && (
              <p id="name-error" className="mt-1 text-sm text-error" role="alert">
                {nameError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="voter-email"
              className="block text-sm font-medium text-text mb-1"
            >
              Email <span className="text-error">*</span>
            </label>
            <input
              type="email"
              id="voter-email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              disabled={hasAlreadySubmitted}
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition-colors ${
                emailError && touched.email
                  ? 'border-error focus:border-error bg-error/5'
                  : 'border-border focus:border-primary'
              } ${hasAlreadySubmitted ? 'bg-surface cursor-not-allowed' : ''}`}
              placeholder="Enter your email"
              autoComplete="email"
              required
              aria-invalid={emailError && touched.email ? 'true' : 'false'}
              aria-describedby={emailError && touched.email ? 'email-error' : 'email-hint'}
            />
            {emailError && touched.email ? (
              <p id="email-error" className="mt-1 text-sm text-error" role="alert">
                {emailError}
              </p>
            ) : (
              <p id="email-hint" className="mt-1 text-xs text-text/50">
                Your name and email will be encrypted for privacy
              </p>
            )}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`
            w-full btn text-lg py-4
            ${
              canSubmit
                ? 'btn-primary hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-border text-text/50 cursor-not-allowed'
            }
          `}
          aria-busy={isSubmitting}
          aria-disabled={!canSubmit}
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Submitting...
            </>
          ) : hasAlreadySubmitted ? (
            <>
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Already Submitted
            </>
          ) : (
            <>
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Submit Bracket
            </>
          )}
        </button>
      </form>
    </div>
  );
}

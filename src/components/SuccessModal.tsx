'use client';

import { useEffect, useRef } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundName: string;
  campaignSlug?: string;
}

export function SuccessModal({ isOpen, onClose, roundName, campaignSlug }: SuccessModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when modal opens
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      // Trap focus within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-text/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in"
      >
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-success-bg/20 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h2
          id="success-modal-title"
          className="text-2xl font-bold text-text text-center mb-2"
        >
          Votes Submitted!
        </h2>
        <p className="text-text/70 text-center mb-6">
          Your {roundName} picks have been recorded! Want to vote again? Swing by the GT booth or catch us at another session for more voting links.
        </p>

        {/* Decorative confetti */}
        <div className="absolute top-4 left-4" aria-hidden="true">
          <span className="text-2xl">🎉</span>
        </div>
        <div className="absolute top-4 right-4" aria-hidden="true">
          <span className="text-2xl">🏆</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="btn btn-primary w-full"
          >
            Continue
          </button>
          <a
            href={campaignSlug ? `/${campaignSlug}/results` : '/results'}
            className="btn btn-outline w-full text-center"
          >
            View Current Results
          </a>
        </div>
      </div>
    </div>
  );
}

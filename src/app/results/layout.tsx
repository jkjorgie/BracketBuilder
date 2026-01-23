import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Results - GT eForms Feature Face Off',
  description: 'View the current standings and results of the GT eForms Feature Face Off at Alliance 2026.',
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

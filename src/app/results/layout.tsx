import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Results - Bracket Builder',
  description: 'View the current standings and results of the bracket competition.',
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Results - Feature Face Off',
  description: 'View the current standings and results of the Feature Face Off.',
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

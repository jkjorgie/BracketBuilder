import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vote - Bracket Builder',
  description: 'Cast your vote for your favorite features in this bracket-style competition.',
};

export default function VoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

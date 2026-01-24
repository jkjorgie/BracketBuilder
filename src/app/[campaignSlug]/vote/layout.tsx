import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vote - Feature Face Off',
  description: 'Cast your vote for your favorite features!',
};

export default function VoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

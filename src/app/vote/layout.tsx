import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vote - GT eForms Feature Face Off',
  description: 'Cast your vote for your favorite GT eForms features at Alliance 2026.',
};

export default function VoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

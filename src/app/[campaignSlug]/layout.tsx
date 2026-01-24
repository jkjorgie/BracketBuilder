import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feature Face Off',
  description: 'Help decide which features advance in the tournament!',
};

export default function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Portal - GT eForms Feature Face Off',
  description: 'Administrative dashboard for managing the Feature Face Off bracket',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900">
      {children}
    </div>
  );
}

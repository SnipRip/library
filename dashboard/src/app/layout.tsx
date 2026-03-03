import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IndevDigital Dashboard',
  description: 'Managed Library & Coaching Class System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}


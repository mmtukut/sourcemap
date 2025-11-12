import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import type { Metadata } from 'next';
import { AppLayout } from '@/components/app-layout';

const iconUrl = "https://firebasestorage.googleapis.com/v0/b/studio-4130837467-4b1cf.firebasestorage.app/o/icon_sourcemap.jpg?alt=media&token=2a540464-335f-426d-a6cd-4fec9904d464";

export const metadata: Metadata = {
  title: 'sourcemap.africa',
  description: 'Verify documents faster, with confidence.',
  icons: {
    icon: iconUrl,
    apple: iconUrl,
  },
  openGraph: {
    images: [iconUrl],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
            <AppLayout>{children}</AppLayout>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

'use client';
import './globals.css';
import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { Toaster } from '@/components/ui/toaster';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isApp =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/library') ||
    pathname.startsWith('/help') ||
    pathname.startsWith('/docs') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/analysis');

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
        {isApp ? (
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <AppHeader />
              <main className="flex-1 p-4 sm:p-6">{children}</main>
            </SidebarInset>
          </SidebarProvider>
        ) : (
          <div className="flex min-h-screen flex-col bg-background">
            {children}
          </div>
        )}
        <Toaster />
      </body>
    </html>
  );
}

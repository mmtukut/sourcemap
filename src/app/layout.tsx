
'use client';
import './globals.css';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider, useUser } from '@/firebase';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  const isAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/library') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/help') ||
    pathname.startsWith('/analysis');

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isLanding = pathname.startsWith('/landing') || pathname === '/';


  useEffect(() => {
    if (isUserLoading) return; // Wait until user state is determined

    if (!user && isAppRoute) {
      router.push('/login');
    } else if (user && (isAuthRoute || pathname === '/')) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, isAppRoute, isAuthRoute, pathname, router]);

  if (isUserLoading && (isAppRoute || isAuthRoute)) {
     return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Authenticating...</p>
        </div>
      </div>
    );
  }

  if (isAppRoute) {
     if (!user) return null; // Or a loading spinner, prevents flicker
     return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <AppHeader />
              <main className="flex-1 p-4 sm:p-6">{children}</main>
            </SidebarInset>
          </SidebarProvider>
     );
  }

  return <div className="flex min-h-screen flex-col bg-background">{children}</div>
}


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

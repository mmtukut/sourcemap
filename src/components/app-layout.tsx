'use client';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
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

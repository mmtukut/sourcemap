
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import Link from 'next/link';

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Logo />
        <nav className="ml-10 hidden items-center space-x-6 text-sm font-medium md:flex">
          <Link
            href="#"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Home
          </Link>
          <Link
            href="#"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            About
          </Link>
          <Link
            href="#"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Pricing
          </Link>
           <Link
            href="#"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Docs
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end gap-4">
          <Button asChild>
            <Link href="/register">Start Verifying Documents</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

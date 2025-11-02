import { Logo } from '@/components/logo';
import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-8 md:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Logo />
            <nav className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium sm:gap-6">
                <Link href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">About</Link>
                <Link href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">Pricing</Link>
                <Link href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">Docs</Link>
                <Link href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">Contact</Link>
                <Link href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">Privacy</Link>
                <Link href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">Terms</Link>
            </nav>
        </div>
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} SourceMap • Built in Nigeria 🇳🇬
        </div>
      </div>
    </footer>
  );
}

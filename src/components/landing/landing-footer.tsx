import { Logo } from '@/components/logo';
import Link from 'next/link';
import Image from 'next/image';

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

        <div className="mt-8 pt-8 border-t text-center space-y-4">
            <p className="text-sm text-muted-foreground italic">
                SourceMap is built on Responsible AI — transparent, explainable, and human-guided.
            </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Image src="https://firebasestorage.googleapis.com/v0/b/studio-4130837467-4b1cf.firebasestorage.app/o/cjid%20logo.jpg?alt=media&token=4cb519f9-8ac5-4916-9501-d9c3dc256e3d" alt="CJID Logo" width={32} height={32} className="rounded-full" />
                    <span>
                        This tool was developed with support from the Centre for Journalism Innovation and Development (CJID) under the Nigeria AI Collective.
                    </span>
                </div>
            </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} SourceMap • Built in Nigeria 🇳🇬
        </div>
      </div>
    </footer>
  );
}

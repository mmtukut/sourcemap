import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function Hero() {
  const heroImage = PlaceHolderImages.find((p) => p.id === 'hero-dashboard');
  return (
    <section className="relative w-full py-20 lg:py-32">
       <div
        aria-hidden="true"
        className="absolute inset-0 top-0 -z-10 h-1/2 w-full bg-gradient-to-b from-primary/5 to-transparent"
      />
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-6 text-center lg:text-left">
            <h1 className="text-4xl font-headline font-bold tracking-tighter text-gray-900 dark:text-gray-50 sm:text-5xl md:text-6xl">
              Verify Documents in Minutes, Not Weeks
            </h1>
            <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl/relaxed lg:mx-0">
              AI-powered forensics built for Nigerian investigative journalism.
              Strengthen your stories with verifiable evidence.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Button size="lg" asChild>
                <Link href="/register">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline">
                <PlayCircle className="mr-2 h-5 w-5" />
                See How It Works
              </Button>
            </div>
             <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Trusted by Premium Times • ICIR • The Cable
            </p>
          </div>
          <div className="mx-auto mt-12 aspect-video overflow-hidden rounded-2xl lg:mt-0 lg:aspect-auto">
            <Image
              src={
                heroImage?.imageUrl ??
                'https://picsum.photos/seed/hero-dash/1200/800'
              }
              width="1200"
              height="800"
              alt="SourceMap Dashboard"
              data-ai-hint="dashboard screenshot"
              className="w-full rounded-2xl object-cover shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

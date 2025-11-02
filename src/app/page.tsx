import { LandingHeader } from '@/components/landing/landing-header';
import { Hero } from '@/components/landing/hero';
import { ProblemSolution } from '@/components/landing/problem-solution';
import { HowItWorks } from '@/components/landing/how-it-works';
import { TrustAndCta } from '@/components/landing/trust-cta';
import { LandingFooter } from '@/components/landing/landing-footer';
import { Testimonials } from '@/components/landing/testimonials';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />
      <main className="flex-1">
        <Hero />
        <ProblemSolution />
        <HowItWorks />
        <Testimonials />
        <TrustAndCta />
      </main>
      <LandingFooter />
    </div>
  );
}

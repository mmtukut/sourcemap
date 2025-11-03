import { LandingHeader } from '@/components/landing/landing-header';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { ProblemSolution } from '@/components/landing/problem-solution';
import { Testimonials } from '@/components/landing/testimonials';
import { TrustAndCta } from '@/components/landing/trust-cta';
import { LandingFooter } from '@/components/landing/landing-footer';

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <Hero />
        <HowItWorks />
        <ProblemSolution />
        <Testimonials />
        <TrustAndCta />
      </main>
      <LandingFooter />
    </>
  );
}

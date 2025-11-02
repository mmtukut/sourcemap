import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, Lock, Globe } from 'lucide-react';

const trustPoints = [
    {
        icon: ShieldCheck,
        text: 'NIGCOMSAT Accelerator Alumnus'
    },
    {
        icon: Lock,
        text: 'End-to-End Encrypted'
    },
    {
        icon: Globe,
        text: 'Built with Code for Africa'
    }
]

export function TrustAndCta() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                    Join the Journalists Fighting Fraud with AI
                </h2>
                <p className="text-gray-500 dark:text-gray-400 md:text-xl/relaxed">
                    Stop wasting time on manual verification and start breaking stories that matter. Get the evidence you need to publish with confidence.
                </p>
                 <Button size="lg" asChild>
                    <Link href="/register">Start Your Free Trial</Link>
                </Button>
            </div>
            <div className="space-y-6 rounded-lg bg-card p-8 shadow-lg">
                <h3 className="text-2xl font-bold">Built on a Foundation of Trust</h3>
                <ul className="space-y-4">
                    {trustPoints.map(point => (
                        <li key={point.text} className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <point.icon className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">{point.text}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
      </div>
    </section>
  );
}

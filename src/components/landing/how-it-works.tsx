
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const steps = [
  {
    id: 'upload',
    name: '1. Upload Document',
    description: 'Securely upload any document (PDF, JPG, PNG). Our system prepares it for analysis.',
    imageId: 'how-it-works-upload',
    imageHint: 'upload interface'
  },
  {
    id: 'analyze',
    name: '2. AI-Assisted Analysis',
    description:
      'Our AI checks metadata, detects visual tampering, and compares against a vast knowledge base.',
    imageId: 'how-it-works-analysis',
    imageHint: 'analysis process'
  },
  {
    id: 'review',
    name: '3. Review & Decide',
    description:
      'Get a clear, evidence-backed report in minutes. Make informed decisions with confidence.',
    imageId: 'how-it-works-report',
    imageHint: 'report evidence'
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-4xl">
            From Doubt to Certainty in 3 Simple Steps
          </h2>
          <p className="mx-auto max-w-3xl text-gray-500 dark:text-gray-400 md:text-xl/relaxed">
            Verification doesn’t have to slow your newsroom down. SourceMap keeps your process fast, transparent, and defensible.
          </p>
        </div>
        <div className="mt-16 grid gap-12 md:grid-cols-3">
          {steps.map((step) => {
            const stepImage = PlaceHolderImages.find((p) => p.id === step.imageId);
            return (
              <div key={step.id} className="flex flex-col items-center text-center">
                 <Image
                    src={stepImage?.imageUrl ?? `https://picsum.photos/seed/${step.id}/600/400`}
                    alt={step.name}
                    width={600}
                    height={400}
                    data-ai-hint={step.imageHint}
                    className="rounded-2xl object-cover shadow-lg aspect-[3/2]"
                />
                <h3 className="mt-6 text-2xl font-bold font-headline">{step.name}</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-sm">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

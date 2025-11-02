'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const steps = [
  'Document uploaded',
  'File validated',
  'Text extracted',
  'Extracting metadata',
  'Visual analysis',
  'Generating report',
];

export default function ProcessingPage({ params }: { params: { id: string } }) {
  const [progress, setProgress] = useState(10);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => router.replace(`/analysis/${id}`), 1000);
          return 100;
        }
        const newProgress = prev + Math.random() * 10;
        return newProgress > 100 ? 100 : newProgress;
      });
    }, 400);

    return () => clearInterval(timer);
  }, [router, id]);

  useEffect(() => {
    const stepIndex = Math.min(
      Math.floor(progress / (100 / (steps.length - 1))),
      steps.length - 1
    );
    setCurrentStepIndex(stepIndex);
  }, [progress]);

  return (
    <div className="flex h-[70vh] items-center justify-center">
      <Card className="w-full max-w-2xl p-8 text-center shadow-2xl">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <h1 className="mt-6 text-2xl font-bold">Analyzing Document...</h1>
        <p className="mt-2 text-muted-foreground">
          This should only take a moment. Please don't close this page.
        </p>
        <div className="mt-8 space-y-4">
          <Progress value={progress} className="w-full" />
          <p className="text-sm font-medium text-muted-foreground">
            Current Step: {steps[currentStepIndex]}...
          </p>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-8 gap-y-2 text-left">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`flex items-center gap-2 text-sm ${
                  index < currentStepIndex
                    ? 'font-semibold text-green-600'
                    : 'text-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <div
                    className={`h-4 w-4 rounded-full border-2 ${
                      index === currentStepIndex
                        ? 'border-primary'
                        : 'border-muted'
                    }`}
                  />
                )}
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

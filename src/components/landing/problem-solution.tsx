
import { Clock, ShieldCheck, GanttChartSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const problems = [
  {
    icon: Clock,
    title: 'Protect Your Credibility',
    description:
      'Journalists spend 2-3 weeks manually verifying documents for a single investigation. We reduce that to minutes.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify with Confidence',
    description:
      'Publishing a forged document can harm credibility. Our tools help you verify the facts.',
  },
  {
    icon: GanttChartSquare,
    title: 'Publish Critical Stories',
    description:
      "Don't let the fear of forged evidence stop you. Get the verifiable proof you need to run important stories.",
  },
];

export function ProblemSolution() {
  return (
    <section className="py-20 lg:py-32 bg-secondary/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-4xl">
            Protect your credibility with tools that verify the facts for you.
          </h2>
          <p className="mx-auto max-w-3xl text-muted-foreground md:text-xl/relaxed">
            In a world of misinformation, document authenticity is your most valuable asset. SourceMap gives you the tools to protect it.
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {problems.map((problem) => (
            <Card key={problem.title} className="text-center glass-card transition-shadow hover:shadow-2xl">
              <CardHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <problem.icon className="h-6 w-6 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold font-headline">{problem.title}</h3>
                <p className="mt-2 text-muted-foreground">
                  {problem.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

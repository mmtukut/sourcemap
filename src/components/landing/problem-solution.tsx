import { Clock, Ban, GanttChartSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const problems = [
  {
    icon: Clock,
    title: 'Weeks of Manual Work',
    description:
      'Journalists spend 2-3 weeks manually verifying documents for a single investigation.',
  },
  {
    icon: Ban,
    title: 'Career-Ending Mistakes',
    description:
      'One forged document can destroy a journalist\'s credibility and trigger legal action.',
  },
  {
    icon: GanttChartSquare,
    title: 'Critical Stories Unpublished',
    description:
      'Fear of publishing forged evidence causes many important stories to never run.',
  },
];

export function ProblemSolution() {
  return (
    <section className="py-20 lg:py-32 bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            The Cost of Getting It Wrong is Existential
          </h2>
          <p className="mx-auto max-w-3xl text-gray-500 dark:text-gray-400 md:text-xl/relaxed">
            In a world of misinformation, document authenticity is your most valuable asset. The risks have never been higher.
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {problems.map((problem) => (
            <Card key={problem.title} className="text-center shadow-xl hover:shadow-2xl transition-shadow rounded-2xl">
              <CardHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <problem.icon className="h-6 w-6 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold">{problem.title}</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
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

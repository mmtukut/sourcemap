import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

type RecommendationsProps = {
    recommendations: string[];
}

export function Recommendations({ recommendations }: RecommendationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          {recommendations.map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

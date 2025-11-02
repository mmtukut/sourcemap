import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, MessageSquarePlus } from 'lucide-react';

export function Feedback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Was this assessment accurate?</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <Button variant="outline">
          <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
          Yes, helpful
        </Button>
        <Button variant="outline">
          <ThumbsDown className="mr-2 h-4 w-4 text-red-500" />
          No, incorrect
        </Button>
        <Button variant="ghost">
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          Add a note
        </Button>
      </CardContent>
    </Card>
  );
}


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const analyses = [
  {
    name: 'Contract_001.pdf',
    status: 'clear',
    score: 87,
    date: 'Oct 30, 2024',
    id: '1'
  },
  {
    name: 'Budget_2024.pdf',
    status: 'review',
    score: 64,
    date: 'Oct 29, 2024',
    id: '1'
  },
  {
    name: 'Court_Doc.jpg',
    status: 'flag',
    score: 41,
    date: 'Oct 28, 2024',
    id: '1'
  },
   {
    name: 'internal-memo.png',
    status: 'clear',
    score: 92,
    date: 'Oct 27, 2024',
    id: '1'
  },
];

const statusStyles = {
  clear: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-400',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-400',
  flag: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-400',
};

export function RecentAnalyses() {
  return (
    <Card className="glass-card">
      <CardHeader className="flex-row items-center justify-between">
        <div>
            <CardTitle>Recent Analyses</CardTitle>
            <CardDescription>A list of your most recent document analyses.</CardDescription>
        </div>
        <Button variant="ghost" asChild>
            <Link href="/library">View all <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Date</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analyses.map((analysis) => (
              <TableRow key={analysis.name} className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                <TableCell className="font-medium">{analysis.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`capitalize ${statusStyles[analysis.status as keyof typeof statusStyles]}`}>
                    {analysis.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{analysis.score}%</TableCell>
                <TableCell>{analysis.date}</TableCell>
                <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/analysis/${analysis.id}`}>View</Link>
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

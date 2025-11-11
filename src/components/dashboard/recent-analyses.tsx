
'use client';
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
import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = '/api/v1';

type Analysis = {
  id: string;
  name: string;
  status: 'clear' | 'review' | 'flag' | 'processing' | 'pending' | 'failed';
  score: number | null;
  date: string;
};

const statusStyles = {
  clear: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-400',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-400',
  flag: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-400',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200 border-gray-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-400',
};

export function RecentAnalyses() {
  const { user } = useUser();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;

    const fetchAnalyses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/documents?user_email=${user.email}`);
        if (!res.ok) {
          throw new Error('Failed to fetch recent analyses');
        }
        const data = await res.json();
        setAnalyses(data);
      } catch (error) {
        const errorMessage = (error as Error).message || 'Could not load analyses.';
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyses();
  }, [user, toast]);

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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : error ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-destructive">
                        {error}
                    </TableCell>
                </TableRow>
            ) : analyses.length > 0 ? (
              analyses.slice(0, 4).map((analysis) => (
                <TableRow key={analysis.id} className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                  <TableCell className="font-medium">{analysis.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${statusStyles[analysis.status]}`}>
                      {analysis.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{analysis.score !== null ? `${analysis.score}%` : 'N/A'}</TableCell>
                  <TableCell>{analysis.date}</TableCell>
                  <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                          <Link href={`/analysis/${analysis.id}`}>View</Link>
                      </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
               <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  You have no recent analyses. Upload a document to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

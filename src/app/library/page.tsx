
'use client'
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
import { Input } from '@/components/ui/input';
import { Search, ListFilter, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';


const API_BASE_URL = 'http://151.241.100.160:9000/api/v1';

const initialAnalyses = [
  { name: 'Contract_001.pdf', status: 'clear', score: 87, date: 'Oct 30, 2024', id: '1' },
  { name: 'Budget_2024.pdf', status: 'review', score: 64, date: 'Oct 29, 2024', id: '1' },
  { name: 'Court_Doc.jpg', status: 'flag', score: 41, date: 'Oct 28, 2024', id: '1' },
  { name: 'internal-memo.png', status: 'clear', score: 92, date: 'Oct 27, 2024', id: '1' },
  { name: 'Press_Release_Q3.pdf', status: 'clear', score: 99, date: 'Oct 26, 2024', id: '1' },
  { name: 'Financial_Statement.jpg', status: 'flag', score: 32, date: 'Oct 25, 2024', id: '1' },
  { name: 'Meeting_Minutes.pdf', status: 'review', score: 71, date: 'Oct 24, 2024', id: '1' },
  { name: 'Employee_Handbook.pdf', status: 'clear', score: 95, date: 'Oct 23, 2024', id: '1' },
];

const statusStyles: { [key: string]: string } = {
  clear: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-400',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-400',
  flag: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-400',
};

export default function LibraryPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSearch = useCallback(async () => {
        if (!searchTerm.trim()) {
            setSearchResults(null);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/knowledge/search?query=${encodeURIComponent(searchTerm)}`);
            if (!res.ok) {
                throw new Error('Search request failed');
            }
            const data = await res.json();
            setSearchResults(data.results);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Search Failed',
                description: (error as Error).message || 'Could not fetch search results.',
            });
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, toast]);

    const analysesToDisplay = searchResults !== null ? searchResults : initialAnalyses;


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline tracking-tight">
        Document Library
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>All Analyses</CardTitle>
          <CardDescription>Browse, search, and manage all your document analyses.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-6">
              <div className="relative w-full max-w-sm">
                  <Input 
                    placeholder="Search knowledge base by keyword..." 
                    className="pr-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={handleSearch}
                    disabled={isLoading}
                   >
                     {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 text-muted-foreground" />}
                  </Button>
              </div>
              <Button variant="outline">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Filter
              </Button>
          </div>
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
              {analysesToDisplay.map((analysis, index) => (
                <TableRow key={analysis.name || index} className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                  <TableCell className="font-medium">{analysis.name || `Result ${index + 1}`}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${statusStyles[analysis.status as keyof typeof statusStyles] || ''}`}>
                      {analysis.status || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{analysis.score ? `${analysis.score}%` : (analysis.similarity_score ? `${(analysis.similarity_score * 100).toFixed(0)}%` : 'N/A')}</TableCell>
                  <TableCell>{analysis.date || new Date(analysis.provenance?.chunk_timestamp).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                          <Link href={`/analysis/${analysis.id || analysis.doc_id}`}>View Report</Link>
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
               {analysesToDisplay.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        {isLoading ? 'Searching...' : 'No results found.'}
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

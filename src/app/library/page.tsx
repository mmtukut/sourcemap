
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
import { Search, ListFilter } from 'lucide-react';
import Link from 'next/link';

const allAnalyses = [
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by document name..." className="pl-10" />
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
              {allAnalyses.map((analysis) => (
                <TableRow key={analysis.name} className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                  <TableCell className="font-medium">{analysis.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${statusStyles[analysis.status]}`}>
                      {analysis.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{analysis.score}%</TableCell>
                  <TableCell>{analysis.date}</TableCell>
                  <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                          <Link href={`/analysis/${analysis.id}`}>View Report</Link>
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

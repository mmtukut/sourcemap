import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Share, Download, FileDown } from 'lucide-react';
import { Badge } from '../ui/badge';

type SubScores = {
  rag?: number;
  vision?: number;
  newsroom?: number;
};

type ConfidenceScoreProps = {
  score: number;
  status: 'clear' | 'review' | 'flag';
  subScores?: SubScores;
};

const statusConfig = {
  clear: {
    text: 'CLEAR',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    progressColor: 'bg-green-500',
    description: 'This document shows high confidence with no critical issues found.',
  },
  review: {
    text: 'NEEDS REVIEW',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    progressColor: 'bg-yellow-500',
    description: 'This document shows moderate confidence. Review flagged items before publication.',
  },
  flag: {
    text: 'FLAGGED',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    progressColor: 'bg-red-500',
    description: 'This document shows low confidence. Multiple critical issues were found. Proceed with caution.',
  },
};

export function ConfidenceScore({ score, status, subScores }: ConfidenceScoreProps) {
  const config = statusConfig[status];

  return (
    <Card className="overflow-hidden shadow-xl rounded-2xl">
      <div className={`${config.bgColor} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className='mb-4 sm:mb-0'>
                <h2 className={`text-xl font-bold ${config.color}`}>{score}% CONFIDENCE SCORE</h2>
                <p className={`text-2xl font-extrabold sm:text-3xl ${config.color}`}>{config.text}</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" className="bg-white">
                    <FileDown className="mr-2 h-4 w-4" /> Export PDF Report
                </Button>
                <Button variant="outline" className="bg-white">
                    <Share className="mr-2 h-4 w-4" /> Share Link
                </Button>
                <Button variant="outline" className="bg-white">
                    <Download className="mr-2 h-4 w-4" /> Download Original
                </Button>
            </div>
        </div>
        <Progress value={score} className="mt-4 h-3 [&>*]:bg-primary" />
      </div>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start">
            <p className="text-muted-foreground max-w-lg mb-4 sm:mb-0">{config.description}</p>
            {subScores && (
                <div className="flex gap-2 flex-wrap">
                    {subScores.vision !== undefined && <Badge variant="secondary">Vision: {Math.round(subScores.vision * 100)}%</Badge>}
                    {subScores.rag !== undefined && <Badge variant="secondary">RAG: {subScores.rag}%</Badge>}
                    {subScores.newsroom !== undefined && <Badge variant="secondary">Newsroom: {subScores.newsroom}%</Badge>}
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

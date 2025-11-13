
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Newspaper } from 'lucide-react';

export type SimilarArticle = {
  date: string;
  link: string;
  title: string;
  publisher: string;
  description: string;
  similarity_score: number;
};

type SimilarArticlesProps = {
  articles: SimilarArticle[];
};

export function SimilarArticles({ articles }: SimilarArticlesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            Similar Proven Newspapers
        </CardTitle>
        <CardDescription>
          This document has similarities to the following articles from our historical news archives.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {articles.map((article, index) => (
          <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-grow">
                <Link href={article.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    <h3 className="font-semibold text-base line-clamp-2">{article.title || 'No Title Available'}</h3>
                </Link>
                <div className="text-xs text-muted-foreground mt-1">
                  <span>{article.publisher}</span> &bull; <span>{new Date(article.date).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{article.description}</p>
              </div>
              <div className="flex-shrink-0 text-center">
                 <p className="text-xs text-muted-foreground">Similarity</p>
                 <Badge variant="outline" className="text-base font-bold">
                    {(article.similarity_score * 100).toFixed(0)}%
                 </Badge>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

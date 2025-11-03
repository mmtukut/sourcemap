
'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileJson,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AutomatedDocumentAnalysisOutput } from '@/ai/flows/automated-document-analysis';
import { useEffect, useState } from 'react';

type AnalysisTabsProps = {
  metadataAnalysis: AutomatedDocumentAnalysisOutput['metadataAnalysis'];
  similarDocuments: AutomatedDocumentAnalysisOutput['similarDocuments'];
};

export function AnalysisTabs({ metadataAnalysis, similarDocuments }: AnalysisTabsProps) {
  const [createdDate, setCreatedDate] = useState('');
  const [modifiedDate, setModifiedDate] = useState('');

  useEffect(() => {
    if (metadataAnalysis.created) {
      setCreatedDate(new Date(metadataAnalysis.created).toLocaleString());
    }
    if (metadataAnalysis.modified) {
      setModifiedDate(new Date(metadataAnalysis.modified).toLocaleString());
    }
  }, [metadataAnalysis.created, metadataAnalysis.modified]);

  return (
    <Tabs defaultValue="metadata">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="metadata">Metadata</TabsTrigger>
        <TabsTrigger value="similar">Similar Docs</TabsTrigger>
      </TabsList>
      <TabsContent value="metadata">
        <Card>
          <CardHeader>
            <CardTitle>Metadata Analysis</CardTitle>
            <CardDescription>
              Detailed file information and creation data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">File Information</h3>
              <div className="rounded-lg border p-4 grid grid-cols-2 gap-4 text-sm font-mono">
                <p>Filename: <span className="text-muted-foreground">{metadataAnalysis.filename}</span></p>
                <p>Size: <span className="text-muted-foreground">{metadataAnalysis.size}</span></p>
                <p>Type: <span className="text-muted-foreground">{metadataAnalysis.type}</span></p>
                <p>Pages: <span className="text-muted-foreground">{metadataAnalysis.pages}</span></p>
              </div>
            </div>
             <div className="space-y-2">
              <h3 className="font-semibold">Creation Data</h3>
              <div className="rounded-lg border p-4 grid grid-cols-2 gap-4 text-sm font-mono">
                <p>Created: <span className="text-muted-foreground">{createdDate}</span></p>
                <p>Modified: <span className="text-muted-foreground">{modifiedDate}</span></p>
                <p>Author: <span className="text-muted-foreground">{metadataAnalysis.author}</span></p>
                <p>Creator Tool: <span className="text-muted-foreground">{metadataAnalysis.creatorTool}</span></p>
              </div>
            </div>
             <div className="space-y-2">
              <h3 className="font-semibold">Authenticity Checks</h3>
              <ul className="space-y-2">
                {metadataAnalysis.authenticityChecks.map((check, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                        {check.includes('Modified after') ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                        <span>{check}</span>
                    </li>
                ))}
              </ul>
            </div>
            <Button variant="outline">
              <FileJson className="mr-2 h-4 w-4" />
              Export Metadata JSON
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="similar">
        <Card>
          <CardHeader>
            <CardTitle>Similar Documents</CardTitle>
            <CardDescription>
              Comparison with documents from the knowledge base.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {similarDocuments.map((doc, index) => (
                <Card key={index}>
                    <CardHeader>
                        <CardTitle className="text-base">{doc.filename}</CardTitle>
                        <div className="flex items-center gap-4 text-sm">
                            <p>Similarity: <Badge variant={doc.similarity > 80 ? 'default' : 'secondary'}>{doc.similarity}%</Badge></p>
                            <p>Status: <Badge variant="outline" className='border-green-300 bg-green-50 text-green-800'>{doc.status}</Badge></p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <h4 className="font-semibold text-sm mb-2">Key Differences:</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            {doc.keyDifferences.map((diff, i) => <li key={i}>{diff}</li>)}
                        </ul>
                         <h4 className="font-semibold text-sm mt-4 mb-2">Assessment:</h4>
                         <p className="text-sm text-muted-foreground">{doc.assessment}</p>
                    </CardContent>
                </Card>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

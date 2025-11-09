
'use client';
import { useEffect, useState } from 'react';
import { ConfidenceScore } from '@/components/analysis/confidence-score';
import { DocumentViewer } from '@/components/analysis/document-viewer';
import { EvidencePanel } from '@/components/analysis/evidence-panel';
import { AnalysisTabs } from '@/components/analysis/analysis-tabs';
import { Recommendations } from '@/components/analysis/recommendations';
import { Feedback } from '@/components/analysis/feedback';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { automatedDocumentAnalysis, AutomatedDocumentAnalysisOutput } from '@/ai/flows/automated-document-analysis';
import { generateRecommendations, GenerateRecommendationsOutput } from '@/ai/flows/generate-recommendations';


const API_BASE_URL = '/api/v1';

// This is a mock page. In a real app, you'd fetch data based on the `id` param.
export default function AnalysisResultPage({ params }: { params: { id: string } }) {
  const [analysisData, setAnalysisData] = useState<AutomatedDocumentAnalysisOutput | null>(null);
  const [recommendations, setRecommendations] = useState<GenerateRecommendationsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!params.id) return;
    
    // An initial Genkit flow call to get some data structure.
    // In a real app this might be more sophisticated
    const fetchInitialData = async () => {
      try {
        const result = await automatedDocumentAnalysis({documentDataUri: ''});
        const recs = await generateRecommendations({analysisResults: JSON.stringify(result, null, 2)})
        setAnalysisData(result);
        setRecommendations(recs);
      } catch (e) {
         setError('Failed to fetch analysis data.');
         toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: 'Could not fetch initial analysis data.',
        });
      }
    };

    fetchInitialData();
  }, [params.id, toast]);


  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-destructive mb-2">An Error Occurred</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button asChild>
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
      </div>
    );
  }

  if (!analysisData || !recommendations) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Running Analysis...</h2>
        <p className="text-muted-foreground max-w-md">
            Our AI is examining your document. This may take a few moments. We're checking metadata, looking for visual anomalies, and comparing it against our knowledge base.
        </p>
      </div>
    );
  }

  const { confidenceScore, status, keyFindings, metadataAnalysis, similarDocuments } = analysisData;

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold font-headline tracking-tight mt-2">
          Analysis for: {metadataAnalysis.filename || 'document'}
        </h1>
      </div>

      <ConfidenceScore score={confidenceScore} status={status} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DocumentViewer />
        </div>
        <div className="lg:col-span-2">
          <EvidencePanel keyFindings={keyFindings} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AnalysisTabs metadataAnalysis={metadataAnalysis} similarDocuments={similarDocuments} />
        <div className="space-y-8">
            <Recommendations recommendations={recommendations.recommendations} />
            <Feedback />
        </div>
      </div>
    </div>
  );
}

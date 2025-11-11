
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
import { generateRecommendations, GenerateRecommendationsOutput } from '@/ai/flows/generate-recommendations';
import { useParams } from 'next/navigation';

const API_BASE_URL = '/api/v1';

type EvidenceItem = {
    type: string;
    description: string;
    severity: 'critical' | 'moderate' | 'consistent';
    confidence: number;
};

type BackendAnalysisResult = {
  document_id: string;
  filename: string;
  status: string;
  analysis_result?: {
    id: string;
    confidence_score: number;
    assessment: string;
    evidence: EvidenceItem[];
    created_at: string;
  };
  message?: string;
};

type AdaptedAnalysisOutput = {
  confidenceScore: number;
  status: 'clear' | 'review' | 'flag';
  keyFindings: EvidenceItem[]; // Use the detailed evidence item
  metadataAnalysis: {
    filename: string;
    size: string;
    type: string;
    pages?: number;
    created?: string;
    modified?: string;
    author?: string;
    creatorTool?: string;
    authenticityChecks: string[]; // Keep this for now, can be derived from evidence
  };
  similarDocuments: Array<{
    filename: string;
    similarity: number;
    type: string;
    status: string;
    keyDifferences: string[];
    assessment: string;
  }>;
};

export default function AnalysisResultPage() {
  const params = useParams();
  const id = params.id as string;

  const [analysisData, setAnalysisData] = useState<AdaptedAnalysisOutput | null>(null);
  const [recommendations, setRecommendations] = useState<GenerateRecommendationsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchAnalysisData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/analysis/${id}`);
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch analysis data.'}));
            throw new Error(errorData.detail || errorData.error || 'The server returned an error.');
        }

        const result: BackendAnalysisResult = await res.json();
        
        const analysisResult = result.analysis_result;

        if (!analysisResult) {
            throw new Error(result.message || "Analysis is not yet complete.");
        }
        
        const score = analysisResult.confidence_score; 

        // Adapt the new structured backend response to the frontend's expected format
        const adaptedResult: AdaptedAnalysisOutput = {
            confidenceScore: score,
            status: score >= 80 ? 'clear' : score >= 60 ? 'review' : 'flag',
            keyFindings: analysisResult.evidence.map(e => ({...e, type: e.description})), // Map evidence to keyFindings
            metadataAnalysis: { 
                filename: result.filename, 
                size: 'N/A', // These fields are not in the new backend response
                type: 'N/A',
                created: analysisResult.created_at,
                // Create authenticity checks from the descriptions of evidence
                authenticityChecks: analysisResult.evidence.map(e => e.description),
            },
            similarDocuments: [] // This is not yet provided by the backend
        };

        setAnalysisData(adaptedResult);

        // Generate recommendations based on the new structured evidence
        const recommendationInput = JSON.stringify(adaptedResult.keyFindings.map(f => f.description));
        const recommendationsResponse = await generateRecommendations({ analysisResults: recommendationInput });
        setRecommendations(recommendationsResponse);

      } catch (e) {
         setError((e as Error).message || 'Failed to fetch analysis data.');
         toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: (e as Error).message || 'Could not fetch analysis data from the server.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysisData();
  }, [id, toast]);


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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Loading Analysis Report...</h2>
        <p className="text-muted-foreground max-w-md">
            Retrieving the detailed findings for your document.
        </p>
      </div>
    );
  }
  
  if (!analysisData || !recommendations) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Analysis Incomplete</h2>
           <p className="text-muted-foreground mb-4">Could not retrieve complete analysis data from the server.</p>
           <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
           </Button>
        </div>
      );
  }


  const { confidenceScore, status, keyFindings, metadataAnalysis, similarDocuments } = analysisData;

  // The 'keyFindings' for EvidencePanel now needs to be transformed from the new backend structure
  const evidencePanelFindings = keyFindings.map(item => ({
    type: item.severity, // Use severity for the panel's critical/moderate/consistent classification
    description: item.description,
    evidence: `Confidence: ${(item.confidence * 100).toFixed(0)}%`
  }));

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
          <EvidencePanel keyFindings={evidencePanelFindings} />
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

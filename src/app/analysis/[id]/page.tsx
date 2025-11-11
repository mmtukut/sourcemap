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
import { useParams } from 'next/navigation';

const API_BASE_URL = '/api/v1';

type EvidenceItem = {
    type: string;
    description: string;
    severity: 'critical' | 'moderate' | 'consistent';
    confidence: number;
};

type Metadata = {
    filename: string;
    size_bytes: number;
    type: string;
    pages?: number;
    created?: string;
    modified?: string;
    author?: string;
    creator_tool?: string;
    producer?: string;
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
    recommendations: string[];
    created_at: string;
  };
  metadata?: Metadata;
  message?: string;
};

export default function AnalysisResultPage() {
  const params = useParams();
  const id = params?.id as string;

  const [backendData, setBackendData] = useState<BackendAnalysisResult | null>(null);
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
        
        if (!result.analysis_result) {
            throw new Error(result.message || "Analysis is not yet complete.");
        }
        
<<<<<<< HEAD
        const score = analysisResult.confidence_score; 
        const evidenceList = analysisResult.evidence || []; // Default to empty array

        // Adapt the new structured backend response to the frontend's expected format
        const adaptedResult: AdaptedAnalysisOutput = {
            confidenceScore: score,
            status: score >= 80 ? 'clear' : score >= 60 ? 'review' : 'flag',
            keyFindings: evidenceList, // Use the safe evidenceList
            metadataAnalysis: { 
                filename: result.filename, 
                size: 'N/A',
                type: 'N/A',
                created: analysisResult.created_at,
                authenticityChecks: evidenceList.map(e => e.description),
            },
            similarDocuments: [] 
        };

        setAnalysisData(adaptedResult);

        // Generate recommendations, but handle potential failures gracefully
        try {
            const recommendationInput = JSON.stringify(adaptedResult.keyFindings.map(f => f.description));
            const recommendationsResponse = await generateRecommendations({ analysisResults: recommendationInput });
            setRecommendations(recommendationsResponse);
        } catch (recError) {
            console.error("Failed to generate recommendations:", recError);
            toast({
              variant: 'destructive',
              title: 'Could Not Load AI Recommendations',
              description: 'The AI service may be temporarily unavailable. The main analysis is still shown.',
            });
            // Set a default state for recommendations so the page can still render
            setRecommendations({ recommendations: ['AI recommendations are currently unavailable. Please check back later.'] });
        }
=======
        setBackendData(result);
>>>>>>> 2b67af905ccceb49570e9e3fcc8b18db27f4241c

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
  
  if (!backendData || !backendData.analysis_result) {
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


  const { analysis_result, metadata, filename } = backendData;
  const { confidence_score, evidence, recommendations } = analysis_result;
  const score = confidence_score;
  const status = score >= 80 ? 'clear' : score >= 60 ? 'review' : 'flag';

  const evidencePanelFindings = (evidence || []).map(item => ({
    type: item.severity, 
    description: item.description,
    evidence: `Confidence: ${(item.confidence * 100).toFixed(0)}%`
  }));

  const adaptedMetadata = {
      filename: filename,
      size: metadata?.size_bytes ? `${(metadata.size_bytes / 1024).toFixed(2)} KB` : 'N/A',
      type: metadata?.type || 'N/A',
      pages: metadata?.pages,
      created: metadata?.created,
      modified: metadata?.modified,
      author: metadata?.author,
      creatorTool: metadata?.creator_tool,
      authenticityChecks: (evidence || []).map(e => e.description),
  };

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
          Analysis for: {filename || 'document'}
        </h1>
      </div>

      <ConfidenceScore score={score} status={status} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DocumentViewer />
        </div>
        <div className="lg:col-span-2">
          <EvidencePanel keyFindings={evidencePanelFindings} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AnalysisTabs metadataAnalysis={adaptedMetadata} similarDocuments={[]} />
        <div className="space-y-8">
            <Recommendations recommendations={recommendations || []} />
            <Feedback />
        </div>
      </div>
    </div>
  );
}

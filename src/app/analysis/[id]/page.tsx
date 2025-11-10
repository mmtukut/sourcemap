
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

const API_BASE_URL = '/api/v1';

// This is a simplified representation of the expected backend output.
// In a real scenario, this would be more robust and likely generated from the OpenAPI spec.
type BackendAnalysisResult = {
    confidence_score: number;
    findings: Array<{
        severity: string;
        type: string;
        location: object;
    }>;
    similar_documents: Array<{
        ref_id: string;
        similarity_score: number;
        explanation: string;
    }>;
    // ... other fields from the backend
};

// This matches the Genkit flow output, which the components are expecting
type AdaptedAnalysisOutput = {
  confidenceScore: number;
  status: 'clear' | 'review' | 'flag';
  keyFindings: Array<{
    type: 'critical' | 'moderate' | 'consistent';
    description: string;
    evidence: string;
  }>;
  metadataAnalysis: {
    filename: string;
    size: string;
    type: string;
    pages?: number;
    created?: string;
    modified?: string;
    author?: string;
    creatorTool?: string;
    authenticityChecks: string[];
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


export default function AnalysisResultPage({ params }: { params: { id: string } }) {
  const [analysisData, setAnalysisData] = useState<AdaptedAnalysisOutput | null>(null);
  const [recommendations, setRecommendations] = useState<GenerateRecommendationsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    const pollAnalysisStatus = (analysisId: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            // Corrected API endpoint
            const res = await fetch(`${API_BASE_URL}/documents/analysis/${analysisId}`);
            if (res.ok) {
              const data = await res.json();
              // A real backend would have a status field. Let's assume if we get a 200 OK
              // with a confidence score, the analysis is done.
              if (data && data.confidence_score !== undefined) {
                 clearInterval(interval);
                 resolve(data);
              } else if (data.status === 'not_implemented_yet' || data.status === 'started') {
                 // Keep polling if status indicates it's in progress
              } else if (data.status === 'failed') {
                 clearInterval(interval);
                 reject(new Error('Analysis failed on the server.'));
              }
            } else if (res.status >= 400) {
               clearInterval(interval);
               const errorData = await res.json().catch(() => ({error: 'Failed to fetch analysis status.'}));
               reject(new Error(errorData.error || 'The server returned an error.'));
            }
          } catch (error) {
            clearInterval(interval);
            reject(error);
          }
        }, 5000); // Poll every 5 seconds
      });
    };
    
    const fetchAnalysisData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result: BackendAnalysisResult = await pollAnalysisStatus(params.id);
        
        // Adapt the backend data to the format the frontend components expect.
        const adaptedResult: AdaptedAnalysisOutput = {
            confidenceScore: result.confidence_score || 50,
            status: result.confidence_score >= 80 ? 'clear' : result.confidence_score >= 60 ? 'review' : 'flag',
            keyFindings: result.findings?.map((f: any) => ({
                type: f.severity === 'high' ? 'critical' : f.severity === 'medium' ? 'moderate' : 'consistent',
                description: f.type || "Finding",
                evidence: f.location ? `Details found at: ${JSON.stringify(f.location)}` : "No specific evidence details provided."
            })) || [],
            metadataAnalysis: { // The backend doesn't provide this yet, so we use placeholders.
                filename: 'document.pdf', 
                size: 'N/A',
                type: 'PDF',
                authenticityChecks: [],
            },
            similarDocuments: result.similar_documents?.map((d: any) => ({
                filename: d.ref_id,
                similarity: d.similarity_score * 100,
                type: "Reference Document",
                status: "Verified Authentic", // Placeholder status
                keyDifferences: [d.explanation],
                assessment: d.explanation,
            })) || []
        };

        setAnalysisData(adaptedResult);

        // Once we have analysis data, we can generate recommendations
        const recommendationsResponse = await generateRecommendations({ analysisResults: JSON.stringify(adaptedResult.keyFindings) });
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

  if (isLoading) {
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

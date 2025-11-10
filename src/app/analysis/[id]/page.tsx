
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
import { mockAnalysisData, mockRecommendations } from '@/lib/mock-data';


const API_BASE_URL = '/api/v1';

// This is a mock page. In a real app, you'd fetch data based on the `id` param.
export default function AnalysisResultPage({ params }: { params: { id: string } }) {
  const [analysisData, setAnalysisData] = useState<AutomatedDocumentAnalysisOutput | null>(null);
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
            const res = await fetch(`${API_BASE_URL}/documents/analysis/${analysisId}`);
            if (res.ok) {
              const data = await res.json();
              // A real backend would have a status field. We will use a mock for now.
              // Let's assume the backend is not fully ready and we use mock data once polling "completes"
              if (data.status !== 'not_implemented_yet' && data.status !== 'started') {
                 clearInterval(interval);
                 resolve(data);
                 return;
              }
               // This is a temporary addition to use mock data for dev
               if (data.status === 'not_implemented_yet') {
                  clearInterval(interval);
                  console.warn("Analysis endpoint not ready. Using mock data.");
                  resolve(mockAnalysisData);
               }

            } else if (res.status >= 400) {
               clearInterval(interval);
               const errorData = await res.json().catch(() => ({error: 'Failed to fetch analysis status.'}));
               reject(new Error(errorData.error));
            }
          } catch (error) {
            clearInterval(interval);
            reject(error);
          }
        }, 3000); // Poll every 3 seconds
      });
    };
    
    const fetchAnalysisData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await pollAnalysisStatus(params.id);
        // The backend doesn't quite match the Genkit flow output, so we need to adapt it.
        // This is a temporary measure until the backend provides the full expected structure.
        const adaptedResult: AutomatedDocumentAnalysisOutput = {
            confidenceScore: result.confidence_score || 50,
            status: result.confidence_score > 80 ? 'clear' : result.confidence_score > 60 ? 'review' : 'flag',
            keyFindings: result.findings?.map((f: any) => ({
                type: f.severity === 'high' ? 'critical' : f.severity === 'medium' ? 'moderate' : 'consistent',
                description: f.type || "Finding",
                evidence: f.location ? JSON.stringify(f.location) : "No details provided."
            })) || [],
            metadataAnalysis: {
                filename: 'document', // Placeholder
                size: 'N/A',
                type: 'N/A',
                authenticityChecks: [],
            },
            similarDocuments: result.similar_documents?.map((d: any) => ({
                filename: d.ref_id,
                similarity: d.similarity_score * 100,
                type: "Reference Document",
                status: "Verified authentic",
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
          description: (e as Error).message || 'Could not fetch analysis data.',
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

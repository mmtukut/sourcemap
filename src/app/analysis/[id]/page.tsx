
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
import { API_BASE_URL } from '@/lib/api';
import { SimilarArticles, type SimilarArticle } from '@/components/analysis/similar-articles';

type SubScores = {
  rag?: number;
  vision?: number;
  newsroom?: number;
};

type AnalysisResult = {
  id: string;
  confidence_score: number;
  sub_scores: SubScores;
  findings: string[];
  created_at: string;
};

type BackendAnalysisResult = {
  document_id: string;
  filename: string; // This is provided by the /documents/ endpoint, but not /analysis/. We'll handle it.
  status: string;
  analysis_result?: AnalysisResult;
  similar_proven_newspapers?: SimilarArticle[];
  message?: string;
};

// Helper function to determine severity from finding text
const getSeverity = (finding: string): 'critical' | 'moderate' | 'consistent' => {
  const lowerFinding = finding.toLowerCase();
  if (lowerFinding.includes('tampering') || lowerFinding.includes('questionable') || lowerFinding.includes('concerns')) {
    return 'critical';
  }
  if (lowerFinding.includes('deviation') || lowerFinding.includes('matches')) {
    return 'moderate';
  }
  return 'consistent';
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
            // This could be a pending analysis, let's show progress.
            const docRes = await fetch(`${API_BASE_URL}/documents/?document_id=${id}`);
            if(docRes.ok) {
                const docData = await docRes.json();
                if(docData.length > 0) {
                     setBackendData({ ...result, filename: docData[0].name });
                }
            }
             // Let the UI handle the non-complete status
             setBackendData(result);
             // Polling could be implemented here
        } else {
             setBackendData(result);
        }

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
            Retrieving the detailed findings for your document. This may take a moment.
        </p>
      </div>
    );
  }
  
  if (!backendData || !backendData.analysis_result) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h2 className="text-xl font-semibold mb-2">Analysis In Progress...</h2>
           <p className="text-muted-foreground mb-4">
              The document analysis is still running. Status: <span className='font-bold'>{backendData?.status || 'loading'}</span>.
              Please refresh in a moment.
            </p>
           <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
           </Button>
        </div>
      );
  }

  const { analysis_result, filename, similar_proven_newspapers } = backendData;
  const { confidence_score, findings, sub_scores } = analysis_result;
  const score = Math.round(confidence_score);
  const status = score >= 80 ? 'clear' : score >= 60 ? 'review' : 'flag';

  const evidencePanelFindings = (findings || []).map(desc => ({
    type: getSeverity(desc), 
    description: desc,
    evidence: `This finding was identified by the AI model.`
  }));

  const adaptedMetadata = {
      filename: filename || backendData.document_id,
      size: 'N/A',
      type: 'N/A',
      authenticityChecks: (findings || []),
  };

  // Recommendations are not in the backend response, so we provide a default or leave it empty.
  const recommendations = [
    "Verify the document's origin with the source directly if possible.",
    "Cross-reference key names, dates, and figures with trusted public records.",
    "For critical inconsistencies, consult with a forensic document expert."
  ];

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
          Analysis for: {filename || backendData.document_id}
        </h1>
      </div>

      <ConfidenceScore score={score} status={status} subScores={sub_scores} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DocumentViewer />
        </div>
        <div className="lg:col-span-2">
          <EvidencePanel keyFindings={evidencePanelFindings} />
        </div>
      </div>
      
      <div className="space-y-8">
         {similar_proven_newspapers && similar_proven_newspapers.length > 0 && (
            <SimilarArticles articles={similar_proven_newspapers} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AnalysisTabs metadataAnalysis={adaptedMetadata} similarDocuments={[]} />
        <div className="space-y-8">
            <Recommendations recommendations={recommendations} />
            <Feedback />
        </div>
      </div>
    </div>
  );
}

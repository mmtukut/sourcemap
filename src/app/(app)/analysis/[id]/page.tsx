import { mockAnalysisData, mockRecommendations } from '@/lib/mock-data';
import { ConfidenceScore } from '@/components/analysis/confidence-score';
import { EvidencePanel } from '@/components/analysis/evidence-panel';
import { DocumentViewer } from '@/components/analysis/document-viewer';
import { AnalysisTabs } from '@/components/analysis/analysis-tabs';
import { Recommendations } from '@/components/analysis/recommendations';
import { Feedback } from '@/components/analysis/feedback';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
  automatedDocumentAnalysis,
  AutomatedDocumentAnalysisOutput,
} from '@/ai/flows/automated-document-analysis';
import {
  generateRecommendations,
  GenerateRecommendationsOutput,
} from '@/ai/flows/generate-recommendations';

export const revalidate = 0;

export default async function AnalysisResultPage({
  params,
}: {
  params: { id: string };
}) {
  // In a real app, you would fetch real data based on the ID.
  // For this demo, we'll use the mock data.
  // const analysisData: AutomatedDocumentAnalysisOutput = await automatedDocumentAnalysis({ documentDataUri: "" });
  // const recommendationsData: GenerateRecommendationsOutput = await generateRecommendations({ analysisResults: JSON.stringify(analysisData) });

  const analysisData = mockAnalysisData;
  const recommendationsData = mockRecommendations;

  return (
    <div className="space-y-6">
      <ConfidenceScore
        score={analysisData.confidenceScore}
        status={analysisData.status}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EvidencePanel keyFindings={analysisData.keyFindings} />
        <DocumentViewer />
      </div>

      <AnalysisTabs
        metadataAnalysis={analysisData.metadataAnalysis}
        similarDocuments={analysisData.similarDocuments}
      />
      
      <Recommendations recommendations={recommendationsData.recommendations} />
      
      <Feedback />

      <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-200">
        <AlertTriangle className="h-4 w-4 !text-red-500" />
        <AlertTitle className="font-bold">Disclaimer</AlertTitle>
        <AlertDescription>
          AI-ASSISTED ANALYSIS. Human verification required before publication. This tool supports—but does not replace—journalistic judgment.
        </AlertDescription>
      </Alert>
    </div>
  );
}

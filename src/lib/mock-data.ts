import type { AutomatedDocumentAnalysisOutput } from "@/ai/flows/automated-document-analysis";

export const mockAnalysisData: AutomatedDocumentAnalysisOutput = {
  confidenceScore: 64,
  status: 'review',
  keyFindings: [
    {
      type: 'critical',
      description: 'File modified after signature date',
      evidence: 'File modification date (Oct 15, 2024) is 5 days after the signature date found in the document content (Oct 10, 2024).',
    },
    {
      type: 'moderate',
      description: 'Font mismatch in paragraph 4',
      evidence: 'The font used in paragraph 4 (Times New Roman) does not match the primary document font (Arial). This could indicate a later insertion or modification.',
    },
    {
      type: 'moderate',
      description: 'Date format differs from header',
      evidence: 'The date format in the body (DD/MM/YYYY) is inconsistent with the format used in the letterhead (MMMM D, YYYY).',
    },
    {
      type: 'consistent',
      description: 'Metadata present and complete',
    },
    {
      type: 'consistent',
      description: 'Image quality is normal for a scanned document',
    },
    {
      type: 'consistent',
      description: 'No obvious digital artifacts detected',
    },
    {
      type: 'consistent',
      description: 'OCR text extraction was successful',
    },
  ],
  metadataAnalysis: {
    filename: 'contract_leak_2024.pdf',
    size: '2.4 MB',
    type: 'PDF',
    pages: 3,
    created: '2024-09-28T14:23:00Z',
    modified: '2024-10-15T09:41:00Z',
    author: 'John Doe',
    producer: 'Adobe Acrobat 23.1',
    creatorTool: 'Microsoft Word 2021',
    authenticityChecks: [
      'Metadata present and complete',
      'Modified after document date',
      'No digital signatures removed',
      'No excessive compression detected',
    ],
  },
  similarDocuments: [
    {
      filename: 'Nigerian_Procurement_Template_2023.pdf',
      similarity: 87,
      type: 'Government Contract',
      status: 'Verified authentic',
      keyDifferences: ['Seal design variant (acceptable)', 'Font size in header (minor)'],
      assessment: 'Structure and layout are highly consistent with a known authentic template.',
    },
    {
      filename: 'Contract_Sample_BPP_2022.pdf',
      similarity: 72,
      type: 'Government Contract',
      status: 'Verified authentic',
      keyDifferences: ['Date format is inconsistent', 'Signature placement differs'],
      assessment: 'Shows some deviations from standard templates, which could warrant further investigation depending on context.',
    },
  ],
};

export const mockRecommendations = {
    recommendations: [
        'Verify signature authenticity with the original signer if possible.',
        'Request an unmodified or original copy of the document from the source.',
        'Cross-check key dates and figures with external records or independent sources.',
        'Consider secondary verification from another trusted party before publication.'
    ]
}

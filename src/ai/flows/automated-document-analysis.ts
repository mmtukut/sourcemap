'use server';

/**
 * @fileOverview An AI agent to automatically analyze uploaded documents, extracting key metadata,
 * detecting visual tampering, and comparing the document to a knowledge base of authentic documents.
 *
 * - automatedDocumentAnalysis - A function that handles the automated document analysis process.
 * - AutomatedDocumentAnalysisInput - The input type for the automatedDocumentAnalysis function.
 * - AutomatedDocumentAnalysisOutput - The return type for the automatedDocumentAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomatedDocumentAnalysisInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      'The document to be analyzed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // prettier-ignore
    ),
});
export type AutomatedDocumentAnalysisInput = z.infer<typeof AutomatedDocumentAnalysisInputSchema>;

const AutomatedDocumentAnalysisOutputSchema = z.object({
  confidenceScore: z
    .number()
    .describe(
      'A confidence score reflecting the document\'s authenticity (0-100). Low values indicate potential issues.' // prettier-ignore
    ),
  status: z
    .enum(['clear', 'review', 'flag'])
    .describe(
      'The document\'s status based on the confidence score: clear (>=80), review (60-79), flag (<60).' // prettier-ignore
    ),
  keyFindings: z.array(
    z.object({
      type: z.enum(['critical', 'moderate', 'consistent']),
      description: z.string(),
      evidence: z.string().optional(),
    })
  ).describe('Key findings from the document analysis.'),
  metadataAnalysis: z
    .object({
      filename: z.string(),
      size: z.string(),
      type: z.string(),
      pages: z.number().optional(),
      created: z.string().optional(),
      modified: z.string().optional(),
      author: z.string().optional(),
      producer: z.string().optional(),
      creatorTool: z.string().optional(),
      authenticityChecks: z.array(z.string()),
    })
    .describe('Extracted and analyzed document metadata.'),
  similarDocuments: z
    .array(
      z.object({
        filename: z.string(),
        similarity: z.number(),
        type: z.string(),
        status: z.string(),
        keyDifferences: z.array(z.string()),
        assessment: z.string(),
      })
    )
    .describe('Similar documents found in the knowledge base.'),
});
export type AutomatedDocumentAnalysisOutput = z.infer<typeof AutomatedDocumentAnalysisOutputSchema>;

export async function automatedDocumentAnalysis(
  input: AutomatedDocumentAnalysisInput
): Promise<AutomatedDocumentAnalysisOutput> {
  return automatedDocumentAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'automatedDocumentAnalysisPrompt',
  input: {schema: AutomatedDocumentAnalysisInputSchema},
  output: {schema: AutomatedDocumentAnalysisOutputSchema},
  prompt: `You are an AI-powered document analysis tool for investigative journalists.

  Analyze the uploaded document provided as a data URI and provide a confidence score, status, key findings, metadata analysis and similar documents.

  Document: {{media url=documentDataUri}}
  `,
});

const automatedDocumentAnalysisFlow = ai.defineFlow(
  {
    name: 'automatedDocumentAnalysisFlow',
    inputSchema: AutomatedDocumentAnalysisInputSchema,
    outputSchema: AutomatedDocumentAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


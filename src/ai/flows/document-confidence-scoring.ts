'use server';

/**
 * @fileOverview Generates a confidence score for uploaded documents, reflecting the likelihood of its authenticity.
 *
 * - documentConfidenceScoring - A function that handles the document confidence scoring process.
 * - DocumentConfidenceScoringInput - The input type for the documentConfidenceScoring function.
 * - DocumentConfidenceScoringOutput - The return type for the documentConfidenceScoring function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DocumentConfidenceScoringInputSchema = z.object({
  documentText: z
    .string()
    .describe('The extracted text content of the document.'),
  metadata: z.string().describe('The extracted metadata of the document.'),
  visualAnalysis: z
    .string()
    .describe('The analysis of visual aspects of the document.'),
});
export type DocumentConfidenceScoringInput = z.infer<
  typeof DocumentConfidenceScoringInputSchema
>;

const DocumentConfidenceScoringOutputSchema = z.object({
  confidenceScore: z
    .number()
    .describe(
      'A score between 0 and 100 representing the confidence in the document authenticity.'
    ),
  status: z
    .enum(['clear', 'review', 'flag'])
    .describe(
      'The status of the document based on the confidence score. clear: 80-100, review: 60-79, flag: 0-59.'
    ),
  reasoning: z
    .string()
    .describe('The reasoning behind the assigned confidence score.'),
});
export type DocumentConfidenceScoringOutput = z.infer<
  typeof DocumentConfidenceScoringOutputSchema
>;

export async function documentConfidenceScoring(
  input: DocumentConfidenceScoringInput
): Promise<DocumentConfidenceScoringOutput> {
  return documentConfidenceScoringFlow(input);
}

const prompt = ai.definePrompt({
  name: 'documentConfidenceScoringPrompt',
  input: {schema: DocumentConfidenceScoringInputSchema},
  output: {schema: DocumentConfidenceScoringOutputSchema},
  prompt: `You are an AI assistant designed to evaluate the authenticity of documents.

  Based on the provided document text, metadata, and visual analysis, determine a confidence score for the document's authenticity.
  The confidence score should be a number between 0 and 100.
  Also, determine the status of the document based on the confidence score.
  clear: 80-100, review: 60-79, flag: 0-59.
  Provide a reasoning for the assigned confidence score and status.

  Document Text: {{{documentText}}}
  Metadata: {{{metadata}}}
  Visual Analysis: {{{visualAnalysis}}}
  \n\nConfidence Score (0-100):\nStatus (clear, review, flag):\nReasoning:`,
});

const documentConfidenceScoringFlow = ai.defineFlow(
  {
    name: 'documentConfidenceScoringFlow',
    inputSchema: DocumentConfidenceScoringInputSchema,
    outputSchema: DocumentConfidenceScoringOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

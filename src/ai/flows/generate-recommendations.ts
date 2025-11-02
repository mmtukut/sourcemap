'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating recommendations for journalists to verify document authenticity.
 *
 * The flow takes the document analysis output as input and returns a list of recommended next steps.
 *
 * @exports generateRecommendations - The main function to trigger the recommendation generation flow.
 * @exports GenerateRecommendationsInput - The input type for the generateRecommendations function.
 * @exports GenerateRecommendationsOutput - The output type for the generateRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRecommendationsInputSchema = z.object({
  analysisResults: z.string().describe('The analysis results of the document.'),
});
export type GenerateRecommendationsInput = z.infer<
  typeof GenerateRecommendationsInputSchema
>;

const GenerateRecommendationsOutputSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe('A list of recommended next steps to verify the document.'),
});
export type GenerateRecommendationsOutput = z.infer<
  typeof GenerateRecommendationsOutputSchema
>;

export async function generateRecommendations(
  input: GenerateRecommendationsInput
): Promise<GenerateRecommendationsOutput> {
  return generateRecommendationsFlow(input);
}

const recommendationsPrompt = ai.definePrompt({
  name: 'recommendationsPrompt',
  input: {schema: GenerateRecommendationsInputSchema},
  output: {schema: GenerateRecommendationsOutputSchema},
  prompt: `You are an AI assistant that helps journalists verify the authenticity of documents.
  Based on the following analysis results, provide a list of recommendations for next steps the journalist should take to verify the document's authenticity.
  Analysis Results: {{{analysisResults}}}
  Please provide the recommendations as a numbered list.
  `,
});

const generateRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateRecommendationsFlow',
    inputSchema: GenerateRecommendationsInputSchema,
    outputSchema: GenerateRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await recommendationsPrompt(input);
    return output!;
  }
);

import { config } from 'dotenv';
config();

import '@/ai/flows/generate-recommendations.ts';
import '@/ai/flows/document-confidence-scoring.ts';
import '@/ai/flows/automated-document-analysis.ts';
// This type definition is kept for type-sharing purposes, but the hook and provider are removed.
export type Analysis = {
  id: string;
  name: string;
  status: 'clear' | 'review' | 'flag' | 'processing' | 'pending' | 'failed';
  score: number | null;
  date: string;
};

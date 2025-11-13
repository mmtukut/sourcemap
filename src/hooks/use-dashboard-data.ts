
'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@/firebase';
import { API_BASE_URL } from '@/lib/api';
import { useToast } from './use-toast';

export type Analysis = {
  id: string;
  name: string;
  status: 'clear' | 'review' | 'flag' | 'processing' | 'pending' | 'failed';
  score: number | null;
  date: string;
};

interface DashboardContextType {
  analyses: Analysis[];
  isLoading: boolean;
  error: string | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardDataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }

    const fetchAnalyses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/documents/?user_email=${encodeURIComponent(user.email!)}`);
        if (!res.ok) {
           const errorMessage = `Could not load dashboard data (Status: ${res.status}). Please ensure the backend is running.`;
           throw new Error(errorMessage);
        }
        const data = await res.json();
        setAnalyses(data);
      } catch (error) {
        const errorMessage = (error as Error).message.includes('fetch') 
          ? "Could not connect to the backend server. Please ensure it's running."
          : (error as Error).message;
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error Loading Dashboard',
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyses();
  }, [user, toast]);

  return (
    <DashboardContext.Provider value={{ analyses, isLoading, error }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardData = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider');
  }
  return context;
};

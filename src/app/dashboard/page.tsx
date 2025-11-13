
'use client';

import { useState, useEffect } from 'react';
import { QuickUpload } from '@/components/dashboard/quick-upload';
import { RecentAnalyses } from '@/components/dashboard/recent-analyses';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';
import type { Analysis } from '@/hooks/use-dashboard-data'; // This type will be moved
import { Loader2 } from 'lucide-react';


export default function DashboardPage() {
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


  const getFirstName = () => {
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    return 'User';
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline tracking-tight">
        Welcome Back, {getFirstName()}
      </h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
            <StatsCards analyses={analyses} isLoading={isLoading} error={error} />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RecentAnalyses analyses={analyses} isLoading={isLoading} error={error} />
              </div>
              <div>
                <QuickUpload />
              </div>
            </div>
        </>
      )}
    </div>
  );
}

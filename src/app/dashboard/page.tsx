
'use client';

import { QuickUpload } from '@/components/dashboard/quick-upload';
import { RecentAnalyses } from '@/components/dashboard/recent-analyses';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { useUser } from '@/firebase';
import { DashboardDataProvider } from '@/hooks/use-dashboard-data';

function DashboardContent() {
  const { user } = useUser();

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
      <StatsCards />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentAnalyses />
        </div>
        <div>
          <QuickUpload />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardDataProvider>
      <DashboardContent />
    </DashboardDataProvider>
  );
}

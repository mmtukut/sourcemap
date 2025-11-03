import { QuickUpload } from '@/components/dashboard/quick-upload';
import { RecentAnalyses } from '@/components/dashboard/recent-analyses';
import { StatsCards } from '@/components/dashboard/stats-cards';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline tracking-tight">
        Welcome Back, John
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

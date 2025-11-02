import { QuickUpload } from '@/components/dashboard/quick-upload';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentAnalyses } from '@/components/dashboard/recent-analyses';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-0 sm:p-0">
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">
            Welcome back, John!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening with your documents today.
          </p>
        </header>

        <QuickUpload />

        <StatsCards />

        <RecentAnalyses />
      </div>
    </div>
  );
}

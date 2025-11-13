
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, FileClock, CircleDollarSign, Loader2 } from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';

type Stat = {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    id: 'analyses' | 'credits' | 'pending';
}

const initialStats: Stat[] = [
  {
    title: 'Analyses This Month',
    value: '...',
    icon: FileCheck,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    id: 'analyses'
  },
  {
    title: 'Remaining Credits',
    value: 'Unlimited',
    icon: CircleDollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    id: 'credits'
  },
  {
    title: 'Documents Pending',
    value: '...',
    icon: FileClock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    id: 'pending'
  },
];

export function StatsCards() {
    const { analyses, isLoading, error } = useDashboardData();

    const stats: Stat[] = initialStats.map(stat => {
        if (isLoading) return stat;
        if (error) {
            if (stat.id === 'analyses' || stat.id === 'pending') {
                return { ...stat, value: 'N/A' };
            }
            return stat;
        }

        if (stat.id === 'analyses') {
            return { ...stat, value: `${analyses.length}` };
        }
        if (stat.id === 'pending') {
            const pendingDocs = analyses.filter(d => d.status === 'pending' || d.status === 'processing').length;
            return { ...stat, value: `${pendingDocs}` };
        }
        return stat;
    });

  return (
    <div>
        <h2 className="text-2xl font-bold font-headline tracking-tight mb-4">Usage Stats</h2>
        {error && <div className="mb-4 text-sm text-destructive p-3 bg-destructive/10 border border-destructive/20 rounded-md">{error}</div>}
        <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
            <Card key={index} className="glass-card hover:shadow-2xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.bgColor}`}>
                    {isLoading && (stat.id === 'analyses' || stat.id === 'pending') ? <Loader2 className="h-5 w-5 animate-spin" /> : <stat.icon className={`h-5 w-5 ${stat.color}`} />}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
            </Card>
        ))}
        </div>
    </div>
  );
}

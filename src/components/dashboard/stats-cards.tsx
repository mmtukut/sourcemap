
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, FileClock, CircleDollarSign, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';

const API_BASE_URL = '/api/v1';

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
    const [stats, setStats] = useState(initialStats);
    const [loading, setLoading] = useState(true);
    const { user }_u = useUser();

    useEffect(() => {
        if (!user?.email) return;
        
        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/documents?user_email=${user.email}`);
                if(res.ok) {
                    const data = await res.json();
                    const analysesThisMonth = data.length; // Simplified for now
                    const pendingDocs = data.filter((d: any) => d.status === 'pending' || d.status === 'processing').length;
                    
                    setStats(prev => prev.map(s => {
                        if (s.id === 'analyses') return {...s, value: `${analysesThisMonth}`};
                        if (s.id === 'pending') return {...s, value: `${pendingDocs}`};
                        return s;
                    }));
                } else {
                     throw new Error('Failed to fetch stats');
                }
            } catch (error) {
                console.error("Failed to fetch usage stats", error);
                 setStats(prev => prev.map(s => (s.id === 'analyses' || s.id === 'pending') ? {...s, value: `N/A`} : s));
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user]);

  return (
    <div>
        <h2 className="text-2xl font-bold font-headline tracking-tight mb-4">Usage Stats</h2>
        <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
            <Card key={index} className="glass-card hover:shadow-2xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.bgColor}`}>
                    {loading && (stat.id === 'analyses' || stat.id === 'pending') ? <Loader2 className="h-5 w-5 animate-spin" /> : <stat.icon className={`h-5 w-5 ${stat.color}`} />}
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

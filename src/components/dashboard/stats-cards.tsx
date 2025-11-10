
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, FileClock, CircleDollarSign, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';

const API_BASE_URL = '/api/v1';

const initialStats = [
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
    value: '₦15,000',
    icon: CircleDollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    id: 'credits'
  },
  {
    title: 'Documents Pending',
    value: '8',
    icon: FileClock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    id: 'pending'
  },
];

export function StatsCards() {
    const [stats, setStats] = useState(initialStats);
    const [loading, setLoading] = useState(true);
    const { user } = useUser();

    useEffect(() => {
        if (!user) return;
        
        const fetchUsage = async () => {
            try {
                // Pass user ID for tracking as per backend plan
                const res = await fetch(`${API_BASE_URL}/users/me/usage?user_id=${user.uid}`);
                if(res.ok) {
                    const data = await res.json();
                    setStats(prev => prev.map(s => s.id === 'analyses' ? {...s, value: `${data.usage_count || 0} / 25`} : s));
                }
            } catch (error) {
                console.error("Failed to fetch usage stats", error);
                 setStats(prev => prev.map(s => s.id === 'analyses' ? {...s, value: `N/A`} : s));
            } finally {
                setLoading(false);
            }
        };
        fetchUsage();
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
                    {loading && stat.id === 'analyses' ? <Loader2 className="h-5 w-5 animate-spin" /> : <stat.icon className={`h-5 w-5 ${stat.color}`} />}
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

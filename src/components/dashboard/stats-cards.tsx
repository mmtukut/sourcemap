import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, FileClock, CircleDollarSign } from 'lucide-react';

const stats = [
  {
    title: 'Analyses This Month',
    value: '12 / 25',
    icon: FileCheck,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Remaining Credits',
    value: '₦15,000',
    icon: CircleDollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'Documents Pending',
    value: '8',
    icon: FileClock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
];

export function StatsCards() {
  return (
    <div>
        <h2 className="text-2xl font-bold font-headline tracking-tight mb-4">Usage Stats</h2>
        <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
            <Card key={index} className="glass-card hover:shadow-2xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, FileClock, CircleDollarSign } from 'lucide-react';

const stats = [
  {
    title: 'Analyses This Month',
    value: '12 / 25',
    icon: FileCheck,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  {
    title: 'Remaining Credits',
    value: '₦15,000',
    icon: CircleDollarSign,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  {
    title: 'Documents Pending',
    value: '8',
    icon: FileClock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
];

export function StatsCards() {
  return (
    <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Usage Stats</h2>
        <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
            <Card key={index} className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
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

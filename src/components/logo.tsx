import { cn } from '@/lib/utils';
import type { SVGProps } from 'react';

const Icon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 18V5l2-2 2 2v13" />
    <path d="M15 18h-1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1" />
    <path d="M3 18h1" />
    <path d="M20 18h1" />
    <path d="M5 12h1" />
    <path d="M18 12h1" />
    <path d="M5 6h1" />
    <path d="M18 6h1" />
  </svg>
);

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-foreground font-semibold',
        className
      )}
    >
      <Icon className="h-6 w-6 text-primary" />
      <span className="text-lg">SourceMap</span>
    </div>
  );
}
